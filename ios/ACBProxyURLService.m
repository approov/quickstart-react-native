#import "ACBProxyURLService.h"
#import "ACBProxyURLProtocol.h"
#import "RSSwizzle.h"
#import "ACBUtils.h"

@interface ACBProxyURLService ()

@property ACBApproovProps *props;

@property (copy) NSURLSessionConfiguration *configuration;

@property (readwrite) NSURLSession *session;

@property NSMapTable *protocolMap;

@end

@implementation ACBProxyURLService

static ACBProxyURLService *_ACBProxyURLService_sharedService = nil;
static dispatch_once_t _ACBProxyURLService_onceToken = 0;

+ (instancetype) startWithApproovService:(ACBApproovService *)service withProps:(ACBApproovProps *)props {
    dispatch_once(&_ACBProxyURLService_onceToken, ^{
        _ACBProxyURLService_sharedService = [[self alloc] initWithApproovService:service withProps:props];
    });
    return _ACBProxyURLService_sharedService;
}

+ (instancetype)sharedService {
    return _ACBProxyURLService_sharedService;
}

- (instancetype)initWithApproovService:(ACBApproovService *)service withProps:(ACBApproovProps *)props {
    ACBLogI(@"Proxy URL service initializing");
    self = [super init];
    if (!self) {
        ACBLogE(@"Proxy URL service failed to start");
        [NSException raise:@"ProxyURLServiceInitFailure" format:@"Proxy URL service failed to start"];
    }
    
    // save props
    if (!props) {
        ACBLogE(@"Proxy URL service failed to start: no props specified");
        [NSException raise:@"ProxyURLServiceInitFailure" format:@"Proxy service failed to start: no props specified"];
        return nil;
    }
    _props = props;

    // save Approov service and start watching for config changes
    if (!service) {
        ACBLogE(@"Proxy URL service failed to start: no Approov service specified");
        [NSException raise:@"ProxyURLServiceInitFailure" format:@"Proxy service failed to start: no Approov service specified"];
        return nil;
    }
    _approov = service;
    [_approov addObserver:self];
    
    // swizzle react native session creation methods
    [self swizzleRCTSessions];

    // initialize session
    [self setConfiguration:[NSURLSessionConfiguration defaultSessionConfiguration]];
    [self setSession:nil];
    [self setProtocolMap:[NSMapTable mapTableWithKeyOptions:NSMapTableStrongMemory valueOptions:NSMapTableWeakMemory]];

    ACBLogI(@"Proxy URL service initialized successfully");

    return self;
}

// swizzles react native session creation methods
- (void)swizzleRCTSessions {
    ACBLogD(@"Setting up react native session delegate swizzles");

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
                ACBLogD(@"Creating a proxied session for %@ delegate", NSStringFromClass([delegate class]));
                // register the protocol class
                if (!configuration.protocolClasses || [configuration.protocolClasses count] == 0) {
                    ACBLogX(@"Adding protocol classs to empty list");
                    configuration.protocolClasses = @[[ACBProxyURLProtocol class]];
                } else if (![configuration.protocolClasses containsObject:[ACBProxyURLProtocol class]]) {
                    ACBLogX(@"Adding protocol classs to front of non-empty list count = %ld", [configuration.protocolClasses count]);
                    NSMutableArray *protocolClasses = [configuration.protocolClasses mutableCopy];
                    [protocolClasses insertObject:[ACBProxyURLProtocol class] atIndex:0];
                    configuration.protocolClasses = protocolClasses;
                }
                session = RSSWCallOriginal(configuration, delegate, queue);
            } else {
                ACBLogX(@"Creating an unproxied session");
                session = RSSWCallOriginal(configuration, delegate, queue);
            }

            return session;
        })
    );
#pragma clang diagnostic pop
}

@synthesize session = _session;

- (void)setSession:(NSURLSession *)session {
    if (!session && session) {
        ACBLogD(@"Proxy URL service closing current session");
        [_protocolMap removeAllObjects];
        _protocolMap = nil;
    }
    _session = session;
}

- (NSURLSession *)session {
    if (!_session) {
        ACBLogD(@"Proxy URL service opening new session");
        _session = [NSURLSession sessionWithConfiguration:_configuration delegate:self delegateQueue:[NSOperationQueue currentQueue]];
        _protocolMap = [NSMapTable mapTableWithKeyOptions:NSMapTableStrongMemory valueOptions:NSMapTableWeakMemory];
    }
    
    return _session;
}

- (void)ApproovService:(ACBApproovService *)service updatedConfig:(NSString *)config {
    ACBLogI(@"Proxy URL service notified of Approov config update");

    // invalidate session
    ACBLogI(@"Proxy URL service invalidating current session");
    [[self session] finishTasksAndInvalidate];
    [self setSession:nil];
}

- (void)setProtocol:(NSURLProtocol *)protocol forTask:(NSURLSessionTask *)task {
    [_protocolMap setObject:protocol forKey:task];
}

- (void)removeProtocolForTask:(NSURLSessionTask *)task {
    [_protocolMap removeObjectForKey:task];
}

// proxy delegate - session received auth challenge

- (void)URLSession:(NSURLSession *)session
        didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge
        completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition disposition, NSURLCredential *credential))completionHandler {
    ACBLogD(@"Proxy session received session authentication challenge");
    
    if ([challenge.protectionSpace.authenticationMethod isEqualToString:NSURLAuthenticationMethodServerTrust]) {
        ACBTrustDecision trustDecision = [_approov verifyServerTrust:challenge.protectionSpace.serverTrust forHost:challenge.protectionSpace.host];
        if (trustDecision == ACBTrustDecisionBlock) {
            // failed pinning check
            completionHandler(NSURLSessionAuthChallengeCancelAuthenticationChallenge, NULL);
        } else {
            // pinning check result was accept, not pinned, or not a server trust challenge
            completionHandler(NSURLSessionAuthChallengePerformDefaultHandling, NULL);
        }
    }
}

// proxy delegate - session task received auth challenge

- (void)URLSession:(NSURLSession *)session
        dataTask:(NSURLSessionDataTask *)dataTask
        didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge
        completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition disposition, NSURLCredential *credential))completionHandler {
    ACBLogD(@"Proxy task received session authentication challenge");

    if ([challenge.protectionSpace.authenticationMethod isEqualToString:NSURLAuthenticationMethodServerTrust]) {
        ACBTrustDecision trustDecision = [_approov verifyServerTrust:challenge.protectionSpace.serverTrust forHost:challenge.protectionSpace.host];
        if (trustDecision == ACBTrustDecisionBlock) {
            // failed pinning check
            completionHandler(NSURLSessionAuthChallengeCancelAuthenticationChallenge, NULL);
        } else {
            // pinning check result was accept, not pinned, or not a server trust challenge
            completionHandler(NSURLSessionAuthChallengePerformDefaultHandling, NULL);
        }
    }
}

// proxy delegate - session data task received response

- (void)URLSession:(NSURLSession *)session
        dataTask:(NSURLSessionDataTask *)dataTask
        didReceiveResponse:(NSURLResponse *)response
        completionHandler:(void (^)(NSURLSessionResponseDisposition disposition))completionHandler {
    ACBLogD(@"Proxy task received response code: %ld", (long)[((NSHTTPURLResponse *) response) statusCode]);
    
    NSURLProtocol *protocol = [[self protocolMap] objectForKey:dataTask];
    id<NSURLProtocolClient> client = [protocol client];
    if (!client) {
        ACBLogE(@"Protocol task unable to find client; original request not handled");
    }
    
    [client URLProtocol:protocol didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];

    completionHandler(NSURLSessionResponseAllow);
}

// proxy delegate - session data task received data

- (void)URLSession:(NSURLSession *)session
        dataTask:(NSURLSessionDataTask *)dataTask
        didReceiveData:(NSData *)data {

    if (data) {
        ACBLogD(@"Proxy received data\n%@", [NSJSONSerialization JSONObjectWithData:data options:0 error:nil]);
                
        NSURLProtocol *protocol = [[self protocolMap] objectForKey:dataTask];
        id<NSURLProtocolClient> client = [protocol client];
        if (!client) {
            ACBLogE(@"Protocol task unable to find client; original request not handled");
        }

        [client URLProtocol:protocol didLoadData:data];
    } else {
        ACBLogD(@"Proxy received no data");
    }
}

// proxy delegate - session task completed

- (void)URLSession:(NSURLSession *)session
        task:(NSURLSessionTask *)task
        didCompleteWithError:(NSError *)error {
    ACBLogD(@"Proxy session task completed With error: %@", error.debugDescription);
        
    NSURLProtocol *protocol = [[self protocolMap] objectForKey:task];
    id<NSURLProtocolClient> client = [protocol client];
    if (!client) {
        ACBLogE(@"Protocol task unable to find client; original request not handled");
    }
    
//    NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
//    NSHTTPURLResponse *errResponse = [[NSHTTPURLResponse alloc] initWithURL:httpResponse.URL statusCode:222 HTTPVersion:@"HTTP/1.1" headerFields:httpResponse.allHeaderFields];
//
//    [client URLProtocol:protocol didReceiveResponse:errResponse cacheStoragePolicy:NSURLCacheStorageNotAllowed];
//
//    [client URLProtocol:protocol didFailWithError:nil];

    if (error) {
        [client URLProtocol:protocol didFailWithError:error];
    }

    [client URLProtocolDidFinishLoading:protocol];
}

// proxy delegate - session became invalid
- (void)URLSession:(NSURLSession *)session didBecomeInvalidWithError:(NSError *)error; {
    ACBLogD(@"Proxy session became invalid with error: %@", error);
    
    [self setSession:nil];
}

@end
