#import "CBApproovURLSessionSwizzler.h"
#import "CBApproovURLProtocol.h"
#import "RSSwizzle.h"

@implementation CBApproovURLSessionSwizzler

+ (void)swizzleWithApproovService:(CBApproovService *)service {
    NSLog(@"Approov: swizzling NSURLSession");
    
    // add approoov interceptoor protocol to default configuration
    
    RSSwizzleClassMethod([NSURLSessionConfiguration class],
                         @selector(defaultSessionConfiguration),
                         RSSWReturnType(NSURLSessionConfiguration *),
                         RSSWArguments(),
                         RSSWReplacement(
    {
        NSLog(@"[Approov] using Approov swizzled session configuration");
        NSURLSessionConfiguration *configuration = RSSWCallOriginal();
        
        configuration.protocolClasses = @[[CBApproovURLProtocol class]];
        
        return configuration;
    }));
    
    // add approoov pinning session

    RSSwizzleClassMethod([NSURLSession class],
                         @selector(sessionWithConfiguration:delegate:delegateQueue:),
                         RSSWReturnType(NSURLSession *),
                         RSSWArguments(NSURLSessionConfiguration * _Nonnull configuration, id _Nullable delegate, NSOperationQueue * _Nullable queue),
                         RSSWReplacement(
    {
        NSURLSession *session;

        NSLog(@"[Approov] using Approov swizzled session pinning authenticatioon");
        NSLog(@"[Approov] add pinning implementation here...");
        session = RSSWCallOriginal(configuration, delegate, queue);

        return session;
    }));
}

@end
