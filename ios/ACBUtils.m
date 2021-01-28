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

- (NSString *)urldecoded {
    return [self stringByRemovingPercentEncoding];
}

@end
