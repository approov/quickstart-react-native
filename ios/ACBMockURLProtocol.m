/*
 * MIT License
 *
 * Copyright (c) 2016-present, Critical Blue Ltd.
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

    ACBLogX(@"url: %@", request.URL);
    ACBLogX(@"scheme: %@", request.URL.scheme);

    // pass is this is not a mock https scheme
    if (![request.URL.scheme isEqualToString:@"mockhttps"]) {
        ACBLogD(@"not handling scheme: %@", request.URL.scheme);
       return NO;
    }

    // pass if this request has already been intercepted
    // the urlprotocol is very chatty and checks multiple times per request for some reason.
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
        value = [value urldecode];
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
