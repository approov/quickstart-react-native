#import "ACBURLSessionAdapter.h"
#import "ACBUtils.h"
#import "RSSwizzle.h"

@interface ACBURLSessionDelegate ()

@property ACBURLSessionAdapter *adapter;

@property id<NSURLSessionDelegate> originalDelegate;

@end

@implementation ACBURLSessionDelegate

+ (instancetype)createWithDelegate:(id<NSURLSessionDelegate>)delegate forAdapter:(ACBURLSessionAdapter *)adapter {
    return [[self alloc] initWithDelegate:delegate forAdapter:adapter];
}

- (instancetype)initWithDelegate:(id<NSURLSessionDelegate>)delegate forAdapter:(ACBURLSessionAdapter *)adapter {
    self = [super init];
    if (self) {
        ACBLogD(@"Initializing URL adapter session data delegate");
        _adapter = adapter;
        _originalDelegate = delegate;
    }
    ACBLogD(@"Adapting NSURLSessionDelegate: %@", NSStringFromClass([delegate class]));
    return self;
}

// Decides if delegate wants to handle this method.
- (BOOL)respondsToSelector:(SEL)sel {
    // handle auth challenges
    if (sel == @selector(URLSession:didReceiveChallenge:completionHandler:) ||
            sel == @selector(URLSession:task:didReceiveChallenge:completionHandler:)) {
        ACBLogX(@"Will handle authentication challenge: %@", NSStringFromSelector(sel));
        return YES;
    }

    // handle (by forwarding) selectors to original delegate if needed
    return [_originalDelegate respondsToSelector:sel];
}

// If delegate wanted to handle this selector but can't, forward it to original delegate
- (id)forwardingTargetForSelector:(SEL)sel {
    ACBLogX(@"Forwarding to original delegate selector: %@", NSStringFromSelector(sel));
    return _originalDelegate;
}

// handles session authenticatioon challenge
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

// handles session task authenticatioon challenge
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




///// Handles session task completion.
//- (void)URLSession:(NSURLSession *)session
//        task:(NSURLSessionTask *)task
//        didCompleteWithError:(NSError *)error {
//
//    if( error ) {
//        ACBLogD(@"Proxy session task completed with error: %@", error.debugDescription);
//    } else {
//        ACBLogD(@"Proxy session task completed successfully");
//    }
//
//
//}

/// Handles session invalidation.
- (void)URLSession:(NSURLSession *)session didBecomeInvalidWithError:(NSError *)error {
    ACBLogD(@"Proxy session became invalid with error: %@", error);
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
    
    // save approoov service
    _approov = service;

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
                ACBLogD(@"Creating a session adapter for %@ delegate", NSStringFromClass([delegate class]));
                ACBURLSessionDelegate *adapterDelegate = [ACBURLSessionDelegate createWithDelegate:delegate forAdapter: thisAdapter];
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
                        NSURLSessionDataTask *task = RSSWCallOriginal(result.request);
                        return task;
                    }
                    case ACBAttestationActionRetry: {
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
            } else {
                ACBLogD(@"Not intercepting this task");
                return RSSWCallOriginal(request);
            }
        }),
    0, NULL);
}

- (void)ApproovService:(ACBApproovService *)service updatedConfig:(NSString *)config {
    // finish in flight tasks and invalidate open sesssions
    
    // @TODO: invalidate session from session list forcing connection reauth for future tasks
}

@end
