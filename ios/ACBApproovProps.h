#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface ACBApproovProps : NSObject

/// Returns the Approov props.
/// @return the shared singleton.
+ (instancetype)sharedProps;

/// Returns the value for the given key.
/// @param key the look up key.
/// @return the corresponding value or nil if none found.
- (NSString *)valueForKey:(NSString *)key;

@end

NS_ASSUME_NONNULL_END
