#import <Foundation/Foundation.h>
#import "CBUtils.h"

void CBLog(NSString *fmt, ...) {
    va_list vargs;
    va_start(vargs, fmt);
    NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
    va_end(vargs);

    NSLog(@"[Approov]  %@", msg);
}

void CBLogX(NSString *fmt, ...) {
    if (CB_LEVEL <= CB_EXTREME) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);

        NSLog(@"[Approov]D %@", msg);
    }
}

void CBLogD(NSString *fmt, ...) {
    if (CB_LEVEL <= CB_DEBUG) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);

        NSLog(@"[Approov]D %@", msg);
    }
}

void CBLogI(NSString *fmt, ...) {
    if (CB_LEVEL <= CB_INFO) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);

        NSLog(@"[Approov]I %@", msg);
    }
}

void CBLogW(NSString *fmt, ...) {
    if (CB_LEVEL <= CB_WARN) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);

        NSLog(@"[Approov]W %@", msg);
    }
}

void CBLogE(NSString *fmt, ...) {
    if (CB_LEVEL <= CB_ERROR) {
        va_list vargs;
        va_start(vargs, fmt);
        NSString* msg = [[NSString alloc] initWithFormat:fmt arguments:vargs];
        va_end(vargs);

        NSLog(@"[Approov]E %@", msg);
    }
}

NSError *CBError(NSInteger code, NSString *fmt, ...) {
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
