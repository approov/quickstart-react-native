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

NS_ASSUME_NONNULL_BEGIN

#define APPROOV_EXTREME 0
#define APPROOV_DEBUG   1
#define APPROOV_INFO    2
#define APPROOV_WARN    3
#define APPROOV_WARNING 3
#define APPROOV_ERR     4
#define APPROOV_ERROR   4

// set this to control amount of logging
#define APPROOV_LEVEL   APPROOV_INFO

// logging functions at various log levels
void ApproovLog(NSString *fmt, ...);
void ApproovLogX(NSString *fmt, ...);
void ApproovLogD(NSString *fmt, ...);
void ApproovLogI(NSString *fmt, ...);
void ApproovLogW(NSString *fmt, ...);
void ApproovLogE(NSString *fmt, ...);

// create an error
NSError *ApproovError(NSInteger code, NSString *fmt, ...);

/// String convenience methods encapsulating URL encoding, which seems
/// is a mess of deprecations over various iOS releases.
@interface NSString (urlencoding)

/// Returns a URL encoded version of this string.
- (NSString *)urlEncode;

/// Returns a URL decoded (unencoded) version of this string.
- (NSString *)urlDecode;

@end

NS_ASSUME_NONNULL_END
