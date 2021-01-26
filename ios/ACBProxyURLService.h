#import <Foundation/Foundation.h>
#import "ACBApproovService.h"
#import "ACBApproovProps.h"

NS_ASSUME_NONNULL_BEGIN

@interface ACBProxyURLService : NSObject <ACBApproovServiceObserver, NSURLSessionDataDelegate>

/// The current session.
@property (readonly) NSURLSession *session;

/// The associated Approov service.
@property (readonly) ACBApproovService *approov;

/// Creates and starts a proxy URL service singleton.
/// @param service the Approov service used by the proxy.
/// @param props the Approov props used by the proxy.
/// @return the initialized proxy service singleton.
+ (instancetype) startWithApproovService:(ACBApproovService *)service withProps:(ACBApproovProps *)props;

/// Returns the proxy URL service singleton.
/// @return the singleton or nil if not yet started.
+ (instancetype)sharedService;

- (void)setProtocol:(NSURLProtocol *)protocol forTask:(NSURLSessionTask *)task;

- (void)removeProtocolForTask:(NSURLSessionTask *)task;

@end

NS_ASSUME_NONNULL_END
