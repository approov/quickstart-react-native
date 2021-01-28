#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// A mock hhtps protocol good for returning status codes and errors..
@interface ACBMockURLProtocol : NSURLProtocol <NSURLSessionDataDelegate>

/// Starts a data task which returns a custom status code.
/// @param session the session starting the task.
/// @param code the status code.
/// @param msg a descriptive message (not useed).
+ (NSURLSessionDataTask *)createMockTaskForSession:(NSURLSession *)session withStatusCode:(NSInteger)code withMessage:(NSString *)msg;


/// Starts a data task which fails the task with a custom error.
/// @param session the session starting the task.
/// @param code the error code.
/// @param msg a descriptive message.
+ (NSURLSessionDataTask *)createMockTaskForSession:(NSURLSession *)session withErrorCode:(NSInteger)code withMessage:(NSString *)msg;

@end

NS_ASSUME_NONNULL_END
