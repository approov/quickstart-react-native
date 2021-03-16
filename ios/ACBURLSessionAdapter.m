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

#import "ACBURLSessionAdapter.h"
#import "ACBMockURLProtocol.h"
#import "ACBUtils.h"
#import "RSSwizzle.h"

@interface ACBURLSessionDataDelegate ()

@property ACBURLSessionAdapter *adapter;

@property id<NSURLSessionDataDelegate> originalDelegate;

@end

@implementation ACBURLSessionDataDelegate

+ (instancetype)createWithDelegate:(id<NSURLSessionDataDelegate>)delegate forAdapter:(ACBURLSessionAdapter *)adapter {
    return [[self alloc] initWithDelegate:delegate forAdapter:adapter];
}

- (instancetype)initWithDelegate:(id<NSURLSessionDataDelegate>)delegate forAdapter:(ACBURLSessionAdapter *)adapter {
    self = [super init];
    if (self) {
        ACBLogD(@"Initializing URL adapter session data delegate");
        _adapter = adapter;
        _originalDelegate = delegate;
    }
    ACBLogD(@"Adapting NSURLSessionDelegate: %@", NSStringFromClass([delegate class]));
    return self;
}

// These two reflection functions are quite handy. They appear to work as advertised as long as you only
// implement the auth challenges. Implement any one of the task or data delegate functions and they are all
// presumed to be implemented or nil which isn't very helpful. So for now, they are commented out, and
// every delegate function in RCTHTTPRequestHandler is wrapped here. Unfortunate, but YMMV.

//// Decides if delegate wants to handle this method.
//- (BOOL)respondsToSelector:(SEL)sel {
//    // handle auth challenges
//    if (sel == @selector(URLSession:didReceiveChallenge:completionHandler:) ||
//            sel == @selector(URLSession:task:didReceiveChallenge:completionHandler:)) {
//        ACBLogD(@"Will handle authentication challenge: %@", NSStringFromSelector(sel));
//        return YES;
//    }
//
//    // handle (by forwarding) selectors to original delegate if needed
//    BOOL canForward = [_originalDelegate respondsToSelector:sel];
//    if (canForward) {
//        ACBLogD(@"Can handle selector: %@", NSStringFromSelector(sel));
//    } else {
//        ACBLogD(@"Can handle: %@", NSStringFromSelector(sel));
//    }
//    return canForward;
//}
//
//// If delegate wanted to handle this selector but can't, forward it to original delegate
//- (id)forwardingTargetForSelector:(SEL)sel {
//    if ([_originalDelegate respondsToSelector:sel]) {
//        ACBLogD(@"Forwarding to original delegate selector: %@", NSStringFromSelector(sel));
//        return _originalDelegate;
//    }
//
//    return nil;
//}

// handles session authentication challenge
- (void)URLSession:(NSURLSession *)session
        didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge
        completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition disposition, NSURLCredential *credential))completionHandler {
    ACBLogD(@"Session received authentication challenge");
    
    if ([challenge.protectionSpace.authenticationMethod isEqualToString:NSURLAuthenticationMethodServerTrust]) {
        ACBTrustDecision trustDecision = [_adapter.approov verifyServerTrust:challenge.protectionSpace.serverTrust forHost:challenge.protectionSpace.host];
        if (trustDecision == ACBTrustDecisionBlock) {
            // failed pinning check
            completionHandler(NSURLSessionAuthChallengeCancelAuthenticationChallenge, NULL);
        } else {
            // pinning check result was accept, not pinned, or not a server trust challenge
            completionHandler(NSURLSessionAuthChallengePerformDefaultHandling, NULL);
        }
    }
}

// handles session task authentication challenge
- (void)URLSession:(NSURLSession *)session
        dataTask:(NSURLSessionDataTask *)dataTask
        didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge
        completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition disposition, NSURLCredential *credential))completionHandler {
    ACBLogD(@"Session task received authentication challenge");

    if ([challenge.protectionSpace.authenticationMethod isEqualToString:NSURLAuthenticationMethodServerTrust]) {
        ACBTrustDecision trustDecision = [_adapter.approov verifyServerTrust:challenge.protectionSpace.serverTrust forHost:challenge.protectionSpace.host];
        if (trustDecision == ACBTrustDecisionBlock) {
            // failed pinning check
            completionHandler(NSURLSessionAuthChallengeCancelAuthenticationChallenge, NULL);
        } else {
            // pinning check result was accept, not pinned, or not a server trust challenge
            completionHandler(NSURLSessionAuthChallengePerformDefaultHandling, NULL);
        }
    }
}

///// Handled session task body data.
- (void)URLSession:(NSURLSession *)session
              task:(NSURLSessionTask *)task
   didSendBodyData:(int64_t)bytesSent
    totalBytesSent:(int64_t)totalBytesSent
totalBytesExpectedToSend:(int64_t)totalBytesExpectedToSend {
    [_originalDelegate URLSession:session task:task didSendBodyData:bytesSent totalBytesSent:totalBytesSent totalBytesExpectedToSend:totalBytesExpectedToSend];
}

/// Handles session task reedirection.
- (void)URLSession:(NSURLSession *)session
              task:(NSURLSessionTask *)task
willPerformHTTPRedirection:(NSHTTPURLResponse *)response
        newRequest:(NSURLRequest *)request
 completionHandler:(void (^)(NSURLRequest *))completionHandler {
    [_originalDelegate URLSession:session task:task willPerformHTTPRedirection:response newRequest:request completionHandler:completionHandler];
}

/// Handles session data task response.
- (void)URLSession:(NSURLSession *)session
          dataTask:(NSURLSessionDataTask *)dataTask
didReceiveResponse:(NSURLResponse *)response
 completionHandler:(void (^)(NSURLSessionResponseDisposition disposition))completionHandler {
    [_originalDelegate URLSession:session dataTask:dataTask didReceiveResponse:response completionHandler:completionHandler];
}

// Handles session data task data.
- (void)URLSession:(NSURLSession *)session
          dataTask:(NSURLSessionDataTask *)dataTask
    didReceiveData:(NSData *)data {
    [_originalDelegate URLSession:session dataTask:dataTask didReceiveData:data];
}

/// Handles session task completion.
- (void)URLSession:(NSURLSession *)session
        task:(NSURLSessionTask *)task
        didCompleteWithError:(NSError *)error {
    // call original completion delegate
    [_originalDelegate URLSession:session task:task didCompleteWithError:error];
    
    if( error ) {
        ACBLogE(@"Session task completed with error: %@", error.debugDescription);
    } else {
        ACBLogD(@"Session task completed successfully");
    }
}

@end

@implementation ACBURLSessionAdapter {
    NSURLSession *_currentSession;
}

static ACBURLSessionAdapter *_ACBURLSessionAdapter_sharedAdapter = nil;
static dispatch_once_t _ACBURLSessionAdapter_onceToken = 0;

+ (instancetype) startWithApproovService:(ACBApproovService *)service {
    dispatch_once(&_ACBURLSessionAdapter_onceToken, ^{
        _ACBURLSessionAdapter_sharedAdapter = [[self alloc] initWithApproovService:service];
    });
    return _ACBURLSessionAdapter_sharedAdapter;
}

+ (instancetype)sharedAdapter {
    return _ACBURLSessionAdapter_sharedAdapter;
}

- (instancetype)initWithApproovService:(ACBApproovService *)service {
    self = [super init];
    if (!self) {
        ACBLogD(@"URL session adapter failed to initialize");
        return self;
    }

    ACBLogD(@"Initializing URL session adapter");
    
    // save and observe approoov service
    _approov = service;
    [_approov addObserver:self];

    // initialize session list
    _currentSession = nil;

    // swizzle react native session creation methods
    [self swizzleRCTSessions];

    // swizzle react native session data task creation methods
    [self swizzleRCTSessionDataTasks];

    return self;
}

// swizzles react native session creation methods
- (void)swizzleRCTSessions {
    ACBLogD(@"Setting up react native session swizzles");
    
    __block ACBURLSessionAdapter *thisAdapter = self;

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wshadow"
    RSSwizzleClassMethod(NSClassFromString(@"NSURLSession"),
        @selector(sessionWithConfiguration:delegate:delegateQueue:),
        RSSWReturnType(NSURLSession *),
        RSSWArguments(NSURLSessionConfiguration * _Nonnull configuration, id _Nullable delegate, NSOperationQueue * _Nullable queue),
        RSSWReplacement({
            NSURLSession *session;

            // swizzle a react-native looking delegate
            if (delegate && [NSStringFromClass([delegate class]) hasPrefix:@"RCT"]) {

                ACBLogD(@"Adapting a session for %@ delegate", NSStringFromClass([delegate class]));

                // Add mock https protocol for sending  status code and error
                ACBLogX(@"Adding mock protocol to the session configuration");
                if (!configuration.protocolClasses || [configuration.protocolClasses count] == 0) {
                    configuration.protocolClasses = @[[ACBMockURLProtocol class]];
                } else if (![configuration.protocolClasses containsObject:[ACBMockURLProtocol class]]) {
                    NSMutableArray *protocolClasses = [configuration.protocolClasses mutableCopy];
                    [protocolClasses insertObject:[ACBMockURLProtocol class] atIndex:0];
                    configuration.protocolClasses = protocolClasses;
                }

                ACBLogD(@"Adapting the delegate", NSStringFromClass([delegate class]));
                ACBURLSessionDataDelegate *adapterDelegate = [ACBURLSessionDataDelegate createWithDelegate:delegate forAdapter: thisAdapter];

                ACBLogD(@"Creating the session", NSStringFromClass([delegate class]));
                session = RSSWCallOriginal(configuration, adapterDelegate, queue);
                thisAdapter->_currentSession = session;
            } else {
                ACBLogX(@"Creating a normal session");
                session = RSSWCallOriginal(configuration, delegate, queue);
            }

            return session;
        })
    );
#pragma clang diagnostic pop
}

//// swizzles react native session data task creation methods
- (void)swizzleRCTSessionDataTasks {
    ACBLogD(@"Setting up react native session data task swizzles");

    __block ACBURLSessionAdapter *thisAdapter = self;

    RSSwizzleInstanceMethod(NSClassFromString(@"NSURLSession"),
        @selector(dataTaskWithRequest:),
        RSSWReturnType(NSURLSessionDataTask *),
        RSSWArguments(NSURLRequest * _Nonnull request),
        RSSWReplacement({
            ACBLogX(@"Examining data task for session %@", NSStringFromClass([self class]));

            if (thisAdapter->_currentSession && self == thisAdapter->_currentSession) {
                ACBLogD(@"Intercepting this data task for (%@) %@", request.HTTPMethod, request.URL);

                ACBAttestationResult *result = [[thisAdapter approov] attestRequest:request];
                    
                switch ([result action]) {
                    case ACBAttestationActionProceed: {
                        // proceed with task using attested request
                        return RSSWCallOriginal(result.request);
                    }
                    case ACBAttestationActionRetry: {
                        // return a task with 5xx error code suggesting retry
                        return [ACBMockURLProtocol createMockTaskForSession:self withStatusCode:503 withMessage:[result status]];
                    }
                    default: {
                        // return a task which fails indicating a permanent network issue
                        return [ACBMockURLProtocol createMockTaskForSession:self withErrorCode:499 withMessage:[result status]];
                    }
                }
            } else {
                ACBLogD(@"Not intercepting this task");
                return RSSWCallOriginal(request);
            }
        }),
    0, NULL);
}

- (void)ApproovService:(ACBApproovService *)service updatedConfig:(NSString *)config {
    // placehholder if we wish someday to revoke servertrust to force reauthentication
    // on an Approov config change.
}

@end
