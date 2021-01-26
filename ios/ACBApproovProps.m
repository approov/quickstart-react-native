#import <Foundation/Foundation.h>
#import "ACBApproovProps.h"
#import "ACBUtils.h"

@interface ACBApproovProps ()

@property NSDictionary<NSString *,NSString *> *props;

@end

@implementation ACBApproovProps

+ (instancetype)sharedProps {
    static ACBApproovProps *sharedProps = nil;
    static dispatch_once_t onceToken = 0;

    dispatch_once(&onceToken, ^{
        sharedProps = [[self alloc] init];
    });
    return sharedProps;
}

NSString *const PropsResource = @"approov";
NSString *const PropsExtension = @"plist";

- (instancetype)init {
    ACBLogX(@"Approov props initializing");
    
    self = [super init];
    if (self == nil) {
        ACBLogE(@"Approov props failed to initialize");
        [NSException raise:@"ApproovPropsInitFailure" format:@"Approov props failed to initialize."];
    }

    NSURL *propsURL = [[NSBundle mainBundle] URLForResource:PropsResource withExtension:PropsExtension];
    if (propsURL) {
        NSError *error = nil;
        if (@available(iOS 11, *)) {
            _props = [NSDictionary<NSString *,NSString *> dictionaryWithContentsOfURL:propsURL error:&error];
        } else {
            _props = [NSDictionary<NSString *,NSString *> dictionaryWithContentsOfURL:propsURL];
            if (_props == nil) error = ACBError(1001, @"Unable to locate Approov props resource");
        }
        if (error) {
            ACBLogE(@"Approov props read failed");
            [NSException raise:@"ApproovPropsReadFailed" format:@"Approov props config read failed: %@. \
             Please make sure you have the plist file '%@.%@' available in your app's root directory.", error, PropsResource, PropsExtension];
        }
    }
    else {
        ACBLogE(@"Approov props not found");
        [NSException raise:@"ApproovPropsNotFound" format:@"Approov props not found: \
         Please make sure you have the plist file '%@.%@' available in your app's root directory.", PropsResource, PropsExtension];
    }
    
    ACBLogI(@"Approov props initialized");

    return self;
}

- (NSString *)valueForKey:(NSString *)key {
    return [_props objectForKey:key];
}

@end
