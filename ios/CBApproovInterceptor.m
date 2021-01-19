#import "CBApproovAttestor.h"
#import "CBApproovSDK.h"
#import "CBUtils.h"

@implementation CBApproovAttestorResult

- (instancetype)init {
    self = [super init];
    if (self) {
        _request = nil;
        _code = 0;
        _message = nil;
    }
    return self;
}

@end

@implementation CBApproovAttestor

- (instancetype)init {
    CBLogD(@"Approov interceptor initializing");

    self = [super init];
    if (self == nil) {
        CBLogE(@"Approov SDK failed to initialize");
        [NSException raise:@"ApproovInterceptorInitFailure" format:@"Approov interceptor failed to initialize"];
    }
    
    return self;
}

- (CBApproovAttestorResult *)interceptRequest:(NSURLRequest *)request {
    CBLogD(@"Intercepting request");

    CBApproovAttestorResult *result = [[CBApproovAttestorResult alloc] init];
    
    // debuuging for now
    NSMutableURLRequest *newRequest = [request mutableCopy];
    [newRequest addValue:@"ApprovToken" forHTTPHeaderField:@"Approov-Token"];

    result.request = newRequest;
    result.code = 0;
    result.message = @"DEBUGGING INTECEPT";
    
    return result;
}

@end
