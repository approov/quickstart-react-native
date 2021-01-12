
#import "CBApproovURLProtocol.h"

@implementation CBApproovURLProtocol

+ (BOOL)canInitWithRequest:(NSURLRequest *) request {
    if ([request.URL.absoluteString hasPrefix:@"https"]) {
        NSLog(@"%@: can handle request", NSStringFromClass([self class]));
        return YES;
    }
    return NO;
}

+ (NSURLRequest *)canonicalRequestForRequest:(NSURLRequest *) request {
    NSLog(@"%@: canonical request", NSStringFromClass([self class]));
    
    return request;
}

- (void)startLoading {
    NSLog(@"%@: Starting Loading the request: %@", NSStringFromClass([self class]),[[self request] allHTTPHeaderFields]);

    // Fetch and Add Approov Token Here...
    NSMutableURLRequest *interceptorRequest = [[self request] mutableCopy];
    [interceptorRequest addValue:@"APPROOV_TOKEN" forHTTPHeaderField:@"Approov-Token"];
}

- (void)stopLoading {
    [[self connection] cancel];
}

- (void)connection:(NSURLConnection *)connection didFailWithError:(NSError *)error {
    NSLog(@"%@: Failed With error: %@", NSStringFromClass([self class]), error.debugDescription);
    
    [[self client] URLProtocol:self didFailWithError:error];
}

- (NSURLRequest *)connection:(NSURLConnection *)connection willSendRequest:(NSURLRequest *)request redirectResponse:(NSURLResponse *)response {
    NSLog(@"%@: Will send request: %@ ", NSStringFromClass([self class]), [request allHTTPHeaderFields]);

    return request;
}

- (void)connection:(NSURLConnection *)connection didReceiveResponse:(NSURLResponse *)response {
    NSLog(@"%@: Received response code: %ld", NSStringFromClass([self class]), (long)[((NSHTTPURLResponse *) response) statusCode]);
    
    [[self client] URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];
}

- (void)connection:(NSURLConnection *)connection didReceiveData:(NSData *)data {
    NSLog(@"%@: Received data\n%@", NSStringFromClass([self class]), [NSJSONSerialization JSONObjectWithData:data options:0 error:nil]);

    [[self client] URLProtocol:self didLoadData:data];
}

- (void)connectionDidFinishLoading:(NSURLConnection *)connection {
    NSLog(@"%@: Finish loading", NSStringFromClass([self class]));

    [[self client] URLProtocolDidFinishLoading:self];
}

@end
