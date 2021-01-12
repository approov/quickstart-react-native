#import "CBApproovURLSessionDelegate.h"

@interface CBApproovURLSessionDelegate ()

@property (nonatomic) id<NSURLSessionDelegate, NSURLSessionTaskDelegate> originalDelegate;

@property (nonatomic) CBApproovService *service;

@end

@implementation CBApproovURLSessionDelegate

- (instancetype _Nullable)initWithApproovService:(CBApproovService *)service sessionDelegate:(id<NSURLSessionDelegate>)delegate {
    return self;
}

- (void)URLSession:(NSURLSession *)session didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge completionHandler:(CBApproovURLSessionAuthChallengeCallback)completionHandler {
    
}

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge completionHandler:(CBApproovURLSessionAuthChallengeCallback)completionHandler {
    
}

// Forward messages to the original delegate if the proxy doesn't implement the method
- (id)forwardingTargetForSelector:(SEL)sel {
    return _originalDelegate;
}

@end
