#import "ACBMockURLProtocol.h"
#import "ACBUtils.h"

@interface ACBMockURLProtocol ()

@property NSURLSessionDataTask *proxyTask;

@end

@implementation ACBMockURLProtocol

+ (NSURLSessionDataTask *)createMockTaskForSession:(NSURLSession *)session withStatusCode:(NSInteger)code withMessage:(NSString *)msg {
    NSString *urlString = [NSString stringWithFormat:@"mockhttps://example.com/status?code=%ld&msg=%@", code, [msg urlencode]];
    NSURL *url = [NSURL URLWithString:urlString];
    ACBLogD(@"URL: %@ : %@", url, urlString);
    return [session dataTaskWithURL:url];
}

+ (NSURLSessionDataTask *)createMockTaskForSession:(NSURLSession *)session withErrorCode:(NSInteger)code withMessage:(NSString *)msg {
    NSString *urlString = [NSString stringWithFormat:@"mockhttps://example.com/error?code=%ld&msg=%@", code, [msg urlencode]];
    NSURL *url = [NSURL URLWithString:urlString];
    ACBLogD(@"URL: %@ : %@", url, urlString);
    return [session dataTaskWithURL:url];
}

+ (BOOL)canInitWithRequest:(NSURLRequest *) request {
    ACBLogD(@"Mock URL protocol checking if request can be handled");

    ACBLogD(@"url: %@", request.URL);
    ACBLogD(@"scheme: %@", request.URL.scheme);

    // pass is this is not a mock https scheme
    if (![request.URL.scheme isEqualToString:@"mockhttps"]) {
        ACBLogD(@"not handling scheme: %@", request.URL.scheme);
       return NO;
    }

    // pass if this request has already been intercepted
    if ([NSURLProtocol propertyForKey: @"mocked" inRequest:request] ) {
        ACBLogD(@"Mock URL protocol already handling request");
        return NO;
    }

    ACBLogD(@"Mock URL protocol will handle the request");
    return YES;
 }

+ (NSURLRequest *)canonicalRequestForRequest:(NSURLRequest * _Nonnull) request {
    ACBLogD(@"Mock URL protocol canonicalizing request");
    
    NSMutableURLRequest * _Nonnull mutableRequest = [request mutableCopy];

    // mark request as being handled
    [NSURLProtocol setProperty:@YES forKey:@"mocked" inRequest:mutableRequest];

    return mutableRequest;
}

- (instancetype)initWithRequest:request cachedResponse:cachedResponse client:client {
    self = [super initWithRequest:request cachedResponse:cachedResponse client:client];
    if (!self) {
        ACBLogE(@"Mock URL protocol failed to initialize with request");
        return nil;
    }

    ACBLogD(@"Mock URL protocol initialized with request");
    
    return self;
}

- (void)startLoading {
    ACBLogD(@"Mock URL protocol starting load");

    NSURL *url = self.request.URL;

    // identify response type
    NSString *type = url.path;

    // parse the query strings
    NSMutableDictionary *queryStrings = [[NSMutableDictionary alloc] init];
    for (NSString *qs in [url.query componentsSeparatedByString:@"&"]) {
        // Get the parameter name
        NSString *key = [[qs componentsSeparatedByString:@"="] objectAtIndex:0];
        // Get the parameter value
        NSString *value = [[qs componentsSeparatedByString:@"="] objectAtIndex:1];
        value = [value stringByReplacingOccurrencesOfString:@"+" withString:@" "];
        value = [value stringByRemovingPercentEncoding];
        queryStrings[key] = value;
    }
    
    // extract code & msg values
    NSInteger code = [queryStrings[@"code"] intValue];
    NSString *msg = queryStrings[@"msg"];
    
    id<NSURLProtocolClient> client = [self client];
    if ([type isEqualToString:@"/status"]) {
        // send a mock status code response
        NSURLResponse * response = [[NSHTTPURLResponse alloc] initWithURL:url statusCode:code HTTPVersion:@"HTTP/1.1" headerFields:@{}];
        [client URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];
        [client URLProtocolDidFinishLoading:self];
    } else {
        // else send error
        NSError *error = ACBError(code, msg);
        [client URLProtocol:self didFailWithError:error];
    }
}

- (void)stopLoading {
    ACBLogD(@"Mock URL protocol stopping load");
}

@end
