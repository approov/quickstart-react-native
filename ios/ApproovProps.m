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
#import "ApproovProps.h"
#import "ApproovUtils.h"

/// Optional properties specifying behaviors such as prefetch, token headers and binding.
/// These are read from the Approov.plist file in the root project directory.
@interface ApproovProps ()

// dictionary holding the loaded properties
@property NSDictionary<NSString *,NSString *> *props;

@end

@implementation ApproovProps

/**
 * Create the singleton shared properties instance.
 */
+ (instancetype)sharedProps {
    static ApproovProps *sharedProps = nil;
    static dispatch_once_t onceToken = 0;
    dispatch_once(&onceToken, ^{
        sharedProps = [[self alloc] init];
    });
    return sharedProps;
}

// name of the property file and its extension
NSString *const PropsResource = @"approov";
NSString *const PropsExtension = @"plist";

/**
 * Initialize and read the properties which should be present if this is called.
 */
- (instancetype)init {
    // initialize
    self = [super init];
    if (self == nil) {
        ApproovLogE(@"Approov props failed to initialize");
        [NSException raise:@"ApproovPropsInitFailure" format:@"Approov props failed to initialize."];
    }

    // read in properties
    NSURL *propsURL = [[NSBundle mainBundle] URLForResource:PropsResource withExtension:PropsExtension];
    if (propsURL) {
        NSError *error = nil;
        if (@available(iOS 11, *)) {
            _props = [NSDictionary<NSString *,NSString *> dictionaryWithContentsOfURL:propsURL error:&error];
        } else {
            _props = [NSDictionary<NSString *,NSString *> dictionaryWithContentsOfURL:propsURL];
            if (_props == nil)
                error = ApproovError(1001, @"Unable to locate Approov props resource");
        }
        if (error) {
            ApproovLogE(@"reading of properties file from %@ failed: %@", [propsURL absoluteString], [error localizedDescription]);
            [NSException raise:@"ApproovPropsReadFailed" format:@"Approov props config read failed: %@. \
             Please make sure you have the plist file '%@.%@' available in your app's root directory.", error, PropsResource, PropsExtension];
        } else {
            ApproovLogI(@"read properties file from %@", [propsURL absoluteString]);
        }
    }
    else {
        ApproovLogE(@"properties file at %@ not found", [propsURL absoluteString]);
        [NSException raise:@"ApproovPropsNotFound" format:@"Approov props not found: \
         Please make sure you have the plist file '%@.%@' available in your app's root directory.", PropsResource, PropsExtension];
    }
    return self;
}

/**
 * Looks up the property value for the given key.
 *
 * @param key is the key to be lookup up
 * @return the value of the key, or nil if it is not present
 */
- (NSString *)valueForKey:(NSString *)key {
    return [_props objectForKey:key];
}

@end
