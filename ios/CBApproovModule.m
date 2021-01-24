#import "CBApproovModule.h"
#import "CBURLSessionManager.h"
#import "CBApproovService.h"
#import "CBUtils.h"

@interface CBApproovModule ()

@property CBApproovService *service;

@end

@implementation CBApproovModule

RCT_EXPORT_MODULE(Approov);

/** Indicates that  this moudle must initialize before any javascript is run. */
+ (BOOL)requiresMainQueueSetup {
    return YES;
}

/** Initializes this native module. */
- (instancetype)init {
    CBLogI(@"Native module initialization starting");

    self = [super init];
    if (self == nil) {
        CBLogE(@"Native module failed to initialize");
        [NSException raise:@"ApproovModuleInitFailure" format:@"Approov native module failed to initialize."];
    }

    // start the Approov service
    CBApproovService *service = [CBApproovService create];

    // start the Approov session manager and add as service delegate
    CBURLSessionManager *manager = [CBURLSessionManager createWithService:service];
    [service setDelegate:manager];

    CBLogI(@"Native module initialization finished successfully");

    return self;
}

// Native moodules must have at least one brdiged method to be recognized
// on the javascript side, so wee added a mdoule description.
RCT_EXPORT_METHOD(fetchDescription:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    NSString *msg = @"Approov Native Module for React Native";
    resolve(msg);
}

@end
