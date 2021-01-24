#import <Foundation/Foundation.h>
#import "CBApproovService.h"
NS_ASSUME_NONNULL_BEGIN

@class CBURLSessionManager;

/// A session delegate wrapping react native delegates for https requests.
@interface CBURLSessionDelegate : NSObject <NSURLSessionDataDelegate>

/// Creates a proxy session delegate.
/// @param delegate the original react native delgate.
/// @param manager the session manager.
+ (instancetype)createWithDelegate:(id<NSURLSessionDelegate>)delegate withManager:(CBURLSessionManager *)manager;

/// Initializes a proxy session delegate.
/// @param delegate the original react native delgate.
/// @param manager the session manager.
- (instancetype)initWithDelegate:(id<NSURLSessionDelegate>)delegate withManager:(CBURLSessionManager *)manager;

@end

/// A session manager tracking react native sessions.
@interface CBURLSessionManager : NSObject <CBApproovServiceDelegate>

/// The Approov service being used by the session delegates.
@property CBApproovService* service;

/// Creates a session manager.
/// @param service the Approov service.
/// @return the manager or nil previously created.
+ (instancetype)createWithService:(CBApproovService *)service;

/// Initializes a session delegate.
/// @param service the Approov service.
- (instancetype)initWithService:(CBApproovService *)service;

/// Handles an Approov config update by invalidating all sessions.
/// @param service the Approov service.
/// @param config  the updated configuration.
- (void)ApproovService:(CBApproovService *)service updatedConfig:(NSString *)config;

NS_ASSUME_NONNULL_END

@end
