#import "CBApproovModule.h"
#import "CBApproovService.h"
#import "CBApproovURLSessionSwizzler.h"

@interface CBApproovModule()

- (NSString *)loadApproovConfig;

@end

@implementation CBApproovModule

RCT_EXPORT_MODULE(Approov);

/** Indicates that  this moudle must initialize before any javascript is run. */
+ (BOOL)requiresMainQueueSetup {
    return YES;
}

/** Loads  approov.config file into string. */
- (NSString *)loadApproovConfig {
    NSString *config = nil;

    NSURL *configURL = [[NSBundle mainBundle] URLForResource:@"approov" withExtension:@"config"];
    if (configURL) {
        NSError *error = nil;
        config = [NSString stringWithContentsOfURL:configURL encoding:NSASCIIStringEncoding error:&error];
        if (error) {
            NSLog(@"Approov initial configuration read failed");
            [NSException raise:@"ApproovMooduleConfigReadFailed" format:@"Approov config read failed: %@. \
             Please make sure you have the file approov.config available in your app's root directory.", error];
        }
    }
    else {
        NSLog(@"Approov initial configuration not found");
        [NSException raise:@"ApproovModuleConfigNotFound" format:@"Approov config not found: \
         Please make sure you have the file approov.config available in your app's root directory."];
    }

    return config;
}

/** Initializes this native module. */
- (instancetype)init {
    NSLog(@"Approov: native module initialization starting");

    self = [super init];
    if (self == nil) {
        NSLog(@"Approov: unable to initialize Approov module");
        [NSException raise:@"ApproovModuleInitFailure" format:@"unable to initialize Approov module because \
         unable to initialize root NSObject at run time."];
    }

    // load initial config
    NSString *config = [self loadApproovConfig];

    // initialize Approov service
    CBApproovService *approovService = [[CBApproovService alloc] initWithConfig:config withDelegate: self];

    // prefetch token before first client request
    [approovService prefetchToken];
    
    // swizzle url session pinning and token protection
    [CBApproovURLSessionSwizzler swizzleWithApproovService:approovService];

    NSLog(@"Approov: native module initialization finished");

    return self;
}

RCT_EXPORT_METHOD(fetchVersion:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    NSString *msg = [NSString stringWithFormat:@"Version: %@", @"_name"];
    resolve(msg);
}

- (void)approovService:(CBApproovService *)service hadConfigUpdate:(BOOL)update {
    if (update) {
        NSLog(@"Approov: servicing Approov config update");
    }
}

@end
