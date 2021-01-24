#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#define CB_EXTREME 0
#define CB_DEBUG   1
#define CB_INFO    2
#define CB_WARN    3
#define CB_WARNING 3
#define CB_ERR     4
#define CB_ERROR   4

#define CB_LEVEL   CB_DEBUG

void CBLog(NSString *fmt, ...);

void CBLogX(NSString *fmt, ...);

void CBLogD(NSString *fmt, ...);

void CBLogI(NSString *fmt, ...);

void CBLogW(NSString *fmt, ...);

void CBLogE(NSString *fmt, ...);

NSError *CBError(NSInteger code, NSString *fmt, ...);

NS_ASSUME_NONNULL_END
