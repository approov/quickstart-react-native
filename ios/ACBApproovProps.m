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

#import <Foundation/Foundation.h>
#import "ACBApproovProps.h"
#import "ACBUtils.h"

@interface ACBApproovProps ()

@property NSDictionary<NSString *,NSString *> *props;

@end

@implementation ACBApproovProps

+ (instancetype)sharedProps {
    static ACBApproovProps *sharedProps = nil;
    static dispatch_once_t onceToken = 0;

    dispatch_once(&onceToken, ^{
        sharedProps = [[self alloc] init];
    });
    return sharedProps;
}

NSString *const PropsResource = @"approov";
NSString *const PropsExtension = @"plist";

- (instancetype)init {
    ACBLogD(@"Approov props initializing");
    
    self = [super init];
    if (self == nil) {
        ACBLogE(@"Approov props failed to initialize");
        [NSException raise:@"ApproovPropsInitFailure" format:@"Approov props failed to initialize."];
    }

    // read in props
    NSURL *propsURL = [[NSBundle mainBundle] URLForResource:PropsResource withExtension:PropsExtension];
    if (propsURL) {
        NSError *error = nil;
        if (@available(iOS 11, *)) {
            _props = [NSDictionary<NSString *,NSString *> dictionaryWithContentsOfURL:propsURL error:&error];
        } else {
            _props = [NSDictionary<NSString *,NSString *> dictionaryWithContentsOfURL:propsURL];
            if (_props == nil) error = ACBError(1001, @"Unable to locate Approov props resource");
        }
        if (error) {
            ACBLogE(@"Approov props read failed");
            [NSException raise:@"ApproovPropsReadFailed" format:@"Approov props config read failed: %@. \
             Please make sure you have the plist file '%@.%@' available in your app's root directory.", error, PropsResource, PropsExtension];
        }
    }
    else {
        ACBLogE(@"Approov props not found");
        [NSException raise:@"ApproovPropsNotFound" format:@"Approov props not found: \
         Please make sure you have the plist file '%@.%@' available in your app's root directory.", PropsResource, PropsExtension];
    }
    
    ACBLogI(@"Approov props initialized");

    return self;
}

- (NSString *)valueForKey:(NSString *)key {
    return [_props objectForKey:key];
}

@end
