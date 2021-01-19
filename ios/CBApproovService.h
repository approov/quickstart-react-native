#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Reccomended actions after an attestation request.
typedef NS_ENUM(NSInteger, CBAttestationAction) {
    CBAttestationActionProceed,
    CBAttestationActionRetry,
    CBAttestationActionFail,
};

/// An attestation result.
@interface CBAttestationResult : NSObject

/// The attested request.
@property NSURLRequest *request;

/// The recommended next action.
@property CBAttestationAction action;

/// The result status.
@property (copy) NSString *status;

/// Creates an attestation result.
/// @param request the decoratede request.
/// @param action the recommended action.
/// @param status the ressult status.
+ (instancetype) createWithRequest:(NSURLRequest *)request withAction:(CBAttestationAction)action withStatus:(NSString *)status;

/// Initializes an attestation result.
/// @param request the decoratede request.
/// @param action the recommended action.
/// @param status the ressult status.
- (instancetype) initWithRequest:(NSURLRequest *)request withAction:(CBAttestationAction)action withStatus:(NSString *)status;

@end

@class CBApproovService;

/// A delegate protocol for the Approov service.
@protocol CBApproovServiceDelegate

/// Notifies delegate of Approov configuration update.
/// @param service the Approov service.
/// @param config  the updated configuration.
- (void)ApproovService:(CBApproovService *)service updatedConfig:(NSString *)config;

@end

/// An Approov service for react native.
@interface CBApproovService : NSObject

/// The service delegate.
@property id<CBApproovServiceDelegate> delegate;

/// Creates an initialized Approov service instance.
+ (instancetype) create;

/// Initializes an Approov service.
- (instancetype) init;

/// Attests the app during a request.
/// @param request the requesst.
/// @return the result including a modifieed request and status code and message.
- (CBAttestationResult *)attestRequest:(NSURLRequest *)request;

/// Verifies the server presents a valid Approov-pinned certificate.
/// @param serverTrust the server's trust object..
/// @param host the requested server domain.
/// @return nil on success, an error otherwise.
- (NSError *)verifyTrust:(SecTrustRef)serverTrust forDomain:(NSString *)host;

@end

NS_ASSUME_NONNULL_END
