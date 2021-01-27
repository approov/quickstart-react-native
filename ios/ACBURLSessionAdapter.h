#import <Foundation/Foundation.h>
#import "ACBApproovService.h"

NS_ASSUME_NONNULL_BEGIN

@class ACBURLSessionAdapter;

/// A session delegate wrapping react native delegates for https requests.
@interface ACBURLSessionDataDelegate : NSObject <NSURLSessionDelegate>

/// Creates an adapter session delegate.
/// @param delegate the original react native delgate.
/// @param adapter the session adapter.
+ (instancetype)createWithDelegate:(id<NSURLSessionDataDelegate>)delegate forAdapter:(ACBURLSessionAdapter *)adapter;

/// Initializes an adapter session delegate.
/// @param delegate the original react native delgate.
/// @param adapter the session adapter.
- (instancetype)initWithDelegate:(id<NSURLSessionDataDelegate>)delegate forAdapter:(ACBURLSessionAdapter *)adapter;

@end

/// A session adapter tracking react native sessions.
@interface ACBURLSessionAdapter : NSObject <ACBApproovServiceObserver>

/// The Approov service being used by the session delegates.
@property (readonly) ACBApproovService* approov;

/// Creates a session adapter.
/// @param service the Approov service.
/// @return the manager or nil previously created.
+ (instancetype)startWithApproovService:(ACBApproovService *)service;

/// Returns the session adapter singleton.
/// @return the singleton or nil if not yet started.
+ (instancetype)sharedAdapter;

/// Handles an Approov config update.
/// @param service the Approov service.
/// @param config  the updated configuration.
- (void)ApproovService:(ACBApproovService *)service updatedConfig:(NSString *)config;

NS_ASSUME_NONNULL_END

@end
