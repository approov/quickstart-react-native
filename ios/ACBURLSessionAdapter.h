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
