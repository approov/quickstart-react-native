#import "CBApproovService.h"
#import "Approov/Approov.h"

@interface CBApproovService()

@property (nullable, strong) id<CBApproovServiceDelegate> delegate;

- (NSString *)loadConfig;

- (void)storeConfig:(NSString *)config;

- (void)updateConfig;

@end

@implementation CBApproovService

NSString *const ApproovConfigKey = @"approov-config";

- (NSString *)loadConfig {
    // load config
    NSString *config = [[NSUserDefaults standardUserDefaults] stringForKey:ApproovConfigKey];
    return config;
}

- (void)storeConfig:(NSString *)config {
    if (!config) {
        return;
    }

    // store config
    [[NSUserDefaults standardUserDefaults] setObject:config forKey:ApproovConfigKey];
    [[NSUserDefaults standardUserDefaults] synchronize];
}

- (void)updateConfig {
    // fetch latest config
    NSString *config = [Approov fetchConfig];
    if (!config) {
        NSLog(@"Approov: no updated config found");
        return;
    }
    
    // store config
    [self storeConfig:config];
    NSLog(@"Approov: config updated");

    // notfiy delegate
    [self.delegate approovService:self hadConfigUpdate:YES];
}

- (instancetype)initWithConfig:(NSString *)config withDelegate:(id<CBApproovServiceDelegate>)delegate {
    // initialize super
    self = [super init];
    if (self == nil) {
        NSLog(@"Approov: unable to initialize Approov service");
        [NSException raise:@"ApproovServiceInitFailure:" format:@"unable to initialize Approov service because \
         unable to initialize root NSObject at run time."];
    }

    // check config
    if (config == nil) {
        NSLog(@"Approov: unable to initialize Approov service because of missing Approov configuratio");
        [NSException raise:@"ApproovServiceInitFailure:" format:@"unable to initialize Approov service because \
         initial configuration not found. Please make sure you have the file approov.config available \
         in your app's root directory."];
    }
    
    // assign delegate
    self.delegate = delegate;
    
    // read any dynamic config
    NSString *dynamicConfig = [self loadConfig];
    
    // initialize Approov SDK
    NSError *error = nil;
    [Approov initialize:config updateConfig:dynamicConfig comment:nil error:&error];
    if (error) {
        NSLog(@"Approov initialization failed: %@", error);
    }
    
    // if no dynamic config (1st app launch), then try again
    if (!dynamicConfig) {
        [self updateConfig];
    }
        
    return self;
}

- (void)prefetchToken {
    NSLog(@"Approov: prefetching Approov token");
    [Approov fetchApproovToken:^(ApproovTokenFetchResult* result) {
        // nothing to do
    }:@"approov.io"];
}

- (NSString *) getToken:(nonnull NSString *)domain {
    // request an Approov token for the domain
    ApproovTokenFetchResult* result = [Approov fetchApproovTokenAndWait:domain];
    
    // log result
    NSLog(@"ApproovURLSession: Approov token for domain: %@: %@", domain, result.loggableToken);

    // update config if needed
    if (result.isConfigChanged) {
        [self updateConfig];
    }

    // evaluate token status
    switch (result.status) {
        case ApproovTokenFetchStatusSuccess: {
            // on success, return token
            return result.token;
        }
        case ApproovTokenFetchStatusUnprotectedURL:
        case ApproovTokenFetchStatusUnknownURL:
        case ApproovTokenFetchStatusNoApproovService: {
            // on no approov service or domain not registered with Approov, return empty string
            return @"";
        }
        case ApproovTokenFetchStatusNoNetwork:
        case ApproovTokenFetchStatusPoorNetwork:
        case ApproovTokenFetchStatusMITMDetected:
        default: {
            [NSException raise:@"ApproovServiceFetchTokenFailure:" format:@"unable to fetch Approov token"];
            break;
        }
    }
    
    return nil;
}

- (nullable NSDictionary<NSString *, NSArray<NSString *> *> *)getPins:(nonnull NSString *)pinType {
    return [Approov getPins:pinType];
}

- (void)bindToken:(nonnull NSString *)data {
    [Approov setDataHashInToken:data];
}

@end
