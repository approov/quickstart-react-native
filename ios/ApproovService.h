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

#import <React/RCTBridgeModule.h>

/// Recommended actions after an interception
typedef NS_ENUM(NSInteger, ApproovInterceptorAction) {
    ApproovInterceptorActionProceed,
    ApproovInterceptorActionRetry,
    ApproovInterceptorActionFail,
};

/// Results generated as a result of a networking interception
@interface ApproovInterceptorResult: NSObject

/// The updated request
@property NSURLRequest *request;

/// The recommended next action
@property ApproovInterceptorAction action;

/// Message describing the result
@property (copy) NSString *message;

/// Creates an interceptor result.
///
/// @param request the updated request
/// @param action the recommended action
/// @param message the result message
+ (instancetype) createWithRequest:(NSURLRequest *)request withAction:(ApproovInterceptorAction)action withMessage:(NSString *)message;

/// Initializes an interceptors result.
///
/// @param request the updated request
/// @param action the recommended action
/// @param message the result message
- (instancetype) initWithRequest:(NSURLRequest *)request withAction:(ApproovInterceptorAction)action withMessage:(NSString *)message;

@end

/// Trust verification decisions
typedef NS_ENUM(NSUInteger, ApproovTrustDecision) {
    ApproovTrustDecisionAllow,
    ApproovTrustDecisionBlock,
    ApproovTrustDecisionNotPinned,
};

/// ApproovService wraps the underlying Approov SDK, provides network interceptors and bridges calls from Javascript
@interface ApproovService: NSObject <RCTBridgeModule>

/// Intercepts a request and updates it to potentially add an Approov token and/or perform substitutions on
/// headers and query parameters.
///
/// @param request the requesst
/// @return the result including a modifieed request and status code and message
- (ApproovInterceptorResult *)interceptRequest:(NSURLRequest *)request;

/// Verifies the server presents valid pinned certificates.
///
/// @param serverTrust the server's trust object
/// @param host the requested server host name
/// @return a trust decision - allow, block, or not pinned
- (ApproovTrustDecision)verifyPins:(SecTrustRef)serverTrust forHost:(NSString *)host;

@end
