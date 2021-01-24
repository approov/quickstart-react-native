#import "CBURLSessionManager.h"
#import "CBApproovService.h"
#import "CBUtils.h"
#import "RSSwizzle.h"

@interface CBURLSessionDelegate ()

@property CBURLSessionManager *manager;

@property CBApproovService *service;

@property id<NSURLSessionDelegate> originalDelegate;

@end

@implementation CBURLSessionDelegate

+ (instancetype)createWithDelegate:(id<NSURLSessionDelegate>)delegate withManager:(CBURLSessionManager *)manager {
    return [[self alloc] initWithDelegate:delegate withManager:manager];
}

- (instancetype)initWithDelegate:(id<NSURLSessionDelegate>)delegate withManager:(CBURLSessionManager *)manager {
    self = [super init];
    if (self) {
        CBLogD(@"Initializing proxy session data delegate");
        _manager = manager;
        _service = [manager service];
        _originalDelegate = delegate;
    }
    CBLogD(@"Proxying NSURLSessionDelegate: %@", NSStringFromClass([delegate class]));
    return self;
}

// Decides if delegate wants to handle this method.
- (BOOL)respondsToSelector:(SEL)sel {
    // handle auth challenges
    if (sel == @selector(URLSession:didReceiveChallenge:completionHandler:) ||
            sel == @selector(URLSession:task:didReceiveChallenge:completionHandler:)) {
        CBLogD(@"Handling authentication selector: %@", NSStringFromSelector(sel));
        return YES;
    }

    // handle (by forwarding) selectors to original delegate if implemented
    return [_originalDelegate respondsToSelector:sel];
}

- (id)forwardingTargetForSelector:(SEL)sel {
    CBLogD(@"Forwarding to original delegate selector: %@", NSStringFromSelector(sel));
    return _originalDelegate;
}

///// Handles session authentication.
- (void)URLSession:(NSURLSession *)session
        didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge
        completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition disposition, NSURLCredential *credential))completionHandler {
    CBLogD(@"Proxy received session authentication challenge");

    // successs for now
    // @TODO: slot in the verifier
    completionHandler(NSURLSessionAuthChallengeUseCredential, [NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust]);
}

/// Handles session task authentication.
- (void)URLSession:(NSURLSession *)session
        task:(NSURLSessionTask * _Nonnull)task
        didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge
        completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition disposition, NSURLCredential *credential))completionHandler {
    CBLogD(@"Proxy received session task authentication challenge");

    // successs for now
    completionHandler(NSURLSessionAuthChallengeUseCredential, [NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust]);
}

///// Handles session task completion.
//- (void)URLSession:(NSURLSession *)session
//        task:(NSURLSessionTask *)task
//        didCompleteWithError:(NSError *)error {
//
//    if( error ) {
//        CBLogD(@"Proxy session task completed with error: %@", error.debugDescription);
//    } else {
//        CBLogD(@"Proxy session task completed successfully");
//    }
//}

/// Handles session invalidation.
- (void)URLSession:(NSURLSession *)session didBecomeInvalidWithError:(NSError *)error {
    CBLogD(@"Proxy session became invalid with error: %@", error);
}

@end

@interface CBURLSessionManager ()

// @TODO: add session tracking

@end

@implementation CBURLSessionManager

+ (instancetype)createWithService:(CBApproovService *)service {
    return [[self alloc] initWithService:(CBApproovService *)service];
}

- (instancetype)initWithService:(CBApproovService *)service {
    self = [super init];
    if (!self) {
        CBLogD(@"Approov session manager failed to initialize");
        return self;
    }

    CBLogD(@"Initializing proxy session manager");
    
    // save approoov service
    _service = service;

    // initialize session list
    // @TODO: add in session invalidation

    // swizzle react native session creation methods
    [self swizzleRCTSessions];

    // swizzle react native session data task creation methods
    [self swizzleRCTSessionDataTasks];

    return self;
}

// swizzles react native session creation methods
- (void)swizzleRCTSessions {
    CBLogD(@"Setting up react native session delegate swizzles");
    
    // save this self because self inside swizzle blocks refers to swizzled class
    __weak CBURLSessionManager *thisManager = self;

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
                CBLogD(@"Creating a proxied session for %@ delegate", NSStringFromClass([delegate class]));
                CBURLSessionDelegate *proxyDelegate = [CBURLSessionDelegate createWithDelegate:delegate withManager: thisManager];
                session = RSSWCallOriginal(configuration, proxyDelegate, queue);
            } else {
                CBLogX(@"Creating an unproxied session");
                session = RSSWCallOriginal(configuration, delegate, queue);
            }

            return session;
        })
    );
#pragma clang diagnostic pop
}

// swizzles react native session data task creation methods
- (void)swizzleRCTSessionDataTasks {
    CBLogD(@"Setting up react native session data task delegate swizzles");
    
    // save this self because self inside swizzle blocks refers to swizzled class
    __weak CBURLSessionManager *thisManager = self;

    RSSwizzleInstanceMethod(NSClassFromString(@"NSURLSession"),
        @selector(dataTaskWithRequest:),
        RSSWReturnType(NSURLSessionDataTask *),
        RSSWArguments(NSURLRequest * _Nonnull request),
        RSSWReplacement({
        CBLogD(@"Intercepting data task request for session %@", @"whatever");

            // intercept request
            CBAttestationResult *result = [[thisManager service] attestRequest:request];

            switch ([result action]) {
                case CBAttestationActionProceed: {
                    NSURLSessionDataTask *task = RSSWCallOriginal(result.request);
                    return task;
                }
                case CBAttestationActionRetry: {
                    NSURLSessionDataTask *task = RSSWCallOriginal(result.request);
                    // TODO: replace with a task returning retry status code
                    return task;
                }
                default: {
                    NSURLSessionDataTask *task = RSSWCallOriginal(result.request);
                    // TODO: replace with a task returning fail status code
                    return task;
                }
            }
        }),
    0, NULL);

//    RSSwizzleInstanceMethod(NSClassFromString(@"NSURLSession"),
//        @selector(dataTaskWithRequest:completionHandler:),
//        RSSWReturnType(NSURLSessionDataTask *),
//        RSSWArguments(NSURLRequest * _Nonnull request, void (^completionHandler)(NSData *data, NSURLResponse *response, NSError *error)),
//        RSSWReplacement({
//            CBLogD(@"Intercepting data task request (with completion)");
//
//            // intercept request
//            CBAttestationResult *result = [[thisManager service] attestRequest:request];
//
//            switch ([result action]) {
//                case CBAttestationActionProceed: {
//                    NSURLSessionDataTask *task = RSSWCallOriginal(result.request, completionHandler);
//                    return task;
//                }
//                case CBAttestationActionRetry: {
//                    NSURLSessionDataTask *task = RSSWCallOriginal(result.request, completionHandler);
//                    // TODO: replace with a task returning retry status code
//                    return task;
//                }
//                default: {
//                    NSURLSessionDataTask *task = RSSWCallOriginal(result.request, completionHandler);
//                    // TODO: replace with a task returning fail status code
//                    return task;
//                }
//            }
//        }),
//    0, NULL);
}

- (void)ApproovService:(CBApproovService *)service updatedConfig:(NSString *)config {
    // finish in flight tasks and invalidate open sesssions
    
    // @TODO: invalidate session from session list forcing connection reauth for future tasks
}

@end
