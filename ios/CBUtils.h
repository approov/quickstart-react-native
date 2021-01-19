#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#define CB_DEBUG   0
#define CB_INFO    1
#define CB_WARN    2
#define CB_WARNING 2
#define CB_ERR     3
#define CB_ERROR   3

#define CB_LEVEL   CB_DEBUG

void CBLog(NSString *fmt, ...);

void CBLogD(NSString *fmt, ...);

void CBLogI(NSString *fmt, ...);

void CBLogW(NSString *fmt, ...);

void CBLogE(NSString *fmt, ...);

NSError *CBError(NSInteger code, NSString *fmt, ...);

NS_ASSUME_NONNULL_END
