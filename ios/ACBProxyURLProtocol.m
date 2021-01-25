#import "ACBProxyURLProtocol.h"
#import "ACBProxyURLService.h"
#import "ACBUtils.h"

@interface ACBProxyURLProtocol ()

@property NSURLSessionDataTask *proxyTask;

@end

@implementation ACBProxyURLProtocol

+ (BOOL)canInitWithRequest:(NSURLRequest *) request {
    ACBLogD(@"Proxy URL protocol checking if request can be handled");

    // pass is this is not an https scheme
    if (![request.URL.scheme isEqualToString:@"https"]) {
        return NO;
    }

    // pass if this request has already been intercepted
    if ([NSURLProtocol propertyForKey: @"proxied" inRequest:request] ) {
        ACBLogD(@"Proxy URL protocol already handling request");
        return NO;
    }

    ACBLogD(@"Proxy URL protocol will handle the request");
    return YES;
 }

+ (NSURLRequest *)canonicalRequestForRequest:(NSURLRequest * _Nonnull) request {
    ACBLogD(@"Proxy URL protocol canonicalizing request");
    
    NSMutableURLRequest * _Nonnull mutableRequest = [request mutableCopy];

    // mark request as being handled
    [NSURLProtocol setProperty:@YES forKey:@"proxied" inRequest:mutableRequest];

    return mutableRequest;
}

- (instancetype)initWithRequest:request cachedResponse:cachedResponse client:client {
    self = [super initWithRequest:request cachedResponse:cachedResponse client:client];
    if (!self) {
        ACBLogE(@"Proxy URL protocol failed to initialize with request");
        return nil;
    }

    ACBLogX(@"Proxy URL protocol initializing for client %@", client);

    ACBLogD(@"Proxy URL protocol initialized with request");
    
    return self;
}

- (void)startLoading {
    ACBLogD(@"Proxy URL protocol starting load");

    // copy request
    NSMutableURLRequest *proxyRequest = [[self request] mutableCopy];

    // attest the request
    ACBLogD(@"Proxy URL protocol attesting the request");
    ACBApproovService *approov = [[ACBProxyURLService sharedService] approov];
    ACBAttestationResult *result = [approov attestRequest:proxyRequest];

    // proxy the task
    ACBProxyURLService *proxyService = [ACBProxyURLService sharedService];
    NSURLSession *proxySession = [proxyService session];
    _proxyTask = [proxySession dataTaskWithRequest:proxyRequest];
    [proxyService setProtocol:self forTask:_proxyTask];
    ACBLogD(@"Proxy URL protocol starting task");
    [_proxyTask resume];
}

- (void)stopLoading {
    ACBLogD(@"Proxy URL protocol stopping load");
    
    // remove the proxy
    ACBProxyURLService *proxyService = [ACBProxyURLService sharedService];
    [proxyService removeProtocolForTask:_proxyTask];
}

@end
