#import <Foundation/Foundation.h>
#import "CBApproovService.h"

typedef void(^CBApproovURLSessionAuthChallengeCallback)(NSURLSessionAuthChallengeDisposition disposition, NSURLCredential * credential);

@interface CBApproovURLSessionDelegate : NSObject

- (instancetype)init NS_UNAVAILABLE;

- (instancetype)initWithApproovService:(CBApproovService *)service sessionDelegate:(id<NSURLSessionDelegate>)delegate NS_DESIGNATED_INITIALIZER;

- (void)URLSession:(NSURLSession *)session didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge completionHandler:(CBApproovURLSessionAuthChallengeCallback)completionHandler;

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge completionHandler:(CBApproovURLSessionAuthChallengeCallback)completionHandler;

// Forward messages to the original delegate if the proxy doesn't implement the method
- (id)forwardingTargetForSelector:(SEL)sel;

@end
