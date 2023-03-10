/*
 * MIT License
 *
 * Copyright (c) 2016-present, CriticalBlue Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
 * OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

#import "ApproovRCTInterceptor.h"
#import "ApproovMockURLProtocol.h"
#import "ApproovUtils.h"
#import "ApproovPinningDelegate.h"
#import "RSSwizzle.h"

// remember the current NSURLSessions that are being processed
@implementation ApproovRCTInterceptor {
    // any current ReactNative session
    NSURLSession *_RNSession;

    // any current RNFetchBlob session
    NSURLSession *_BlobSession;
}

// the single shared intercetor for React Native
static ApproovRCTInterceptor *_sharedInterceptor = nil;

// ensure the singleton is only created once
static dispatch_once_t _onceToken = 0;

/**
 * Creates a ReactNative interceptor.
 *
 * @param approovService the ApproovService used to update requests
 */
+ (instancetype) startWithApproovService:(ApproovService *)approovService {
    dispatch_once(&_onceToken, ^{
        _sharedInterceptor = [[self alloc] initWithApproovService:approovService];
    });
    return _sharedInterceptor;
}

/**
 * Initializes the ReactNative interceptor.
 *
 * @param approovService the ApproovService used to update requests
 */
- (instancetype)initWithApproovService:(ApproovService *)approovService {
    // initialize the adapter
    self = [super init];
    if (!self) {
        return self;
    }
    _approovService = approovService;
    _RNSession = nil;
    _BlobSession = nil;

    // swizzle react native session creation methods
    [self swizzleRCTSessionCreation];

    // swizzle react native session data task creation methods
    [self swizzleRCTSessionDataTasks];
    return self;
}

/**
 * Swizzles the NSURLSession creation method that is used by the React Native
 * or rn-fetch-blob networking stacks. This allows us to intercept the creation
 * of this and ensure that a special pinning delegate can be used that applies the
 * Approov dynamic pins.
 */
- (void)swizzleRCTSessionCreation {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wshadow"
    __block ApproovRCTInterceptor *interceptor = self;
    RSSwizzleClassMethod(NSClassFromString(@"NSURLSession"),
        @selector(sessionWithConfiguration:delegate:delegateQueue:),
        RSSWReturnType(NSURLSession *),
        RSSWArguments(NSURLSessionConfiguration * _Nonnull configuration, id _Nullable delegate, NSOperationQueue * _Nullable queue),
        RSSWReplacement({
            // check if the delegate is part of the React Native or rn-fetch-blob stack
            NSURLSession *session;
            if (delegate != nil) {
                NSString *delegateClassName = NSStringFromClass([delegate class]);
                ApproovLogD(@"checking session creation with %@ delegate", delegateClassName);
                if (([delegateClassName hasPrefix:@"RCT"] || [delegateClassName isEqual:@"RNFetchBlobRequest"]) &&
                    ![delegateClassName isEqual:@"RCTMultipartDataTask"]) {
                    // we have a delegate associated with React Native that we need to handle (note we don't intercept
                    // the RCTMultipartDataTask since this is specifically associated with bundle reload of Javascript and
                    // is not associated with the app's own network requests)
                    ApproovLogI(@"intercepting a session creation with %@ delegate", NSStringFromClass([delegate class]));

                    // add mock https protocol for sending status code and error
                    if (!configuration.protocolClasses || [configuration.protocolClasses count] == 0) {
                        configuration.protocolClasses = @[[ApproovMockURLProtocol class]];
                    } else if (![configuration.protocolClasses containsObject:[ApproovMockURLProtocol class]]) {
                        NSMutableArray *protocolClasses = [configuration.protocolClasses mutableCopy];
                        [protocolClasses insertObject:[ApproovMockURLProtocol class] atIndex:0];
                        configuration.protocolClasses = protocolClasses;
                    }

                    // call the original method but provide the pjnning delegate instead of the one provided
                    PinningURLSessionDelegate *pinningDelegate = [PinningURLSessionDelegate createWithDelegate:delegate approovService:interceptor.approovService];
                    session = RSSWCallOriginal(configuration, pinningDelegate, queue);

                    // remember this particular NSURLSession since it is one we should add Approov to. We only remember one for
                    // React Native at a time but this is okay given its session creation process. For rn-fetch-blob a new session
                    // is created for each request, so there is a very small chance of a race at this point but this would only
                    // result in a missing Approov token rather than a pinning vulnerability.
                    if ([delegateClassName hasPrefix:@"RCT"])
                        interceptor->_RNSession = session;
                    else
                        interceptor->_BlobSession = session;

                    // provide the created session
                    return session;
                }
            }

            // if we don't want to intercept the session then we just call the original method unmodified
            return RSSWCallOriginal(configuration, delegate, queue);
        })
    );
#pragma clang diagnostic pop
}

/**
 * Swizzles the NSURLSessionDataTask creation method that is used by the React Native
 * or rn-fetch-blob networking stacks. This allows us to intercept the creation of the networking requests
 * and thus to include Approov tokens in the request, or substitute headers or query
 * parameters. We only do this for requests using the known pinned session.
 */
- (void)swizzleRCTSessionDataTasks {
    __block ApproovRCTInterceptor *interceptor = self;
    RSSwizzleInstanceMethod(NSClassFromString(@"NSURLSession"),
        @selector(dataTaskWithRequest:),
        RSSWReturnType(NSURLSessionDataTask *),
        RSSWArguments(NSURLRequest * _Nonnull request),
        RSSWReplacement({
            // check if the data task creation is for a current session that we have pinned
            if ((self == interceptor->_RNSession) || (self == interceptor->_BlobSession)) {
                // update the request to include Appproov dealing with any failures - note that this
                // part may block for the duration of the time it takes to fetch an Approov token but
                // experiments indicate that this does not impact the behaviour of the React Native
                // Javascript execution
                ApproovLogD(@"intercepting data task %@ %@", request.HTTPMethod, request.URL);
                ApproovInterceptorResult *result = [interceptor.approovService interceptRequest:request];
                switch ([result action]) {
                    case ApproovInterceptorActionProceed: {
                        // proceed with the task using the updated request
                        return RSSWCallOriginal(result.request);
                    }
                    case ApproovInterceptorActionRetry: {
                        // return a task with 5xx error code suggesting retry
                        return [ApproovMockURLProtocol createMockTaskForSession:self withStatusCode:503 withMessage:[result message]];
                    }
                    default: {
                        // return a task which fails indicating a more permanent issue
                        return [ApproovMockURLProtocol createMockTaskForSession:self withErrorCode:499 withMessage:[result message]];
                    }
                }
            } else {
                // if the data task creation is for a different (unpinned) session then we don't add Approov
                return RSSWCallOriginal(request);
            }
        }),
    0, NULL);
}

@end
