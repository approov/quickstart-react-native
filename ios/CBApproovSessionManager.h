#import <Foundation/Foundation.h>
#import "CBApproovService.h"
NS_ASSUME_NONNULL_BEGIN

/// A session delegate wrapping react native delegates for https requests.
@interface CBApproovSessionDelegate : NSObject <NSURLSessionDataDelegate>

/// Creates an Approov session delegate.
/// @param delegate the original react native delgate.
/// @param service the Approov service.
+ (instancetype)createWithDelegate:(id<NSURLSessionDelegate>)delegate withService:(CBApproovService *)service;

/// Initializes an Approov session delegate.
/// @param delegate the original react native delgate.
/// @param service the Approov service.
- (instancetype)initWithDelegate:(id<NSURLSessionDelegate>)delegate withService:(CBApproovService *)service;

@end

/// A session manager tracking react native sessions.
@interface CBApproovSessionManager : NSObject <CBApproovServiceDelegate>

/// Creates an Approov session manager.
/// @param service the Approov service.
/// @return the manager or nil previously created.
+ (instancetype)createWithService:(CBApproovService *)service;

/// Initializes an Approov session delegate.
/// @param service the Approov service.
- (instancetype)initWithService:(CBApproovService *)service;

/// Handles an Approov config update by invalidating all sessions.
/// @param service the Approov service.
/// @param config  the updated configuration.
- (void)ApproovService:(CBApproovService *)service updatedConfig:(NSString *)config;

NS_ASSUME_NONNULL_END

@end
