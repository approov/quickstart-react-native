#import "ACBApproovService.h"
#import "Approov/Approov.h"
#import <CommonCrypto/CommonCrypto.h>

#import "ACBUtils.h"

@implementation ACBAttestationResult

- (instancetype) initWithRequest:(NSURLRequest *)request withAction:(ACBAttestationAction)action withStatus:(NSString *)status {
    self = [super init];
    if (self) {
        _request = request;
        _action = action;
        _status = status;
    }
    return self;
}

+ (instancetype) createWithRequest:(NSURLRequest *)request withAction:(ACBAttestationAction)action withStatus:(NSString *)status {
    return [[self alloc] initWithRequest:request withAction:action withStatus:status];
}

@end

@implementation ACBApproovService {
    ACBApproovProps *_props;
    NSHashTable *_observers;
}

static ACBApproovService *_ACBProxyURLService_sharedService = nil;
static dispatch_once_t _ACBApproovService_onceToken = 0;

+ (instancetype)startWithProps:(ACBApproovProps *)props {
    return [[self alloc] initWithProps:props];
}

- (instancetype)initWithProps:(ACBApproovProps *)props {
    ACBLogI(@"Approov service starting");

    self = [super init];
    if (self == nil) {
        ACBLogE(@"Approov service failed to start");
        [NSException raise:@"ApproovServiceInitFailure" format:@"Approov service failed to start"];
    }

    // save props
    if (!props) {
        ACBLogE(@"Approov service failed to start: no props specified");
        [NSException raise:@"ApproovServiceInitFailure" format:@"Approov service failed to start: no props specified"];
        return nil;
    }
    _props = props;

    // initialize observers
    _observers = [NSHashTable weakObjectsHashTable];

    // initialize pinning headers
    [self initializePKI];

    // initialize the Approov SDK
    [self startApproov];
    
    // start a token prefetch
    [self prefetchToken];
    
    return self;
}

- (void)addObserver:(id<ACBApproovServiceObserver>)observer {
    [_observers addObject:observer];
}

- (void)removeObserver:(id<ACBApproovServiceObserver>)observer {
    [_observers removeObject:observer];
}

NSString *const BaseConfigResource = @"approov";
NSString *const BaseConfigExtension = @"config";
NSString *const UpdateConfigKey = @"approov-config";

- (NSString *)loadBaseConfig {
    NSString *config = nil;

    NSURL *configURL = [[NSBundle mainBundle] URLForResource:BaseConfigResource withExtension:BaseConfigExtension];
    if (configURL) {
        NSError *error = nil;
        config = [NSString stringWithContentsOfURL:configURL encoding:NSASCIIStringEncoding error:&error];
        if (error) {
            ACBLogE(@"Approov base configuration read failed");
            [NSException raise:@"ApproovBaseConfigReadFailed" format:@"Approov base config read failed: %@. \
             Please make sure you have the file '%@.%@' available in your app's root directory.", error, BaseConfigResource, BaseConfigExtension];
        }
    }
    else {
        ACBLogE(@"Approov base configuration not found");
        [NSException raise:@"ApproovBaseConfigNotFound" format:@"Approov base config not found: \
         Please make sure you have the file '%@.%@' available in your app's root directory.", BaseConfigResource, BaseConfigExtension];
    }

    return config;
}

- (NSString *)loadUpdateConfig {
    // load config
    NSString *config = [[NSUserDefaults standardUserDefaults] stringForKey:UpdateConfigKey];
    return config;
}

- (void)storeUpdateConfig:(NSString *)config {
    if (!config) return;

    // store config
    [[NSUserDefaults standardUserDefaults] setObject:config forKey:UpdateConfigKey];
    [[NSUserDefaults standardUserDefaults] synchronize];
}

- (void)updateConfig {
    // fetch latest config
    NSString *config = [Approov fetchConfig];
    if (!config) {
        ACBLogW(@"Approov SDK provided no update config.");
        return;
    }
    
    // store config
    [self storeUpdateConfig:config];
    ACBLogD(@"Approov config updated");

    // notfiy observers
    if (_observers.count > 0) {
        ACBLogD(@"Approov service notifying observers of config update");
        for (id observer in _observers) {
            [observer ApproovService:self updatedConfig:config];
        }
    }
}

- (void)startApproov {
    // load base config
    NSString *baseConfig = [self loadBaseConfig];

    // load update config
    NSString *updateConfig = [self loadUpdateConfig];
    
    // initialize Approov SDK
    NSError *error = nil;
    [Approov initialize:baseConfig updateConfig:updateConfig comment:nil error:&error];
    if (error) {
        ACBLogE(@"Approov SDK failed to initialize: %@", error);
    }
    
    // if no update config (1st app launch), then try again
    if (!updateConfig) {
        [self updateConfig];
    }
}

- (void)prefetchToken {
    ACBLogI(@"Token prefetch started");
    [Approov fetchApproovToken:^(ApproovTokenFetchResult* result) {
        // nothing to do here
    }:@"approov.io"];
}

- (ACBAttestationResult *)attestRequest:(NSURLRequest *)request {
    NSMutableURLRequest *attestedRequest = [request mutableCopy];

    // check host domain
    NSString *host = attestedRequest.URL.host;
    if (!host) {
        ACBLogE(@"Attested request domain was missing or invalid");
        return [ACBAttestationResult createWithRequest:attestedRequest
            withAction:ACBAttestationActionFail
            withStatus:[Approov stringFromApproovTokenFetchStatus:ApproovTokenFetchStatusBadURL]];
    }

    // request an Approov token for the host domain
    ApproovTokenFetchResult* result = [Approov fetchApproovTokenAndWait:host];

    ACBAttestationAction action;
    switch ([result status]) {
        case ApproovTokenFetchStatusSuccess:
        case ApproovTokenFetchStatusNoApproovService:
        case ApproovTokenFetchStatusUnknownURL:
        case ApproovTokenFetchStatusUnprotectedURL: {
            action = ACBAttestationActionProceed;
            break;
        }
        case ApproovTokenFetchStatusNoNetwork:
        case ApproovTokenFetchStatusPoorNetwork:
        case ApproovTokenFetchStatusMITMDetected: {
            action = ACBAttestationActionRetry;
            break;
        }
        case ApproovTokenFetchStatusBadURL:
        case ApproovTokenFetchStatusNotInitialized: {
            action = ACBAttestationActionFail;
            break;
        }
        default: {
            action = ACBAttestationActionFail;
            break;
        }
    }
    NSString *status = [Approov stringFromApproovTokenFetchStatus:[result status]];
    ACBLogD(@"Attestation for domain %@: %@ (%@)", host, result.loggableToken, status);
    
    // @TODO: set attesting props from props plist into properties.
    NSString *TokenName = @"Approov-Token";
    NSString *TokenPrefix= @"";
    NSString *BindingName= @""; //Authorization

    // set binding from header
    if (BindingName.length > 0) {
        NSString *data = [request valueForHTTPHeaderField:BindingName];
        if (data) {
            [Approov setDataHashInToken:data];
        } else {
            ACBLogW(@"Binding header %@ not set in request", BindingName);
            //@TODO: throw error to be consitent with other quickstarts (or hash empty string?
        }
    }

    // decorate request if success
    if ([result status] == ApproovTokenFetchStatusSuccess) {
        NSString *value;
        if (![TokenPrefix isEqualToString:@""]) {
            value = [NSString stringWithFormat:@"%@ %@", TokenPrefix, [result token]];
        } else {
            value = [result token];
        }
        [attestedRequest addValue:value forHTTPHeaderField:TokenName];
        ACBLogD(@"Attested %@: %@", TokenName, result.loggableToken);
    }

    // update config if needed
    if (result.isConfigChanged) {
        ACBLogD(@"***** Config Update Received *****");
        [self updateConfig];
    }

    // return attestation result
    return [ACBAttestationResult createWithRequest:attestedRequest withAction:action withStatus:status];
}

// Subject public key info (SPKI) headers for public keys' type and size. Only RSA-2048, RSA-4096, EC-256 and EC-384 are supported.
NSDictionary<NSString *, NSDictionary<NSNumber *, NSData *> *> *sSPKIHeaders;

- (void)initializePKI {
    const unsigned char rsa2048SPKIHeader[] = {
        0x30, 0x82, 0x01, 0x22, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05,
        0x00, 0x03, 0x82, 0x01, 0x0f, 0x00
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
              @4096 : [NSData dataWithBytes:rsa4096SPKIHeader length:sizeof(rsa4096SPKIHeader)]
        },
        (NSString *)kSecAttrKeyTypeECSECPrimeRandom : @{
              @256 : [NSData dataWithBytes:ecdsaSecp256r1SPKIHeader length:sizeof(ecdsaSecp256r1SPKIHeader)],
              @384 : [NSData dataWithBytes:ecdsaSecp384r1SPKIHeader length:sizeof(ecdsaSecp384r1SPKIHeader)]
        }
    };
}

- (NSData*)publicKeyInfoOfCertificate:(SecCertificateRef)certificate {
    SecKeyRef publicKey = nil;
    
    if (@available(iOS 12.0, *)) {
        publicKey = SecCertificateCopyKey(certificate);
    } else {
        // Fallback on earlier versions
        // from TrustKit https://github.com/datatheorem/TrustKit/blob/master/TrustKit/Pinning/TSKSPKIHashCache.m lines
        // 221-234:
        // Create an X509 trust using the using the certificate
        SecTrustRef trust;
        SecPolicyRef policy = SecPolicyCreateBasicX509();
        SecTrustCreateWithCertificates(certificate, policy, &trust);
        
        // Get a public key reference for the certificate from the trust
        SecTrustResultType result;
        SecTrustEvaluate(trust, &result);
        publicKey = SecTrustCopyPublicKey(trust);
        CFRelease(policy);
        CFRelease(trust);
    }
    if(publicKey == nil) return nil;
    
    // get the SPKI header depending on the public key's type and size
    NSData* spkiHeader = [self publicKeyInfoHeaderForKey:publicKey];
    if(spkiHeader == nil) return nil;
    
    // combine the public key header and the public key data to form the public key info
    CFDataRef publicKeyData = SecKeyCopyExternalRepresentation(publicKey, nil);
    if(publicKeyData == nil) return nil;
    NSMutableData* returnData = [NSMutableData dataWithData:spkiHeader];
    [returnData appendData:(__bridge NSData * _Nonnull)(publicKeyData)];
    CFRelease(publicKeyData);
    return [NSData dataWithData:returnData];
}

// returns the subject public key info (SPKI) header depending on a public key's type and size
- (NSData *)publicKeyInfoHeaderForKey:(SecKeyRef)publicKey {
    // get the SPKI header depending on the key's type and size
    CFDictionaryRef publicKeyAttributes = SecKeyCopyAttributes(publicKey);
    NSString *keyType = CFDictionaryGetValue(publicKeyAttributes, kSecAttrKeyType);
    NSNumber *keyLength = CFDictionaryGetValue(publicKeyAttributes, kSecAttrKeySizeInBits);
    NSData *aSPKIHeader = sSPKIHeaders[keyType][keyLength];
    CFRelease(publicKeyAttributes);
    return aSPKIHeader;
}

- (ACBTrustDecision)verifyServerTrust:(SecTrustRef)serverTrust forHost:(NSString *)host {
    if(!serverTrust) {
        ACBLogE(@"ServerTrust check missing server trust");
        return ACBTrustDecisionBlock;
    }
    
    if(!host) {
        ACBLogE(@"ServerTrust check missing host");
        return ACBTrustDecisionBlock;
    }
    
    // check the validity of the server cert
    SecTrustResultType result;
    OSStatus status = SecTrustEvaluate(serverTrust, &result);
    if(status != errSecSuccess){
        ACBLogE(@"ServerTrust failed server certificate validation");
        return ACBTrustDecisionBlock;
    } else if((result != kSecTrustResultUnspecified) && (result != kSecTrustResultProceed)){
        ACBLogE(@"ServerTrust failed server trust validation");
        return ACBTrustDecisionBlock;
    }
    NSDictionary* pins = [Approov getPins:@"public-key-sha256"];
    // if no pins are defined then we trust the connection
    if (pins == nil) {
        ACBLogD(@"ServerTrust not pinned");
        return ACBTrustDecisionNotPinned;
    }
    
    // get the certificate chain count
    int certCountInChain = (int)SecTrustGetCertificateCount(serverTrust);
    int indexCurrentCert = 0;
    while (indexCurrentCert < certCountInChain) {
        SecCertificateRef serverCert = SecTrustGetCertificateAtIndex(serverTrust, indexCurrentCert);
        if (serverCert == nil) {
            ACBLogE(@"ServerTrust check failed to read certificate from chain");
            return ACBTrustDecisionBlock;
        }
        // get the subject public key info from the certificate
        NSData* publicKeyInfo = [self publicKeyInfoOfCertificate:serverCert];
        if (publicKeyInfo == nil) {
            ACBLogE(@"ServerTrust check failed reading public key information");
            return ACBTrustDecisionBlock;
        }
        
        // compute the SHA-256 hash of the public key info and base64 encode the result
        CC_SHA256_CTX shaCtx;
        CC_SHA256_Init(&shaCtx);
        CC_SHA256_Update(&shaCtx,(void*)[publicKeyInfo bytes],(unsigned)publicKeyInfo.length);
        unsigned char publicKeyHash[CC_SHA256_DIGEST_LENGTH] = {'\0',};
        CC_SHA256_Final(publicKeyHash, &shaCtx);
        // Base64 encode the sha256 hash
        NSString *publicKeyHashBase64 = [[NSData dataWithBytes:publicKeyHash length:CC_SHA256_DIGEST_LENGTH] base64EncodedStringWithOptions:0];
        
        // match pins on the receivers host
        if ([pins objectForKey:host] != nil){
            // We have on or more cert hashes matching the receivers host, compare them
            NSArray<NSString*>* certHashList = [pins objectForKey:host];
            for (NSString* certHash in certHashList) {
                if ([certHash isEqualToString:publicKeyHashBase64]) {
                    ACBLogD(@"ServerTrust check matched a certificate pin");
                    return ACBTrustDecisionAllow;
                }
            }
        }
        indexCurrentCert += 1;
    }

    ACBLogE(@"ServerTrust check failed to match a certificate pin");
    return ACBTrustDecisionBlock;
}

@end
