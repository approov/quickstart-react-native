/**
 * Copyright 2020 CriticalBlue Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
 * OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
 
#import "RNApproov.h"
#import <React/RCTBridge.h>
#import <React/RCTReloadCommand.h>

#import "TrustKit/TrustKit.h"

#import <Approov/Approov.h>

@implementation RNApproov

RCT_EXPORT_MODULE(Approov)

- (id)init
{
    self = [super init];
    if (self != nil) {
        // read the initial configuration
        NSString *initialConfig = nil;
        NSURL *initialConfigURL = [[NSBundle mainBundle] URLForResource:@"approov-initial" withExtension:@"config"];
        if (initialConfigURL) {
            NSError *error = nil;
            initialConfig = [NSString stringWithContentsOfURL:initialConfigURL encoding:NSASCIIStringEncoding error:&error];
            if (error) {
                // it should be fatal if the SDK cannot read an initial configuration
                [NSException raise:@"Approov initial configuration read failed" format:@"Approov initial configuration read failed: %@. \
                    Please make sure you have the file approov-initial.config available in your app's root directory.", error];
            }
        }
        else {
            // it should be fatal if the SDK cannot read an initial configuration
            NSLog(@"Approov initial configuration not found");
            [NSException raise:@"Approov initial configuration not found" format:@"Approov initial configuration not found. \
                    Please make sure you have the file approov-initial.config available in your app's root directory."];
        }

        // read any dynamic configuration for the SDK from local storage
        NSString *dynamicConfig = [RNApproov loadApproovDynamicConfig];

        // initialize the Approov SDK
        NSError *error = nil;
        [Approov initialize:initialConfig updateConfig:dynamicConfig comment:nil error:&error];
        if (error) {
            // it should be fatal if the SDK cannot be initialized as all subsequent attempts
            // to use the SDK will fail
            NSLog(@"Approov initialization failed: %@", error);
        }

        // if we didn't have a dynamic configuration (which happens after the first launch of the app) then
        // we fetch one and write it to local storage now
        if (!dynamicConfig) {
            [RNApproov saveApproovDynamicConfig];
            
        }
        
        [RNApproov updateCertificatePinset];
    }
    return self;
}

- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

- (void)loadBundle
{
    RCTTriggerReloadCommandListeners();
}

/**
 * Saves the Approov dynamic configuration to the user defaults database which is persisted
 * between app launches. This should be called after every Approov token fetch where
 * isConfigChanged is set. It saves a new configuration received from the Approov server to
 * the user defaults database so that it is available on app startup on the next launch.
 */
+ (void)saveApproovDynamicConfig
{
    NSString *updateConfig = [Approov fetchConfig];
    if (!updateConfig) {
        NSLog(@"Could not get dynamic Approov configuration to save");
    }
    else {
        [[NSUserDefaults standardUserDefaults] setObject:updateConfig forKey:@"approov-dynamic"];
        [[NSUserDefaults standardUserDefaults] synchronize];
    }
}

/**
 * Reads any previously-saved dynamic configuration for the Approov SDK. May return 'nil' if a
 * dynamic configuration has not yet been saved by calling saveApproovDynamicConfig().
 */
+ (NSString *)loadApproovDynamicConfig
{
    NSString *dynamicConfig = [[NSUserDefaults standardUserDefaults] stringForKey:@"approov-dynamic"];
    return dynamicConfig;
}

+ (void)updateCertificatePinset
{
    // fetch the certificate pins from Approov
    NSDictionary<NSString *, NSArray<NSString *> *> *pins = [Approov getPins:@"public-key-sha256"];
    if (!pins || [pins count] == 0) {
        return;
    }

    // create a TrustKit configuration based on the domains and pins for each domain according to Approov
    NSMutableDictionary *trustKitPinnedDomains = [NSMutableDictionary dictionaryWithCapacity:[pins count]];
    for (NSString *domain in pins) {
        NSArray<NSString *> *pinsForDomain = pins[domain];
        trustKitPinnedDomains[domain] = @{
            kTSKPublicKeyHashes: pinsForDomain,
            kTSKIncludeSubdomains : @YES,
            kTSKEnforcePinning : @YES
        };
    }
    NSMutableDictionary *trustKitConfig =
    @{
        kTSKSwizzleNetworkDelegates: @YES,
        kTSKPinnedDomains : trustKitPinnedDomains
    };

    // clear out the NSURLSession cache and re-initialise TrustKit with the new configuration and updated certificate pins
    [[NSURLSession sharedSession] finishTasksAndInvalidate];
    [[NSURLSession sharedSession] resetWithCompletionHandler:^{
        [TrustKit initSharedInstanceWithConfiguration:trustKitConfig];
    }];
}

RCT_EXPORT_METHOD(fetchApproovToken:(NSString *)url resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
    [Approov fetchApproovToken:^(ApproovTokenFetchResult *result) {

        NSString *status = nil;
        switch (result.status) {
            case ApproovTokenFetchStatusSuccess:
            case ApproovTokenFetchStatusNoApproovService:
                status = @"okay";
                break;
            case ApproovTokenFetchStatusNoNetwork:
            case ApproovTokenFetchStatusPoorNetwork:
            case ApproovTokenFetchStatusMITMDetected:
                status = @"retry";
                break;
            default:
                status = @"error";
                break;
        }

        NSDictionary *promiseData = @{
            @"token": result.token,
            @"loggableToken": result.loggableToken,
            @"isConfigChanged": @(result.isConfigChanged),
            @"isForceApplyPins": @(result.isForceApplyPins),
            @"status": status
        };
        NSError *error = [NSError errorWithDomain: @"E_APPROOV_ERROR" code: result.status userInfo: promiseData];

        if (result.isConfigChanged) {
            [RNApproov saveApproovDynamicConfig];
        }

        if ([@"okay" isEqualToString:status]) {
            resolve(promiseData);
        }
        else {
            reject(@"E_APPROOV_ERROR", @"Failed to fetch Approov Token (see loggableToken for more info)", error);
        }
    } :url];
}

/**
 * Add a SHA-256 hash of the given data to the Approov token.
 *
 * @param data the data to hash
 */
RCT_EXPORT_METHOD(setDataHashInToken:(NSString *)data)
{
    [Approov setDataHashInToken:data];
}

/**
 * Perform a restart of the React Native Bridge to re-initialise the HTTP stack.
 */
RCT_EXPORT_METHOD(restart)
{
    if ([NSThread isMainThread]) {
        [self loadBundle];
    }
    else {
        dispatch_sync(dispatch_get_main_queue(), ^{
            [self loadBundle];
        });
    }
    return;
}

@end
