#import <Foundation/Foundation.h>

@class CBApproovService;

@protocol CBApproovServiceDelegate

- (void)approovService:(CBApproovService *)service hadConfigUpdate:(BOOL)update;

@end

@interface CBApproovService : NSObject

- (instancetype)initWithConfig:(NSString *)config withDelegate:(id<CBApproovServiceDelegate>)delegate;

- (void)prefetchToken;

- (NSString *) getToken:(NSString *)domain;

- (nullable NSDictionary<NSString *, NSArray<NSString *> *> *)getPins:(nonnull NSString *)pinType;

- (void)bindToken:(nonnull NSString *)data;

@end
