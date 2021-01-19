#import "CBApproovSessionManager.h"
#import "CBApproovService.h"
#import "CBUtils.h"
#import "RSSwizzle.h"

@interface CBApproovSessionDelegate ()

@property (class) CBApproovService *service;

@property (nonatomic) id<NSURLSessionDelegate> originalDelegate;

@end

@implementation CBApproovSessionDelegate

static CBApproovService *_service = nil;

+ (void)setService:(CBApproovService *)service {
    _service = service;
}

+ (CBApproovService *)service {
    return _service;
}

+ (instancetype)createWithDelegate:(id<NSURLSessionDelegate>)delegate {
    return [[self alloc] initWithDelegate:delegate];
}

- (instancetype)initWithDelegate:(id<NSURLSessionDelegate>)delegate withService:(CBApproovService *)service {
    self = [super init];
    if (self) {
        CBLogD(@"Initializing proxy session data delegate");
        _originalDelegate = delegate;
    }
    CBLogD(@"Proxying NSURLSessionDelegate: %@", NSStringFromClass([delegate class]));
    return self;
}

- (BOOL)respondsToSelector:(SEL)aSelector {
    if (aSelector == @selector(URLSession:didReceiveChallenge:completionHandler:)) return YES;
 
    return [_originalDelegate respondsToSelector:aSelector];
}

- (id)forwardingTargetForSelector:(SEL)sel {
    return _originalDelegate;
}

/// Handles session authentication.
- (void)URLSession:(NSURLSession *)session
        didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge
        completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition disposition, NSURLCredential *credential))completionHandler {
    CBLogD(@"Proxy received session authentication challenge");

    // successs for now
    // @TODO: slot in the verifier
    completionHandler(NSURLSessionAuthChallengeUseCredential, [NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust]);
}

///// Handles session task authentication.
//- (void)URLSession:(NSURLSession *)session
//        task:(NSURLSessionTask * _Nonnull)task
//        didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge
//        completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition disposition, NSURLCredential *credential))completionHandler {
//    CBLogD(@"Proxy received session task authentication challenge");
//
//    // successs for now
//    completionHandler(NSURLSessionAuthChallengeUseCredential, [NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust]);
//}
//
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
//
///// Handles session invalidation.
//- (void)URLSession:(NSURLSession *)session didBecomeInvalidWithError:(NSError *)error {
//    CBLogD(@"Proxy session became invalid with error: %@", error);
//}

@end

@interface CBApproovSessionManager ()

@property (nonatomic) CBApproovService* service;

@property (nonatomic) id<NSURLSessionDelegate> originalDelegate;

@end

@implementation CBApproovSessionManager

+ (instancetype)createWithService:(CBApproovService *)service {
    return [[self alloc] initWithService:(CBApproovService *)service];
}

- (instancetype)initWithService:(CBApproovService *)service {
    self = [super init];
    if (!self) {
        CBLogD(@"Approov session managerager failed to initialize");
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
                CBLogD(@"Creating a proxied react-native session");
                CBApproovSessionDelegate *proxyDelegate = [CBApproovSessionDelegate createWithDelegate:delegate];
                session = RSSWCallOriginal(configuration, proxyDelegate, queue);
            } else {
                CBLogD(@"Creating an unproxied session");
                session = RSSWCallOriginal(configuration, delegate, queue);
            }
        
        CBLogD(@"Session: %@", session);

            return session;
        })
    );
#pragma clang diagnostic pop
}

// swizzles react native session data task creation methods
- (void)swizzleRCTSessionDataTasks {
    CBLogD(@"Setting up react native session data task delegate swizzles");

    RSSwizzleInstanceMethod(NSClassFromString(@"NSURLSession"),
        @selector(dataTaskWithRequest:),
        RSSWReturnType(NSURLSessionDataTask *),
        RSSWArguments(NSURLRequest * _Nonnull request),
        RSSWReplacement({
            CBLogD(@"Intercepting data task request");

            // intercept request
            CBAttestationResult *result = [[self service] attestRequest:request];

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
//            CBAttestationResult *result = [[self service] attestRequest:request];
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
