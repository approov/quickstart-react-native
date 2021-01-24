#import "CBApproovService.h"
#import "CBURLSessionManager.h"
#import "Approov/Approov.h"
#import <CommonCrypto/CommonCrypto.h>

#import "CBUtils.h"

@implementation CBAttestationResult

- (instancetype) initWithRequest:(NSURLRequest *)request withAction:(CBAttestationAction)action withStatus:(NSString *)status {
    self = [super init];
    if (self) {
        _request = request;
        _action = action;
        _status = status;
    }
    return self;
}

+ (instancetype) createWithRequest:(NSURLRequest *)request withAction:(CBAttestationAction)action withStatus:(NSString *)status {
    return [[self alloc] initWithRequest:request withAction:action withStatus:status];
}

@end

@implementation CBApproovService

- (instancetype)init {
    CBLogI(@"Approov service starting");
    
    // save delegate
    _delegate = nil;

    // initialize pinning headers
    [self initializePKI];

    self = [super init];
    if (self == nil) {
        CBLogE(@"Approov service failed to start");
        [NSException raise:@"ApproovServiceInitFailure" format:@"Approov service failed to start"];
    }

    // start by initializing the Approov SDK
    [self startApproov];
    
    // start a token prefetch
    [self prefetchToken];
    
    return self;
}

+ (instancetype)create {
    return [[self alloc] init];
}


NSString *const BaseConfigResource = @"approov";
NSString *const BaseConfigExtension = @"config";
NSString *const UpdateConfigKey = @"approov-config";

- (NSString *)loadBaseConfig {
    NSString *config = nil;

    NSURL *configURL = [[NSBundle mainBundle] URLForResource:@"approov" withExtension:@"config"];
    if (configURL) {
        NSError *error = nil;
        config = [NSString stringWithContentsOfURL:configURL encoding:NSASCIIStringEncoding error:&error];
        if (error) {
            CBLogE(@"Approov base configuration read failed");
            [NSException raise:@"ApproovBaseConfigReadFailed" format:@"Approov base config read failed: %@. \
             Please make sure you have the file '%@.%@' available in your app's root directory.", error, BaseConfigResource, BaseConfigExtension];
        }
    }
    else {
        CBLogE(@"Approov base configuration not found");
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
        CBLogW(@"Approov SDK provided no update config.");
        return;
    }
    
    // store config
    [self storeUpdateConfig:config];
    CBLogD(@"Approov config updated");

    // notfiy delegate
    if (_delegate) {
        CBLogD(@"Approov service notifying delegate of config update");
        [_delegate ApproovService:self updatedConfig:config];
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
        CBLogE(@"Approov SDK failed to initialize: %@", error);
    }
    
    // if no update config (1st app launch), then try again
    if (!updateConfig) {
        [self updateConfig];
    }
}

- (void)prefetchToken {
    CBLogD(@"Token prefetch started");
    [Approov fetchApproovToken:^(ApproovTokenFetchResult* result) {
        // nothing to do here
    }:@"approov.io"];
}

- (CBAttestationResult *)attestRequest:(NSURLRequest *)request {
    NSMutableURLRequest *attestedRequest = [request mutableCopy];

    // check host domain
    NSString *host = attestedRequest.URL.host;
    if (!host) {
        CBLogE(@"Attested request domain was missing or invalid");
        return [CBAttestationResult createWithRequest:attestedRequest
            withAction:CBAttestationActionFail
            withStatus:[Approov stringFromApproovTokenFetchStatus:ApproovTokenFetchStatusBadURL]];
    }

    // request an Approov token for the host domain
    ApproovTokenFetchResult* result = [Approov fetchApproovTokenAndWait:host];

    CBAttestationAction action;
    switch ([result status]) {
        case ApproovTokenFetchStatusSuccess:
        case ApproovTokenFetchStatusNoApproovService:
        case ApproovTokenFetchStatusUnknownURL:
        case ApproovTokenFetchStatusUnprotectedURL: {
            action = CBAttestationActionProceed;
            break;
        }
        case ApproovTokenFetchStatusNoNetwork:
        case ApproovTokenFetchStatusPoorNetwork:
        case ApproovTokenFetchStatusMITMDetected: {
            action = CBAttestationActionRetry;
            break;
        }
        case ApproovTokenFetchStatusBadURL:
        case ApproovTokenFetchStatusNotInitialized: {
            action = CBAttestationActionFail;
            break;
        }
        default: {
            action = CBAttestationActionFail;
            break;
        }
    }
    NSString *status = [Approov stringFromApproovTokenFetchStatus:[result status]];
    CBLogD(@"Attestation for domain %@: %@ (%@)", host, result.loggableToken, status);
    
    // @TODO: set attesting props from props plist into properties.
    NSString *TokenName = @"Approov-Token";
    NSString *TokenPrefix= @"";
    NSString *BindingName= @""; //Authorization
    NSString *BindingPrefix = @"Bearer";
    NSString *BindingMissingData = @"?!?!?!?!?!?!?!?";

    // set binding from header
    if (![BindingName isEqualToString:@""]) {
        NSString *data = [request valueForHTTPHeaderField:BindingName];
        // @TODO: strip prefix
        if (data) {
            // set data hash
            [Approov setDataHashInToken:data];
        } else {
            // set missiing data hash
            CBLogW(@"Binding header %@ not set in request; using data %@", BindingName, BindingMissingData);
            [Approov setDataHashInToken:BindingMissingData];
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
    }

    // update config if needed
    if (result.isConfigChanged) {
        [self updateConfig];
    }

    // return attestation result
    return [CBAttestationResult createWithRequest:attestedRequest withAction:action withStatus:status];
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

/*
 * gets the subject public key info (SPKI) header depending on a public key's type and size
 */
- (NSData *)publicKeyInfoHeaderForKey:(SecKeyRef)publicKey {
    // get the SPKI header depending on the key's type and size
    CFDictionaryRef publicKeyAttributes = SecKeyCopyAttributes(publicKey);
    NSString *keyType = CFDictionaryGetValue(publicKeyAttributes, kSecAttrKeyType);
    NSNumber *keyLength = CFDictionaryGetValue(publicKeyAttributes, kSecAttrKeySizeInBits);
    NSData *aSPKIHeader = sSPKIHeaders[keyType][keyLength];
    CFRelease(publicKeyAttributes);
    return aSPKIHeader;
}


- (NSError *)verifyTrust:(SecTrustRef)serverTrust forDomain:(NSString *)host {
    NSError *verified = nil; // return no error to indicate success

    if(!serverTrust) return CBError(1100, @"CertPin: no server trust");
    if(!host) return CBError(1105, @"CertPin: no host specified");

    // check the validity of the server cert
    SecTrustResultType result;
    OSStatus status = SecTrustEvaluate(serverTrust, &result);
    if(status != errSecSuccess){
        // Set error message and return
        return CBError(1101, @"CertPin: server certificate validation failed");
    } else if((result != kSecTrustResultUnspecified) && (result != kSecTrustResultProceed)){
        // Set error message and return
        return CBError(1102, @"CertPin: server trust evaluation failed");
    }
    NSDictionary* pins = [Approov getPins:@"public-key-sha256"];
    // if no pins are defined then we trust the connection
    if (pins == nil) {
        return verified;
    }
    
    // get the certificate chain count
    int certCountInChain = (int)SecTrustGetCertificateCount(serverTrust);
    int indexCurrentCert = 0;
    while(indexCurrentCert < certCountInChain) {
        SecCertificateRef serverCert = SecTrustGetCertificateAtIndex(serverTrust, indexCurrentCert);
        if(serverCert == nil) {
            // Set error message and return
            return CBError(1103, @"CertPin: failed to read certificate from chain");
        }
        // get the subject public key info from the certificate
        NSData* publicKeyInfo = [self publicKeyInfoOfCertificate:serverCert];
        if(publicKeyInfo == nil){
            // Set error message and return
            return CBError(1104, @"CertPin: failed reading public key information");
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
        if([pins objectForKey:host] != nil){
            // We have on or more cert hashes matching the receivers host, compare them
            NSArray<NSString*>* certHashList = [pins objectForKey:host];
            for (NSString* certHash in certHashList){
                if([certHash isEqualToString:publicKeyHashBase64]) return verified;
            }
        }
        indexCurrentCert += 1;
    }

    return CBError(1106, @"CertPin: certificate match not found");
}


@end
