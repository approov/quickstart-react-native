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

#define ACB_EXTREME 0
#define ACB_DEBUG   1
#define ACB_INFO    2
#define ACB_WARN    3
#define ACB_WARNING 3
#define ACB_ERR     4
#define ACB_ERROR   4

// set this to control amount of logging
#define ACB_LEVEL   ACB_INFO

void ACBLog(NSString *fmt, ...);

void ACBLogX(NSString *fmt, ...);

void ACBLogD(NSString *fmt, ...);

void ACBLogI(NSString *fmt, ...);

void ACBLogW(NSString *fmt, ...);

void ACBLogE(NSString *fmt, ...);

NSError *ACBError(NSInteger code, NSString *fmt, ...);

/// String convenience methods encapsulating URL encoding, which seems
/// is a mess of deprecations over various iOS releases.
@interface NSString (urlencoding)

/// Returns a URL encoded version of this string.
- (NSString *)urlencode;

/// Returns a URL decoded (unencoded) version of this string.
- (NSString *)urldecode;

@end

NS_ASSUME_NONNULL_END
