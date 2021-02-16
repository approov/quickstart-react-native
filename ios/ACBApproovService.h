/*
 * MIT License
 *
 * Copyright (c) 2016-present, CriticalBlue Ltd.
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

#import <Foundation/Foundation.h>
#import "ACBApproovProps.h"

NS_ASSUME_NONNULL_BEGIN

/// Reccomended actions after an attestation request.
typedef NS_ENUM(NSInteger, ACBAttestationAction) {
    ACBAttestationActionProceed,
    ACBAttestationActionRetry,
    ACBAttestationActionFail,
};

/// An attestation result.
@interface ACBAttestationResult : NSObject

/// The attested request.
@property NSURLRequest *request;

/// The recommended next action.
@property ACBAttestationAction action;

/// The result status.
@property (copy) NSString *status;

/// Creates an attestation result.
/// @param request the decoratede request.
/// @param action the recommended action.
/// @param status the ressult status.
+ (instancetype) createWithRequest:(NSURLRequest *)request withAction:(ACBAttestationAction)action withStatus:(NSString *)status;

/// Initializes an attestation result.
/// @param request the decoratede request.
/// @param action the recommended action.
/// @param status the ressult status.
- (instancetype) initWithRequest:(NSURLRequest *)request withAction:(ACBAttestationAction)action withStatus:(NSString *)status;

@end

/// Trust verification decisions.
typedef NS_ENUM(NSUInteger, ACBTrustDecision) {
    ACBTrustDecisionAllow,
    ACBTrustDecisionBlock,
    ACBTrustDecisionNotPinned,
};

@class ACBApproovService;

/// An observer protocol for the Approov service.
@protocol ACBApproovServiceObserver

/// Notifies observer of Approov configuration update.
/// @param service the Approov service.
/// @param config  the updated configuration.
- (void)ApproovService:(ACBApproovService *)service updatedConfig:(NSString *)config;

@end

/// An Approov service for react native.
@interface ACBApproovService : NSObject

/// The associated Approov props.
@property (readonly) ACBApproovProps *props;

/// Creates and starts an initialized Approov service instance.
/// @param props the Approov props used by the proxy.
/// @return the initialized proxy service singleton.
+ (instancetype) startWithProps:(ACBApproovProps *)props;

/// Adds a service observer.
/// @param observer the observer.
- (void)addObserver:(id<ACBApproovServiceObserver>)observer;

/// Removes a service observer.
/// @param observer the observer.
- (void)removeObserver:(id<ACBApproovServiceObserver>)observer;

/// Attests the app during a request.
/// @param request the requesst.
/// @return the result including a modifieed request and status code and message.
- (ACBAttestationResult *)attestRequest:(NSURLRequest *)request;

/// Verifies the server presents a valid Approov-pinned certificate.
/// @param serverTrust the server's trust object..
/// @param host the requested server host name.
/// @return a trust decision - allow, block, or  not pinned.
- (ACBTrustDecision)verifyServerTrust:(SecTrustRef)serverTrust forHost:(NSString *)host;

@end

NS_ASSUME_NONNULL_END
