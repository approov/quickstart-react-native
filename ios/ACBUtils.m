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
#import "ACBUtils.h"

void ACBLog(NSString *fmt, ...) {
    va_list vargs;
    va_start(vargs, fmt);
    NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
    va_end(vargs);

    NSLog(@"[Approov] %@", msg);
}

void ACBLogX(NSString *fmt, ...) {
    if (ACB_LEVEL <= ACB_EXTREME) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);

        NSLog(@"[Approov] DEBUG: %@", msg);
    }
}

void ACBLogD(NSString *fmt, ...) {
    if (ACB_LEVEL <= ACB_DEBUG) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);

        NSLog(@"[Approov] DEBUG: %@", msg);
    }
}

void ACBLogI(NSString *fmt, ...) {
    if (ACB_LEVEL <= ACB_INFO) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);

        NSLog(@"[Approov] INFO: %@", msg);
    }
}

void ACBLogW(NSString *fmt, ...) {
    if (ACB_LEVEL <= ACB_WARN) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);

        NSLog(@"[Approov] WARN: %@", msg);
    }
}

void ACBLogE(NSString *fmt, ...) {
    if (ACB_LEVEL <= ACB_ERROR) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);

        NSLog(@"[Approov] ERROR: %@", msg);
    }
}

NSError *ACBError(NSInteger code, NSString *fmt, ...) {
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

- (NSString *)urlencode {
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

- (NSString *)urldecode {
    return [self stringByRemovingPercentEncoding];
}

@end
