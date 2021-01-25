#import "ACBApproovModule.h"
#import "ACBApproovService.h"
#import "ACBProxyURLService.h"
#import "ACBUtils.h"

@interface ACBApproovModule ()

@property ACBApproovService *service;

@end

@implementation ACBApproovModule

RCT_EXPORT_MODULE(Approov);

/** Indicates that  this moudle must initialize before any javascript is run. */
+ (BOOL)requiresMainQueueSetup {
    return YES;
}

/** Initializes this native module. */
- (instancetype)init {
    ACBLogI(@"Native module initialization starting");

    self = [super init];
    if (self == nil) {
        ACBLogE(@"Native module failed to initialize");
        [NSException raise:@"ApproovModuleInitFailure" format:@"Approov native module failed to initialize."];
    }

    // start the Approov service
    ACBApproovService *approov = [ACBApproovService start];

    // start the URL service using Approov
    [ACBProxyURLService startWithApproovService:approov];

    ACBLogI(@"Native module initialization finished successfully");

    return self;
}

// Native moodules must have at least one brdiged method to be recognized
// on the javascript side, so wee added a mdoule description.
RCT_EXPORT_METHOD(fetchDescription:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    NSString *msg = @"Approov Native Module for React Native";
    resolve(msg);
}

@end
