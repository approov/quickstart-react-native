#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#define ACB_EXTREME 0
#define ACB_DEBUG   1
#define ACB_INFO    2
#define ACB_WARN    3
#define ACB_WARNING 3
#define ACB_ERR     4
#define ACB_ERROR   4

#define ACB_LEVEL      ACB_DEBUG

void ACBLog(NSString *fmt, ...);

void ACBLogX(NSString *fmt, ...);

void ACBLogD(NSString *fmt, ...);

void ACBLogI(NSString *fmt, ...);

void ACBLogW(NSString *fmt, ...);

void ACBLogE(NSString *fmt, ...);

NSError *ACBError(NSInteger code, NSString *fmt, ...);

@interface NSString (NSString_Extended)

- (NSString *)urlencode;

@end

NS_ASSUME_NONNULL_END
