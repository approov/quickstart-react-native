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
#import "ApproovUtils.h"

void ApproovLog(NSString *fmt, ...) {
    va_list vargs;
    va_start(vargs, fmt);
    NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
    va_end(vargs);
    NSLog(@"ApproovService: %@", msg);
}

void ApproovLogX(NSString *fmt, ...) {
    if (APPROOV_LEVEL <= APPROOV_EXTREME) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);
        NSLog(@"ApproovService EXTREME: %@", msg);
    }
}

void ApproovLogD(NSString *fmt, ...) {
    if (APPROOV_LEVEL <= APPROOV_DEBUG) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);
        NSLog(@"ApproovService DEBUG: %@", msg);
    }
}

void ApproovLogI(NSString *fmt, ...) {
    if (APPROOV_LEVEL <= APPROOV_INFO) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);
        NSLog(@"ApproovService INFO: %@", msg);
    }
}

void ApproovLogW(NSString *fmt, ...) {
    if (APPROOV_LEVEL <= APPROOV_WARN) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);
        NSLog(@"ApproovService WARN: %@", msg);
    }
}

void ApproovLogE(NSString *fmt, ...) {
    if (APPROOV_LEVEL <= APPROOV_ERROR) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);
        NSLog(@"ApproovService ERROR: %@", msg);
    }
}

NSError *ApproovError(NSInteger code, NSString *fmt, ...) {
    va_list vargs;
    va_start(vargs, fmt);
    NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
    va_end(vargs);
    
    NSDictionary *userInfo = @{
        NSLocalizedDescriptionKey: NSLocalizedString(msg, nil),
        NSLocalizedFailureReasonErrorKey: NSLocalizedString(msg, nil),
        NSLocalizedRecoverySuggestionErrorKey: NSLocalizedString(msg, nil)
    };
    NSError* error = [[NSError alloc] initWithDomain:[[NSBundle mainBundle] bundleIdentifier] code:code userInfo:userInfo];
    return error;
}

@implementation NSString (NSString_Extended)

/**
 * URL encodes a string.
 *
 * @return encoded string
 */
- (NSString *)urlEncode {
    NSMutableString *output = [NSMutableString string];
    const unsigned char *source = (const unsigned char *)[self UTF8String];
    long unsigned sourceLen = strlen((const char *)source);
    for (int i = 0; i < sourceLen; ++i) {
        const unsigned char thisChar = source[i];
        if (thisChar == ' '){
            [output appendString:@"+"];
        } else if (thisChar == '.' || thisChar == '-' || thisChar == '_' || thisChar == '~' ||
                   (thisChar >= 'a' && thisChar <= 'z') ||
                   (thisChar >= 'A' && thisChar <= 'Z') ||
                   (thisChar >= '0' && thisChar <= '9')) {
            [output appendFormat:@"%c", thisChar];
        } else {
            [output appendFormat:@"%%%02X", thisChar];
        }
    }
    return output;
}

/**
 * Decodes a URL encoded string.
 *
 * @return decoded string
 */
- (NSString *)urlDecode {
    return [self stringByRemovingPercentEncoding];
}

@end
