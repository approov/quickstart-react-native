/*
 * MIT License
 *
 * Copyright (c) 2016-present, Critical Blue Ltd.
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

NS_ASSUME_NONNULL_BEGIN

/// A mock hhtps protocol good for returning status codes and errors..
@interface ACBMockURLProtocol : NSURLProtocol <NSURLSessionDataDelegate>

/// Starts a data task which returns a custom status code.
/// @param session the session starting the task.
/// @param code the status code.
/// @param msg a descriptive message (not useed).
+ (NSURLSessionDataTask *)createMockTaskForSession:(NSURLSession *)session withStatusCode:(NSInteger)code withMessage:(NSString *)msg;


/// Starts a data task which fails the task with a custom error.
/// @param session the session starting the task.
/// @param code the error code.
/// @param msg a descriptive message.
+ (NSURLSessionDataTask *)createMockTaskForSession:(NSURLSession *)session withErrorCode:(NSInteger)code withMessage:(NSString *)msg;

@end

NS_ASSUME_NONNULL_END
