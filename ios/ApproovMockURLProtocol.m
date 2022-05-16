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

#import "ApproovMockURLProtocol.h"
#import "ApproovUtils.h"

/// A mock https protocol for returning status codes and errors to the user if the
/// Approov fetching fails
@implementation ApproovMockURLProtocol

/**
 * Starts a data task which returns a custom status code.
 *
 * @param session the session starting the task
 * @param code the status code
 * @param msg a descriptive message
 * @return NSURLSessionDataTask that mocks the request
 */
+ (NSURLSessionDataTask *)createMockTaskForSession:(NSURLSession *)session withStatusCode:(NSInteger)code withMessage:(NSString *)msg {
    NSString *urlString = [NSString stringWithFormat:@"mockhttps://example.com/status?code=%ld&msg=%@", code, [msg urlEncode]];
    NSURL *url = [NSURL URLWithString:urlString];
    ApproovLogD(@"mocked URL: %@: %@", url, urlString);
    return [session dataTaskWithURL:url];
}

/**
 * Starts a data task which returns a custom error.
 *
 * @param session the session starting the task
 * @param code the status code
 * @param msg a descriptive message
 * @return NSURLSessionDataTask that mocks the request
 */
+ (NSURLSessionDataTask *)createMockTaskForSession:(NSURLSession *)session withErrorCode:(NSInteger)code withMessage:(NSString *)msg {
    NSString *urlString = [NSString stringWithFormat:@"mockhttps://example.com/error?code=%ld&msg=%@", code, [msg urlEncode]];
    NSURL *url = [NSURL URLWithString:urlString];
    ApproovLogD(@"mocked URL: %@: %@", url, urlString);
    return [session dataTaskWithURL:url];
}

/**
 * Determines whether the protocool subclass can handle the request.
 *
 * @param request is the specific request to be checked
 * @return YES if it can be handled
 */
+ (BOOL)canInitWithRequest:(NSURLRequest *)request {
    // pass is this is not a mock https scheme
    if (![request.URL.scheme isEqualToString:@"mockhttps"]) {
        return NO;
    }

    // pass if this request has already been intercepted - the urlprotocol is very chatty and checks multiple
    // times per request for some reason
    if ([NSURLProtocol propertyForKey: @"handled" inRequest:request] ) {
        ApproovLogD(@"mock URL protocol already handling request");
        return NO;
    }

    // we can handle the request
    ApproovLogD(@"mock URL protocol will handle the request");
    return YES;
 }

/**
 * Returns a canonical version of the specified request. This shows the request
 * is intercepted and it is marked as being handled.
 *
 * @param request is the request to be canonicalized
 * @return the canonicalized version of the request
 */
+ (NSURLRequest *)canonicalRequestForRequest:(NSURLRequest * _Nonnull) request {
    NSMutableURLRequest * _Nonnull mutableRequest = [request mutableCopy];
    [NSURLProtocol setProperty:@YES forKey:@"handled" inRequest:mutableRequest];
    return mutableRequest;
}

/**
 * Creates a mocked URL protocol instance to handle the request.
 *
 * @param request being initialized
 * @param cachedResponse is any cached response, or nuil otherwise
 * @param client which provides the implementation of the client
 */
- (instancetype)initWithRequest:request cachedResponse:cachedResponse client:client {
    self = [super initWithRequest:request cachedResponse:cachedResponse client:client];
    if (!self) {
        ApproovLogE(@"mock URL protocol failed to initialize with request");
        return nil;
    }
    ApproovLogD(@"mock URL protocol initialized with request");
    return self;
}

/**
 * Starts the protocol specific loading of the request. This is used to extract the 
 * code and message and provide a response with it.
 */
- (void)startLoading {
    // parse the query strings
    NSURL *url = self.request.URL;
    NSMutableDictionary *queryStrings = [[NSMutableDictionary alloc] init];
    for (NSString *qs in [url.query componentsSeparatedByString:@"&"]) {
        NSString *key = [[qs componentsSeparatedByString:@"="] objectAtIndex:0];
        NSString *value = [[qs componentsSeparatedByString:@"="] objectAtIndex:1];
        value = [value stringByReplacingOccurrencesOfString:@"+" withString:@" "];
        value = [value urlDecode];
        queryStrings[key] = value;
    }
    
    // extract code and msg values
    NSInteger code = [queryStrings[@"code"] intValue];
    NSString *msg = queryStrings[@"msg"];
    
    // determine the response to be sent
    id<NSURLProtocolClient> client = [self client];
    if ([url.path isEqualToString:@"/status"]) {
        // send a mock status code response
        NSURLResponse * response = [[NSHTTPURLResponse alloc] initWithURL:url statusCode:code HTTPVersion:@"HTTP/1.1" headerFields:@{}];
        [client URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];
        [client URLProtocolDidFinishLoading:self];
    } else {
        // send an error response
        NSError *error = ApproovError(code, msg);
        [client URLProtocol:self didFailWithError:error];
    }
}

/**
 * Stops the protocol specific loading of the request. There is nothing to do as the loading always results
 * in some sort of error.
 */
- (void)stopLoading {
}

@end
