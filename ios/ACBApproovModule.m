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

#import "ACBApproovModule.h"
#import "ACBApproovService.h"
#import "ACBURLSessionAdapter.h"
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

    // get the Approov props
    ACBApproovProps *props = [ACBApproovProps sharedProps];

    // start the Approov service
    ACBApproovService *approov = [ACBApproovService startWithProps:props];

    // start the URL adapter using Approov
    [ACBURLSessionAdapter startWithApproovService:approov];

    ACBLogI(@"Native module initialization finished successfully");

    return self;
}

// Native moodules must have at least one bridged method to be recognized
// on the javascript side, so a module description was added.
RCT_EXPORT_METHOD(fetchDescription:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    NSString *msg = @"Approov Native Module for React Native";
    resolve(msg);
}

@end
