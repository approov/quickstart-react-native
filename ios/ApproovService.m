/*
 * MIT License
 *
 * Copyright (c) 2016-present, CriticalBlue Ltd.
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

#import "ApproovService.h"
#import "ApproovRCTInterceptor.h"
#import "ApproovProps.h"
#import "ApproovUtils.h"
#import "Approov/Approov.h"
#import <CommonCrypto/CommonCrypto.h>

// Results generated as a result of a networking interception
@implementation ApproovInterceptorResult

/**
 * Initiatizes an interceptor result.
 *
 * @param request the updated request
 * @param action the recommended action
 * @param message the result message
 */
- (instancetype) initWithRequest:(NSURLRequest *)request withAction:(ApproovInterceptorAction)action withMessage:(NSString *)message {
    self = [super init];
    if (self) {
        _request = request;
        _action = action;
        _message = message;
    }
    return self;
}

/**
 * Creates an interceptor result.
 *
 * @param request the updated request
 * @param action the recommended action
 * @param message the result message
 */
+ (instancetype) createWithRequest:(NSURLRequest *)request withAction:(ApproovInterceptorAction)action withMessage:(NSString *)message {
    return [[self alloc] initWithRequest:request withAction:action withMessage:message];
}

@end

// ApproovService wraps the underlying Approov SDK, provides network interceptors and bridges calls from Javascript
@implementation ApproovService

// provide the name of the module that will be visible to Javascript
RCT_EXPORT_MODULE(ApproovService);

// name of resource and extension holding the optional Approov SDK configuration
static NSString *const ConfigResource = @"approov";
static NSString *const ConfigExtension = @"config";

// time window (in millseconds) applied to any network request attempts made before Approov
// is initialized. The start of the window is defined by the first network request received
// prior to initialization. That network request, and any others arriving during the window, may
// then be delayed until the end of the window period. This is to allow time for the Approov
// initialization to be completed as it may be in a race with API requests made as the app
// starts up.
static NSTimeInterval STARTUP_SYNC_TIME_WINDOW = 2.5;

// lock object used during initialization
id initializerLock = nil;

// keeps track of whether Approov is initialized
BOOL isInitialized = NO;

// lock object used for synchronizing the earliestNetworkRequestTime
id earliestNetworkRequestTimeLock = nil;

// the earliest time that any network request will be allowed to avoid any potential race conditions with Approov
// protected API calls being made before Approov itself can be initialized - or 0.0 they may proceed immediately
NSTimeInterval earliestNetworkRequestTime = 0.0;

// original config string used during initialization
NSString *initialConfigString = nil;

// keeps track of whether a prefetch request has been made prior to initialization
BOOL pendingPrefetch = NO;

// YES if the interceptor should proceed on network failures and not add an Approov token
BOOL proceedOnNetworkFail = NO;

// YES if no logging should be output on unknown (or excluded) URLs
BOOL suppressLoggingUnknownURL = NO;

// header that will be added to Approov enabled requests
NSString *approovTokenHeader = @"Approov-Token";

// any prefix to be added before the Approov token, such as "Bearer "
NSString *approovTokenPrefix = @"";

// any header to be used for binding in Approov tokens or empty string if not set
NSString *bindingHeader = @"";

// map of headers that should have their values substituted for secure strings, mapped to their required prefixes
NSMutableDictionary<NSString *, NSString *> *substitutionHeaders = nil;

// set of query parameter keys whose values may be substituted for secure strings
NSMutableSet<NSString *> *substitutionQueryParams = nil;

// set of URL regular expressions that should be excluded from Approov protection
NSMutableSet<NSString *> *exclusionURLRegexs = nil;

/**
 * Indicates that this module must initialize before any Javascript is run.
 *
 * @return YES for initialization before Javascript
 */
+ (BOOL)requiresMainQueueSetup {
    return YES;
}

/**
 * Loads the Approov SDK configuration if it is available.
 *
 * @return configuration if available or nil otherwise
 */
- (NSString *)loadApproovConfig {
    NSURL *configURL = [[NSBundle mainBundle] URLForResource:ConfigResource withExtension:ConfigExtension];
    if (configURL) {
        // the configuration is present
        NSError *error = nil;
        NSString *config = [NSString stringWithContentsOfURL:configURL encoding:NSASCIIStringEncoding error:&error];
        if (error)
            ApproovLogE(@"configuration file read from %@ failed: %@", [configURL absoluteString], [error localizedDescription]);
        else {
            ApproovLogI(@"read configuration file from %@", [configURL absoluteString]);
            return config;
        }
    }
    return nil;
}

/**
 * Initializes this native module. This may load the optional configuration files and
 * initializes the SDK.
 */
- (instancetype)init {
    self = [super init];
    if (self == nil) {
        ApproovLogE(@"native module failed to initialize");
        [NSException raise:@"ApproovServiceInitFailure" format:@"Approov native module failed to initialize"];
    }

    // setup the state for the ApproovService
    substitutionHeaders = [[NSMutableDictionary alloc] init];
    substitutionQueryParams = [[NSMutableSet alloc] init];
    exclusionURLRegexs = [[NSMutableSet alloc] init];
    [self initializePublicKeyHeaders];

    // initialize the SDK if a configuration is available
    NSString *config = [self loadApproovConfig];
    if (config != nil) {
        // initialize the SDK
        NSError *initializationError = nil;
        [Approov initialize:config updateConfig:@"auto" comment:nil error:&initializationError];
        if (initializationError) {
            ApproovLogE(@"initialization failed: %@", [initializationError localizedDescription]);
        } else {
            // complete the initialization
            [Approov setUserProperty:@"approov-react-native"];
            initialConfigString = config;
            isInitialized = YES;
            ApproovLogI(@"initialized on launch on deviceID %@", [Approov getDeviceID]);

            // get the Approov properties
            ApproovProps *props = [ApproovProps sharedProps];

            // perform a prefetch if required
            NSString *prefetch = [props valueForKey:@"init.prefetch"];
            if ((prefetch != nil) && [prefetch boolValue]) {
                [self prefetch];
            }

            // set any token header and prefix
            NSString *tokenHeader = [props valueForKey:@"token.name"];
            if ((tokenHeader != nil) && ([tokenHeader length] != 0)) {
                NSString *tokenPrefix = [props valueForKey:@"token.prefix"];
                if (tokenPrefix == nil)
                    tokenPrefix = @"";
                [self setTokenHeader:tokenHeader prefix:tokenPrefix];
            }

            // set any token binding header
            NSString *bindingHeader = [props valueForKey:@"binding.name"];
            if ((bindingHeader != nil) && ([bindingHeader length] != 0))
                [self setBindingHeader:bindingHeader];
        }
    }
    else
         ApproovLogI(@"started");

    // start the React Native interceptor using this ApproovService
    [ApproovRCTInterceptor startWithApproovService:self];
    return self;
}

/**
 * Creates a UserInfo dictionary for a basic Approov error.
 *
 * @param isNetworkError is YES for a network error, NO otherwise
 * @return NSDictionary* to provide in an NSError
 */
- (NSDictionary<NSErrorUserInfoKey, id> *)errorUserInfo:(BOOL)isNetworkError {
    NSMutableDictionary<NSErrorUserInfoKey, id> *error = [[NSMutableDictionary alloc] init];
    error[@"type"] = @"general";
    if (isNetworkError)
        error[@"type"] = @"network";
    return error;
}

/**
 * Creates a UserInfo dictionary for an Approov attestation rejection error.
 *
 * @param rejectionARC is an encoded Attestation Response Code (ARC), or an empty string if not enabled
 * @param rejectionReasons if a list of comma separated rejection reasons, or empty string if not enabled
 * @return NSDictionary* to provide in an NSError
 */
- (NSDictionary<NSErrorUserInfoKey, id> *)rejectionUserInfo:(NSString*)rejectionARC :(NSString*)rejectionReasons {
    NSMutableDictionary<NSErrorUserInfoKey, id> *error = [[NSMutableDictionary alloc] init];
    error[@"type"] = @"rejection";
    error[@"rejectonARC"] = rejectionARC;
    error[@"rejectionReasons"] = rejectionReasons;
    return error;
}

/*
 * Initializes the ApproovService with the provided configuration string. The call is ignored if the
 * ApproovService has already been initialized with the same configuration string.
 *
 * @param config is the string to be used for initialization
 * @param resolve is used if the operation resolved without error
 * @param reject is used if the operation failed with an error
 */
RCT_EXPORT_METHOD(initialize:(NSString*)config resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    @synchronized(initializerLock) {
        if (isInitialized) {
            // if the SDK is previously initialized then check the config string is the same
            if (![initialConfigString isEqualToString:config]) {
                NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self errorUserInfo:NO]];
                reject(@"initialize", @"attempt to reinitialize Approov SDK with a different config", error);
            }
        }
        else {
            // initialize the Approov SDK
            NSError *initializationError = nil;
            [Approov initialize:config updateConfig:@"auto" comment:nil error:&initializationError];
            if (initializationError) {
                ApproovLogE(@"initialization failed: %@", [initializationError localizedDescription]);
                NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self errorUserInfo:NO]];
                NSString *details = [NSString stringWithFormat:@"initialization failed: %@", [initializationError localizedDescription]];
                reject(@"initialize", details, error);
            } else {
                [Approov setUserProperty:@"approov-react-native"];
                initialConfigString = config;
                isInitialized = YES;
                @synchronized(earliestNetworkRequestTimeLock) {
                    earliestNetworkRequestTime = 0.0;
                }
                ApproovLogI(@"initialized on deviceID %@", [Approov getDeviceID]);
                if (pendingPrefetch) {
                    [self prefetch];
                    pendingPrefetch = NO;
                }
                resolve(nil);
            }
        }
    }
}

/**
 * Indicates that requests should proceed anyway if it is not possible to obtain an Approov token
 * due to a networking failure. If this is called then the backend API can receive calls without the
 * expected Approov token header being added, or without header/query parameter substitutions being
 * made. Note that this should be used with caution because it may allow a connection to be established
 * before any dynamic pins have been received via Approov, thus potentially opening the channel to a MitM.
 */
RCT_EXPORT_METHOD(setProceedOnNetworkFail) {
    // no need to synchronize on this
    proceedOnNetworkFail = YES;
    ApproovLogI(@"proceedOnNetworkFail");
}

/**
 * Sets a development key indicating that the app is a development version and it should
 * pass attestation even if the app is not registered or it is running on an emulator. The
 * development key value can be rotated at any point in the account if a version of the app
 * containing the development key is accidentally released. This is primarily
 * used for situations where the app package must be modified or resigned in
 * some way as part of the testing process.
 *
 * @param devKey is the development key to be used
 * @param resolve is used if the operation resolved without error
 * @param reject is used if the operation failed with an error
 */
RCT_EXPORT_METHOD(setDevKey:(NSString *)devKey resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    ApproovLogI(@"setDevKey");
    [Approov setDevKey:devKey];
    resolve(nil);
}

/**
 * Indicates that logging should be suppressed for the requests to unknown (or excluded) URLs in order
 * to reduce the level of logging for requests not protected with Approov.
 */
RCT_EXPORT_METHOD(setSuppressLoggingUnknownURL) {
    // no need to synchronize on this
    suppressLoggingUnknownURL = YES;
    ApproovLogI(@"suppressLoggingUnknownURL");
}

/**
 * Sets the header that the Approov token is added on, as well as an optional
 * prefix String (such as "Bearer "). By default the token is provided on
 * "Approov-Token" with no prefix.
 *
 * @param header is the header to place the Approov token on
 * @param prefix is any prefix String for the Approov token header
 */
RCT_EXPORT_METHOD(setTokenHeader:(NSString *)header prefix:(NSString *)prefix) {
    @synchronized(approovTokenHeader) {
        approovTokenHeader = header;
    }
    @synchronized(approovTokenPrefix) {
        approovTokenPrefix = prefix;
    }
    ApproovLogI(@"setTokenHeader %@, %@", header, prefix);
}

/**
 * Sets a binding header that may be present on requests being made. A header should be
 * chosen whose value is unchanging for most requests (such as an Authorization header).
 * If the header is present, then a hash of the header value is included in the issued Approov
 * tokens to bind them to the value. This may then be verified by the backend API integration.
 *
 * @param header is the header to use for Approov token binding
 */
RCT_EXPORT_METHOD(setBindingHeader:(NSString *)header) {
    @synchronized(bindingHeader) {
        bindingHeader = header;
    }
    ApproovLogI(@"setBindingHeader %@", header);
}

/*
 * Adds the name of a header which should be subject to secure strings substitution. This
 * means that if the header is present then the value will be used as a key to look up a
 * secure string value which will be substituted into the header value instead. This allows
 * easy migration to the use of secure strings. A required prefix may be specified to deal
 * with cases such as the use of "Bearer " prefixed before values in an authorization header.
 *
 * @param header is the header to be marked for substitution
 * @param requiredPrefix is any required prefix to the value being substituted
 */
RCT_EXPORT_METHOD(addSubstitutionHeader:(NSString *)header requiredPrefix:(NSString *)requiredPrefix) {
    @synchronized(substitutionHeaders) {
        [substitutionHeaders setValue:requiredPrefix forKey:header];
    }
    ApproovLogI(@"addSubstitutionHeader %@, %@", header, requiredPrefix);
}

/*
 * Removes a header previously added using addSubstitutionHeader.
 *
 * @param header is the header to be removed for substitution
 */
RCT_EXPORT_METHOD(removeSubstitutionHeader:(NSString *)header) {
    @synchronized(substitutionHeaders) {
        [substitutionHeaders removeObjectForKey:header];
    }
    ApproovLogI(@"removeSubstitutionHeader %@", header);
}

/**
 * Adds a key name for a query parameter that should be subject to secure strings substitution.
 * This means that if the query parameter is present in a URL then the value will be used as a
 * key to look up a secure string value which will be substituted as the query parameter value
 * instead. This allows easy migration to the use of secure strings.
 *
 * @param key is the query parameter key name to be added for substitution
 */
RCT_EXPORT_METHOD(addSubstitutionQueryParam:(NSString *)key) {
    @synchronized(substitutionQueryParams) {
        [substitutionQueryParams addObject:key];
    }
    ApproovLogI(@"addSubstitutionQueryParam %@", key);
}

/**
 * Removes a query parameter key name previously added using addSubstitutionQueryParam.
 *
 * @param key is the query parameter key name to be removed for substitution
 */
RCT_EXPORT_METHOD(removeSubstitutionQueryParam:(NSString *)key) {
    @synchronized(substitutionQueryParams) {
        [substitutionQueryParams removeObject:key];
    }
    ApproovLogI(@"removeSubstitutionQueryParam %@", key);
}

/**
 * Adds an exclusion URL regular expression. If a URL for a request matches this regular expression
 * then it will not be subject to any Approov protection. Note that this facility must be used with
 * EXTREME CAUTION due to the impact of dynamic pinning. Pinning may be applied to all domains added
 * using Approov, and updates to the pins are received when an Approov fetch is performed. If you
 * exclude some URLs on domains that are protected with Approov, then these will be protected with
 * Approov pins but without a path to update the pins until a URL is used that is not excluded. Thus
 * you are responsible for ensuring that there is always a possibility of calling a non-excluded
 * URL, or you should make an explicit call to fetchToken if there are persistent pinning failures.
 * Conversely, use of those option may allow a connection to be established before any dynamic pins
 * have been received via Approov. thus potentially opening the channel to a MitM.
 *
 * @param urlRegex is the regular expression that will be compared against URLs to exclude them
 */
RCT_EXPORT_METHOD(addExclusionURLRegex:(NSString *)urlRegex) {
    @synchronized(exclusionURLRegexs) {
        [exclusionURLRegexs addObject:urlRegex];
    }
    ApproovLogI(@"addExclusionURLRegex %@", urlRegex);
}

/**
 * Removes an exclusion URL regular expression previously added using addExclusionURLRegex.
 *
 * @param urlRegex is the regular expression that will be compared against URLs to exclude them
 */
RCT_EXPORT_METHOD(removeExclusionURLRegex:(NSString *)urlRegex) {
    @synchronized(exclusionURLRegexs) {
        [exclusionURLRegexs removeObject:urlRegex];
    }
    ApproovLogI(@"removeExclusionURLRegex %@", urlRegex);
}

/**
 * Prefetches to lower the effective latency of a subsequent token or secure string fetch by
 * starting the operation earlier so the subsequent fetch may be able to use cached data.
 */
RCT_EXPORT_METHOD(prefetch) {
    if (isInitialized) {
        ApproovLogI(@"prefetch initiated");
        [Approov fetchApproovToken:^(ApproovTokenFetchResult *result) {
            if ((result.status == ApproovTokenFetchStatusSuccess) ||
                (result.status == ApproovTokenFetchStatusUnknownURL) ||
                (result.status == ApproovTokenFetchStatusUnprotectedURL))
                ApproovLogI(@"prefetch completed okay");
            else
                ApproovLogI(@"prefetch: %@", [Approov stringFromApproovTokenFetchStatus:result.status]);
        }:@"approov.io"];
    }
    else {
        ApproovLogI(@"prefetch pending");
        pendingPrefetch = YES;
    }
}

/*
 * Performs a precheck to determine if the app will pass attestation. This requires secure
 * strings to be enabled for the account, although no strings need to be set up. If the
 * attestation fails for any reason then the provided promise is rejected with a
 * description in the message field. If the userInfo.type field is "network" then that
 * indicates the failure was due to networking issues and a user initiated retry should be
 * allowed. If the userInfo.type field is "rejection" then this indicates the attestation was
 * rejected and the userInfo.rejectionARC and userInfo.rejectionReasons fields may provide
 * additional detail.
 *
 * @param resolve is used if the operation resolved without error
 * @param reject is used if the operation failed with an error
 */
 RCT_EXPORT_METHOD(precheck:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    [Approov fetchSecureString:^(ApproovTokenFetchResult *result) {
        if (result.status == ApproovTokenFetchStatusUnknownKey)
            ApproovLogI(@"precheck: passed");
        else
             ApproovLogI(@"precheck: %@", [Approov stringFromApproovTokenFetchStatus:result.status]);
        if (result.status == ApproovTokenFetchStatusRejected) {
            // fetch failed because the attestation failed
            NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self rejectionUserInfo:result.ARC :result.rejectionReasons]];
            NSString *details = [NSString stringWithFormat:@"Rejected %@ %@", result.ARC, result.rejectionReasons];
            reject(@"precheck", details, error);
        } else if ((result.status == ApproovTokenFetchStatusNoNetwork) ||
                   (result.status == ApproovTokenFetchStatusPoorNetwork) ||
                   (result.status == ApproovTokenFetchStatusMITMDetected)) {
            // fetch failed with a network related error
            NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self errorUserInfo:YES]];
            NSString *details = [NSString stringWithFormat:@"Network error: %@", [Approov stringFromApproovTokenFetchStatus:result.status]];
            reject(@"precheck", details, error);
        } else if ((result.status != ApproovTokenFetchStatusSuccess) && (result.status != ApproovTokenFetchStatusUnknownKey)) {
            // fetch failed with a more permanent error
            NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self errorUserInfo:NO]];
            NSString *details = [NSString stringWithFormat:@"Error: %@", [Approov stringFromApproovTokenFetchStatus:result.status]];
            reject(@"precheck", details, error);
        } else
            // precheck completed successfully
            resolve(nil);
    }:@"precheck-dummy-key" :nil];
}

/**
 * Gets the device ID used by Approov to identify the particular device that the SDK is running on. Note
 * that different Approov apps on the same device will return a different ID. Moreover, the ID may be
 * changed by an uninstall and reinstall of the app.
 * 
 * @param resolve is used if the operation resolved without error
 * @param reject is used if the operation failed with an error
 */
RCT_EXPORT_METHOD(getDeviceID:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    NSString *deviceID = [Approov getDeviceID];
    ApproovLogI(@"getDeviceID: %@", deviceID);
    if (deviceID == nil) {
        NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self errorUserInfo:NO]];
        reject(@"getDeviceID", @"ApproovService not initialized", error);
    }
    else
        resolve(deviceID);
}

/**
 * Directly sets the data hash to be included in subsequently fetched Approov tokens. If the hash is
 * different from any previously set value then this will cause the next token fetch operation to
 * fetch a new token with the correct payload data hash. The hash appears in the
 * 'pay' claim of the Approov token as a base64 encoded string of the SHA256 hash of the
 * data. Note that the data is hashed locally and never sent to the Approov cloud service.
 * 
 * @param data is the data to be hashed and set in the token
 * @param resolve is used if the operation resolved without error
 * @param reject is used if the operation failed with an error
 */
RCT_EXPORT_METHOD(setDataHashInToken:(NSString *)data resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    ApproovLogI(@"setDataHashInToken");
    [Approov setDataHashInToken:data];
    resolve(nil);
}

/**
 * Performs an Approov token fetch for the given URL. This should be used in situations where it
 * is not possible to use the networking interception to add the token. If there is a problem
 * then the promise is rejected with a message field providing a description. The field
 * userInfo.type will be "network" for networking issues where a user initiated retry of the
 * operation should be allowed.
 * 
 * @param url is the URL giving the domain for the token fetch
 * @param resolve is used if the operation resolved without error
 * @param reject is used if the operation failed with an error
 */
RCT_EXPORT_METHOD(fetchToken:(NSString*)url resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    [Approov fetchApproovToken:^(ApproovTokenFetchResult *result) {
        ApproovLogI(@"fetchToken %@: %@", url, [Approov stringFromApproovTokenFetchStatus:result.status]);
        if ((result.status == ApproovTokenFetchStatusNoNetwork) ||
            (result.status == ApproovTokenFetchStatusPoorNetwork) ||
            (result.status == ApproovTokenFetchStatusMITMDetected)) {
            // fetch failed with a network related error
            NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self errorUserInfo:YES]];
            NSString *details = [NSString stringWithFormat:@"Network error: %@", [Approov stringFromApproovTokenFetchStatus:result.status]];
            reject(@"fetchToken", details, error);
        } else if (result.status != ApproovTokenFetchStatusSuccess) {
            // fetch failed with a more permanent error
            NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self errorUserInfo:NO]];
            NSString *details = [NSString stringWithFormat:@"Error: %@", [Approov stringFromApproovTokenFetchStatus:result.status]];
            reject(@"fetchToken", details, error);
        } else
            // we successfully fetched a token
            resolve(result.token);
    }:url];
}

/**
 * Gets the signature for the given message. This uses an account specific message signing key that is
 * transmitted to the SDK after a successful fetch if the facility is enabled for the account. Note
 * that if the attestation failed then the signing key provided is actually random so that the
 * signature will be incorrect. An Approov token should always be included in the message
 * being signed and sent alongside this signature to prevent replay attacks.
 *
 * @param message is the message whose content is to be signed
 * @param resolve is used if the operation resolved without error
 * @param reject is used if the operation failed with an error
 */
RCT_EXPORT_METHOD(getMessageSignature:(NSString *)message resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    ApproovLogI(@"getMessageSignature");
    NSString *signature = [Approov getMessageSignature:message];
    if (signature == nil) {
        NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self errorUserInfo:NO]];
        reject(@"getMessageSignature", @"No signature available", error);
    }
    else
        resolve(signature);
}

/*
 * Fetches a secure string with the given key. If newDef is not nil then a
 * secure string for the particular app instance may be defined. In this case the
 * new value is returned as the secure string. Use of an empty string for newDef removes
 * the string entry. If the attestation fails for any reason then the provided promise is
 * rejected with a description in the message field. If the userInfo.type field is
 * "network" then that indicates the failure was due to networking issues and a user
 * initiated retry should be allowed. If the userInfo.type field is "rejection" then
 * this indicates the attestation was rejected and the userInfo.rejectionARC and
 * userInfo.rejectionReasons fields may provide additional detail.
 *
 * @param key is the secure string key to be looked up
 * @param newDef is any new definition for the secure string, or nil for lookup only
 * @param resolve is used if the operation resolved without error
 * @param reject is used if the operation failed with an error
 */
RCT_EXPORT_METHOD(fetchSecureString:(NSString*)key newDef:(NSString*)newDef
    resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)  {
    // determine the type of operation as the values themselves cannot be logged
    NSString *type = @"lookup";
    if (newDef != nil)
        type = @"definition";
    
    // fetch any secure string keyed by the value
    [Approov fetchSecureString:^(ApproovTokenFetchResult *result) {
        ApproovLogI(@"fetchSecureString %@ for %@: %@", type, key, [Approov stringFromApproovTokenFetchStatus:result.status]);
        if (result.status == ApproovTokenFetchStatusRejected) {
            // fetch failed because the attestation failed
            NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self rejectionUserInfo:result.ARC :result.rejectionReasons]];
            NSString *details = [NSString stringWithFormat:@"Rejected %@ %@", result.ARC, result.rejectionReasons];
            reject(@"fetchSecureString", details, error);
        } else if ((result.status == ApproovTokenFetchStatusNoNetwork) ||
                   (result.status == ApproovTokenFetchStatusPoorNetwork) ||
                   (result.status == ApproovTokenFetchStatusMITMDetected)) {
            // fetch failed with a network related error
            NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self errorUserInfo:YES]];
            NSString *details = [NSString stringWithFormat:@"Network error: %@", [Approov stringFromApproovTokenFetchStatus:result.status]];
            reject(@"fetchSecureString", details, error);
        } else if ((result.status != ApproovTokenFetchStatusSuccess) && (result.status != ApproovTokenFetchStatusUnknownKey)) {
            // fetch failed with a more permanent error
            NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self errorUserInfo:NO]];
            NSString *details = [NSString stringWithFormat:@"Error: %@", [Approov stringFromApproovTokenFetchStatus:result.status]];
            reject(@"fetchSecureString", details, error);
        } else
            // we successfully fetched a secure string (which may be nil)
            resolve(result.secureString);
    }:key :newDef];
}

/*
 * Fetches a custom JWT with the given payload. If the attestation fails for any reason
 * then the provided promise is rejected with a description in the message field. If the
 * userInfo.type field is "network" then that indicates the failure was due to networking
 * issues and a user initiated retry should be allowed. If the userInfo.type field is
 * "rejection" then this indicates the attestation was rejected and the
 * userInfo.rejectionARC and userInfo.rejectionReasons fields may provide additional detail.
 *
 * @param payload is the marshaled JSON object for the claims to be included
 * @param resolve is used if the operation resolved without error
 * @param reject is used if the operation failed with an error
 */
RCT_EXPORT_METHOD(fetchCustomJWT:(NSString*)payload resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    [Approov fetchCustomJWT:^(ApproovTokenFetchResult *result) {
        ApproovLogI(@"fetchCustomJWT: %@", [Approov stringFromApproovTokenFetchStatus:result.status]);
        if (result.status == ApproovTokenFetchStatusRejected) {
            // fetch failed because the attestation failed
            NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self rejectionUserInfo:result.ARC :result.rejectionReasons]];
            NSString *details = [NSString stringWithFormat:@"Rejected %@ %@", result.ARC, result.rejectionReasons];
            reject(@"fetchCustomJWT", details, error);
        } else if ((result.status == ApproovTokenFetchStatusNoNetwork) ||
                   (result.status == ApproovTokenFetchStatusPoorNetwork) ||
                   (result.status == ApproovTokenFetchStatusMITMDetected)) {
            // fetch failed with a network related error
            NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self errorUserInfo:YES]];
            NSString *details = [NSString stringWithFormat:@"Network error: %@", [Approov stringFromApproovTokenFetchStatus:result.status]];
            reject(@"fetchCustomJWT", details, error);
        } else if (result.status != ApproovTokenFetchStatusSuccess) {
            // fetch failed with a more permanent error
            NSError *error = [[NSError alloc] initWithDomain:@"io.approov.reactnative" code:0 userInfo:[self errorUserInfo:NO]];
            NSString *details = [NSString stringWithFormat:@"Error: %@", [Approov stringFromApproovTokenFetchStatus:result.status]];
            reject(@"fetchCustomJWT", details, error);
        } else
            // we successfully fetched a custom JWT
            resolve(result.token);
    }:payload];
}

/**
 * Adds Approov to the given request. This involves fetching an Approov token for the domain being accessed and
 * adding an Approov token to the outgoing header. This may also update the token if token binding is being used.
 * Header or query parameter values may also be substituted if this feature is enabled. A return result shows if
 * processing should continue or not and provides the updated request.
 *
 * @param request is the request being updated
 * @return ApproovInterceptorResult providing the result of the update
 */
- (ApproovInterceptorResult *)interceptRequest:(NSURLRequest *)request {
    // copy request into a form were it can be updated
    NSMutableURLRequest *updatedRequest = [request mutableCopy];

    // get the URL host domain
    NSString *host = updatedRequest.URL.host;
    if (host == nil) {
        ApproovLogE(@"request domain was missing or invalid");
        return [ApproovInterceptorResult createWithRequest:updatedRequest
            withAction:ApproovInterceptorActionFail
            withMessage:[Approov stringFromApproovTokenFetchStatus:ApproovTokenFetchStatusBadURL]];
    }

    // we always allow requests to "localhost" without Approov protection as can be used for obtaining resources
    // during development
    NSString *url = updatedRequest.URL.absoluteString;
    if ([host isEqualToString:@"localhost"]) {
        if (!suppressLoggingUnknownURL)
            ApproovLogI(@"localhost forwarded: %@", url);
        return [ApproovInterceptorResult createWithRequest:updatedRequest
            withAction:ApproovInterceptorActionProceed
            withMessage:@"localhost forwarded"];
    }

    // if the Approov SDK is not initialized then we just return immediately without making any changes
    if (!isInitialized) {
        // if this is the first network request performed prior to Approov initialization then we
        // start a time window in case we are in a race with that initialization
        @synchronized(earliestNetworkRequestTimeLock) {
            if (earliestNetworkRequestTime == 0) {
                earliestNetworkRequestTime = [[NSDate date] timeIntervalSince1970] + STARTUP_SYNC_TIME_WINDOW;
                ApproovLogI(@"startup sync time window started");
            }
        }

        // wait until any initial fetch time is reached
        BOOL waitForReady = YES;
        while (waitForReady) {
            NSTimeInterval currentTime = [[NSDate date] timeIntervalSince1970];
            NSTimeInterval earliestTime = 0.0;
            @synchronized(earliestNetworkRequestTimeLock) {
                earliestTime = earliestNetworkRequestTime;
            }
            if (currentTime >= earliestTime)
                waitForReady = NO;
            else {
                // sleep for a short period to block this request thread
                ApproovLogI(@"request paused: %@", url);
                [NSThread sleepForTimeInterval:0.1];
            }
        }

        // if Approov is still not initialized then forward the request unchanged
        if (!isInitialized) {
            ApproovLogI(@"uninitialized forwarded: %@", url);
            return [ApproovInterceptorResult createWithRequest:updatedRequest
                withAction:ApproovInterceptorActionProceed
                withMessage:@"uninitalized forwarded"];
        }
    } 

    // obtain a copy of the exclusion URL regular expressions in a thread safe way
    NSSet<NSString *> *exclusionURLs;
    @synchronized(exclusionURLRegexs) {
        exclusionURLs = [[NSSet alloc] initWithSet:exclusionURLRegexs copyItems:NO];
    }

    // we just return with the existing URL if it matches any of the exclusion URL regular expressions provided
    for (NSString *exclusionURL in exclusionURLs) {
        NSError *error = nil;
        NSRegularExpression *regex = [NSRegularExpression regularExpressionWithPattern:exclusionURL options:0 error:&error];
        if (!error) {
            NSTextCheckingResult *match = [regex firstMatchInString:url options:0 range:NSMakeRange(0, [url length])];
            if (match) {
                if (!suppressLoggingUnknownURL)
                    ApproovLogI(@"excluded url: %@", url);
                return [ApproovInterceptorResult createWithRequest:updatedRequest
                    withAction:ApproovInterceptorActionProceed
                    withMessage:@"URL excluded"];
            }
        }
    }

    // update the data hash based on any token binding header
    @synchronized(bindingHeader) {
        if (![bindingHeader isEqualToString:@""]) {
            NSString *headerValue = [request valueForHTTPHeaderField:bindingHeader];
            if (headerValue != nil) {
                [Approov setDataHashInToken:headerValue];
                ApproovLogI(@"setting data hash for binding header %@", bindingHeader);
            }
        }
    }

    // fetch the Approov token and log the result
    ApproovTokenFetchResult *result = [Approov fetchApproovTokenAndWait:host];
    if (!suppressLoggingUnknownURL || ([result status] != ApproovTokenFetchStatusUnknownURL))
        ApproovLogI(@"token for %@: %@", host, [result loggableToken]);

    // log if a configuration update is received and call fetchConfig to clear the update state
    if (result.isConfigChanged) {
        [Approov fetchConfig];
        ApproovLogI(@"dynamic configuration update received");
    }

    // process the token fetch result
    ApproovTokenFetchStatus status = [result status];
    switch (status) {
        case ApproovTokenFetchStatusSuccess:
        {
            // add the Approov token to the required header
            NSString *tokenHeader;
            @synchronized(approovTokenHeader) {
                tokenHeader = approovTokenHeader;
            }
            NSString *tokenPrefix;
            @synchronized(approovTokenPrefix) {
                tokenPrefix = approovTokenPrefix;
            }
            NSString *value = [NSString stringWithFormat:@"%@%@", tokenPrefix, [result token]];
            [updatedRequest setValue:value forHTTPHeaderField:tokenHeader];
            break;
        }
        case ApproovTokenFetchStatusUnknownURL:
        case ApproovTokenFetchStatusUnprotectedURL:
        case ApproovTokenFetchStatusNoApproovService:
            // in these cases we continue without adding an Approov token
            break;
        case ApproovTokenFetchStatusNoNetwork:
        case ApproovTokenFetchStatusPoorNetwork:
        case ApproovTokenFetchStatusMITMDetected:
            // unless we are proceeding on network fail, we throw an exception if we are unable to get
            // an Approov token due to network conditions
            if (!proceedOnNetworkFail)
                  return [ApproovInterceptorResult createWithRequest:updatedRequest
                        withAction:ApproovInterceptorActionRetry
                        withMessage:[Approov stringFromApproovTokenFetchStatus:status]];
        default:
            // we have a more permanent error from the Approov SDK
            return [ApproovInterceptorResult createWithRequest:updatedRequest
                        withAction:ApproovInterceptorActionFail
                        withMessage:[Approov stringFromApproovTokenFetchStatus:status]];
    }

    // we just return early with anything other than a success or unprotected URL - this is to ensure we don't
    // make further Approov fetches if there has been a problem and also that we don't do header or query
    // parameter substitutions in domains not known to Approov (which therefore might not be pinned)
    if ((status != ApproovTokenFetchStatusSuccess) &&
        (status != ApproovTokenFetchStatusUnprotectedURL))
         return [ApproovInterceptorResult createWithRequest:updatedRequest
                        withAction:ApproovInterceptorActionProceed
                        withMessage:[Approov stringFromApproovTokenFetchStatus:status]];

  // obtain a copy of the substitution headers in a thread safe way
    NSDictionary<NSString *, NSString *> *subsHeaders;
    @synchronized(substitutionHeaders) {
        subsHeaders = [[NSDictionary alloc] initWithDictionary:substitutionHeaders copyItems:NO];
    }

    // we now deal with any header substitutions, which may require further fetches but these
    // should be using cached results
    for (NSString *header in subsHeaders) {
        NSString *prefix = [substitutionHeaders objectForKey:header];
        NSString *value = [request valueForHTTPHeaderField:header];
        if ((value != nil) && (prefix != nil) && (value.length > prefix.length) &&
            (([prefix length] == 0) || [value hasPrefix:prefix])) {
            // the request contains the header we want to replace
            result = [Approov fetchSecureStringAndWait:[value substringFromIndex:prefix.length] :nil];
            status = [result status];
            ApproovLogI(@"substituting header %@: %@", header, [Approov stringFromApproovTokenFetchStatus:status]);
            if (status == ApproovTokenFetchStatusSuccess) {
                // update the header value with the actual secret
                [updatedRequest setValue:[NSString stringWithFormat:@"%@%@", prefix, result.secureString]
                    forHTTPHeaderField:header];
            } else if (status == ApproovTokenFetchStatusRejected) {
                // the attestation has been rejected so provide additional information in the message
                NSString *detail = [NSString stringWithFormat:@"Approov header substitution rejection %@ %@",
                    result.ARC, result.rejectionReasons];
                return [ApproovInterceptorResult createWithRequest:updatedRequest
                    withAction:ApproovInterceptorActionFail withMessage:detail];
            } else if ((status == ApproovTokenFetchStatusNoNetwork) ||
                       (status == ApproovTokenFetchStatusPoorNetwork) ||
                       (status == ApproovTokenFetchStatusMITMDetected)) {
                // we are unable to get the secure string due to network conditions so the request can
                // be retried by the user later - unless overridden
                if (!proceedOnNetworkFail) {
                    NSString *detail = [NSString stringWithFormat:@"Header substitution network error: %@",
                        [Approov stringFromApproovTokenFetchStatus:status]];
                    return [ApproovInterceptorResult createWithRequest:updatedRequest
                        withAction:ApproovInterceptorActionRetry withMessage:detail];
                }
            } else if (status != ApproovTokenFetchStatusUnknownKey) {
                // we have failed to get a secure string with a more serious permanent error
                NSString *detail = [NSString stringWithFormat:@"Header substitution error: %@",
                        [Approov stringFromApproovTokenFetchStatus:status]];
                return [ApproovInterceptorResult createWithRequest:updatedRequest
                        withAction:ApproovInterceptorActionFail withMessage:detail];
            }
        }
    }

    // obtain a copy of the substitution query parameter in a thread safe way
    NSSet<NSString *> *subsQueryParams;
    @synchronized(substitutionQueryParams) {
        subsQueryParams = [[NSSet alloc] initWithSet:substitutionQueryParams copyItems:NO];
    }

    // we now deal with any query parameter substitutions, which may require further fetches but these
    // should be using cached results
    for (NSString *key in subsQueryParams) {
        NSString *pattern = [NSString stringWithFormat:@"[\\?&]%@=([^&;]+)", key];
        NSError *error = nil;
        NSRegularExpression *regex = [NSRegularExpression regularExpressionWithPattern:pattern options:0 error:&error];
        if (error) {
            NSString *detail = [NSString stringWithFormat: @"Approov query parameter substitution regex error: %@",
                [error localizedDescription]];
            return [ApproovInterceptorResult createWithRequest:updatedRequest
                withAction:ApproovInterceptorActionFail withMessage:detail];
        }
        NSTextCheckingResult *match = [regex firstMatchInString:url options:0 range:NSMakeRange(0, [url length])];
        if (match) {
            // the request contains the query parameter we want to replace
            NSString *matchText = [url substringWithRange:[match rangeAtIndex:1]];
            result = [Approov fetchSecureStringAndWait:matchText :nil];
            status = [result status];
            ApproovLogI(@"substituting query parameter %@: %@", key, [Approov stringFromApproovTokenFetchStatus:result.status]);
            if (status == ApproovTokenFetchStatusSuccess) {
                // update the URL with the actual secret
                url = [url stringByReplacingCharactersInRange:[match rangeAtIndex:1] withString:result.secureString];
                [updatedRequest setURL:[NSURL URLWithString:url]];
            } else if (status == ApproovTokenFetchStatusRejected) {
                // the attestation has been rejected so provide additional information in the message
                NSString *detail = [NSString stringWithFormat:@"Approov query parameter substitution rejection %@ %@",
                    result.ARC, result.rejectionReasons];
                return [ApproovInterceptorResult createWithRequest:updatedRequest
                        withAction:ApproovInterceptorActionFail withMessage:detail];
            } else if ((status == ApproovTokenFetchStatusNoNetwork) ||
                       (status == ApproovTokenFetchStatusPoorNetwork) ||
                       (status == ApproovTokenFetchStatusMITMDetected)) {
                // we are unable to get the secure string due to network conditions so the request can
                // be retried by the user later - unless overridden
                if (!proceedOnNetworkFail) {
                    NSString *detail = [NSString stringWithFormat:@"Approov query parameter substitution network error: %@",
                        [Approov stringFromApproovTokenFetchStatus:status]];
                    return [ApproovInterceptorResult createWithRequest:updatedRequest
                        withAction:ApproovInterceptorActionRetry withMessage:detail];
                }
            } else if (status != ApproovTokenFetchStatusUnknownKey) {
                // we have failed to get a secure string with a more serious permanent error
                NSString *detail = [NSString stringWithFormat:@"Approov query parameter substitution error: %@",
                    [Approov stringFromApproovTokenFetchStatus:status]];
                return [ApproovInterceptorResult createWithRequest:updatedRequest
                        withAction:ApproovInterceptorActionFail withMessage:detail];
            }
        }
    }

    // return the updated request
    return [ApproovInterceptorResult createWithRequest:updatedRequest withAction:ApproovInterceptorActionProceed
        withMessage:[Approov stringFromApproovTokenFetchStatus:status]];
}

// Subject Public Key Info (SPKI) headers for public keys' type and size. Only RSA-2048, RSA-4096, EC-256 and EC-384 are supported
NSDictionary<NSString *, NSDictionary<NSNumber *, NSData *> *> *sSPKIHeaders;

/**
 * Initialize the SPKI header constants.
 */
- (void)initializePublicKeyHeaders {
    const unsigned char rsa2048SPKIHeader[] = {
        0x30, 0x82, 0x01, 0x22, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05,
        0x00, 0x03, 0x82, 0x01, 0x0f, 0x00
    };
    const unsigned char rsa3072SPKIHeader[] = {
        0x30, 0x82, 0x01, 0xA2, 0x30, 0x0D, 0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01, 0x05,
        0x00, 0x03, 0x82, 0x01, 0x8F, 0x00
    };
    const unsigned char rsa4096SPKIHeader[] = {
        0x30, 0x82, 0x02, 0x22, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05,
        0x00, 0x03, 0x82, 0x02, 0x0f, 0x00
    };
    const unsigned char ecdsaSecp256r1SPKIHeader[] = {
        0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48,
        0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00
    };
    const unsigned char ecdsaSecp384r1SPKIHeader[] = {
        0x30, 0x76, 0x30, 0x10, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x05, 0x2b, 0x81, 0x04,
        0x00, 0x22, 0x03, 0x62, 0x00
    };
    sSPKIHeaders = @{
        (NSString *)kSecAttrKeyTypeRSA : @{
              @2048 : [NSData dataWithBytes:rsa2048SPKIHeader length:sizeof(rsa2048SPKIHeader)],
              @3072 : [NSData dataWithBytes:rsa3072SPKIHeader length:sizeof(rsa3072SPKIHeader)],
              @4096 : [NSData dataWithBytes:rsa4096SPKIHeader length:sizeof(rsa4096SPKIHeader)]
        },
        (NSString *)kSecAttrKeyTypeECSECPrimeRandom : @{
              @256 : [NSData dataWithBytes:ecdsaSecp256r1SPKIHeader length:sizeof(ecdsaSecp256r1SPKIHeader)],
              @384 : [NSData dataWithBytes:ecdsaSecp384r1SPKIHeader length:sizeof(ecdsaSecp384r1SPKIHeader)]
        }
    };
}

/**
 * Gets the subject public key info (SPKI) header depending on a public key's type and size.
 * 
 * @param publicKey is the public key being analyzed
 * @return NSData* of the coresponding SPKI header that will be used or nil if not supported
 */
- (NSData *)publicKeyInfoHeaderForKey:(SecKeyRef)publicKey {
    CFDictionaryRef publicKeyAttributes = SecKeyCopyAttributes(publicKey);
    NSString *keyType = CFDictionaryGetValue(publicKeyAttributes, kSecAttrKeyType);
    NSNumber *keyLength = CFDictionaryGetValue(publicKeyAttributes, kSecAttrKeySizeInBits);
    NSData *aSPKIHeader = sSPKIHeaders[keyType][keyLength];
    CFRelease(publicKeyAttributes);
    return aSPKIHeader;
}

/**
 * Gets a certificate's Subject Public Key Info (SPKI).
 *
 * @param certificate is the certificate being analyzed
 * @return NSData* of the SPKI certificate information or nil if an error
 */
- (NSData*)publicKeyInfoOfCertificate:(SecCertificateRef)certificate {
    // get the public key from the certificate
    SecKeyRef publicKey = nil;
    if (@available(iOS 12.0, *)) {
        publicKey = SecCertificateCopyKey(certificate);
    } else {
        // from TrustKit https://github.com/datatheorem/TrustKit/blob/master/TrustKit/Pinning/TSKSPKIHashCache.m lines
        // 221-234:
        // Create an X509 trust using the using the certificate
        SecTrustRef trust;
        SecPolicyRef policy = SecPolicyCreateBasicX509();
        OSStatus status = SecTrustCreateWithCertificates(certificate, policy, &trust);
        if (status != errSecSuccess) {
            ApproovLogE(@"SecTrustCreateWithCertificates failed");
            CFRelease(policy);
            CFRelease(trust);
            return nil;
        }
        
        // get a public key reference for the certificate from the trust
        SecTrustResultType result;
        status = SecTrustEvaluate(trust, &result);
        if (status != errSecSuccess) {
            ApproovLogE(@"SecTrustEvaluate failed");
            CFRelease(policy);
            CFRelease(trust);
            return nil;
        }
        publicKey = SecTrustCopyPublicKey(trust);
        CFRelease(policy);
        CFRelease(trust);
    }

    // exit early if no public key was obtained
    if (publicKey == nil) {
        ApproovLogE(@"public key of certificate not obtained");
        return nil;
    }
    
    // get the SPKI header depending on the public key's type and size
    NSData *spkiHeader = [self publicKeyInfoHeaderForKey:publicKey];
    if (spkiHeader == nil) {
        ApproovLogE(@"cannot create SPKI header");
        CFRelease(publicKey);
        return nil;
    }
    
    // combine the public key header and the public key data to form the public key info
    CFDataRef publicKeyData = SecKeyCopyExternalRepresentation(publicKey, nil);
    if (publicKeyData == nil)
        return nil;
    NSMutableData *publicKeyInfo = [NSMutableData dataWithData:spkiHeader];
    [publicKeyInfo appendData:(__bridge NSData * _Nonnull)(publicKeyData)];
    CFRelease(publicKeyData);
    return [NSData dataWithData:publicKeyInfo];
}

/**
 * Verifies pins usings the dynamic certificate public key pins provided by Approov.
 *
 * @param serverTrust provides the trust information extracted from the TLS negotiation
 * @param host is the domain name being connected to
 * @return the trust decision made
 */
- (ApproovTrustDecision)verifyPins:(SecTrustRef)serverTrust forHost:(NSString *)host {
    // check we have a server trust
    if (!serverTrust) {
        ApproovLogE(@"verifyPins check missing server trust");
        return ApproovTrustDecisionBlock;
    }
    
    // check we have a host
    if (!host) {
        ApproovLogE(@"verifyPins check missing host");
        return ApproovTrustDecisionBlock;
    }
    
    // check the validity of the server trust
    SecTrustResultType result;
    OSStatus status = SecTrustEvaluate(serverTrust, &result);
    if (status != errSecSuccess){
        ApproovLogE(@"verifyPins failed server certificate validation");
        return ApproovTrustDecisionBlock;
    } else if ((result != kSecTrustResultUnspecified) && (result != kSecTrustResultProceed)){
        ApproovLogE(@"verifyPins failed server trust validation");
        return ApproovTrustDecisionBlock;
    }

    // if the Approov SDK is not initialized then there are no pins so we proceed
    if (!isInitialized) {
        ApproovLogE(@"verifyPins for %@ called when Approov SDK not initialized", host);
        return ApproovTrustDecisionNotPinned;
    }

    // get the Approov pins for the host domain
    NSDictionary<NSString *, NSArray<NSString *> *> *approovPins = [Approov getPins:@"public-key-sha256"];
    NSArray<NSString *> *pinsForHost = approovPins[host];

    // if there are no pins for the domain (but the host is present) then use any managed trust roots instead
    if ((pinsForHost != nil) && [pinsForHost count] == 0)
        pinsForHost = approovPins[@"*"];

    // if we are not pinning then we consider this level of trust to be acceptable
    if ((pinsForHost == nil) || [pinsForHost count] == 0) {
        ApproovLogD(@"verifyPins host %@ not pinned", host);
        return ApproovTrustDecisionNotPinned;
    }
    
    // get the certificate chain count
    int certCountInChain = (int)SecTrustGetCertificateCount(serverTrust);
    int indexCurrentCert = 0;
    while (indexCurrentCert < certCountInChain) {
        // get the certificate
        SecCertificateRef serverCert = SecTrustGetCertificateAtIndex(serverTrust, indexCurrentCert);
        if (serverCert == nil) {
            ApproovLogE(@"verifyPins check failed to read certificate from chain");
            return ApproovTrustDecisionBlock;
        }

        // get the subject public key info from the certificate - we just ignore the certificate if we
        // cannot obtain this in case it is a certificate type that is not supported but is not pinned
        // to anyway
        NSData* publicKeyInfo = [self publicKeyInfoOfCertificate:serverCert];
        if (publicKeyInfo == nil) {
            ApproovLogE(@"verifyPins check failed creation of public key information");
        } else {
            // compute the SHA-256 hash of the public key info and base64 encode the result
            CC_SHA256_CTX shaCtx;
            CC_SHA256_Init(&shaCtx);
            CC_SHA256_Update(&shaCtx,(void*)[publicKeyInfo bytes],(unsigned)publicKeyInfo.length);
            unsigned char publicKeyHash[CC_SHA256_DIGEST_LENGTH] = {'\0',};
            CC_SHA256_Final(publicKeyHash, &shaCtx);
            NSString *publicKeyHashB64 = [[NSData dataWithBytes:publicKeyHash length:CC_SHA256_DIGEST_LENGTH] base64EncodedStringWithOptions:0];
            
            // match pins on the receivers host
            for (NSString *pinHashB64 in pinsForHost) {
                if ([pinHashB64 isEqualToString:publicKeyHashB64]) {
                    ApproovLogI(@"verifyPins for %@ matched public key pin %@ from %d pins", host, pinHashB64, [pinsForHost count]);
                    return ApproovTrustDecisionAllow;
                }
            }
        }

        // move to the next certificate in the chain
        indexCurrentCert++;
    }

    // the presented public key did not match any of the pins
    ApproovLogE(@"verifyPins for %@ failed to match one of %d pins", host, [pinsForHost count]);
    return ApproovTrustDecisionBlock;
}

@end
