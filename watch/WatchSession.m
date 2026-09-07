/**
 * WatchSession.m — iPhone-side WatchConnectivity bridge for LockedInFIT.
 * Pure Objective-C implementation (no Swift bridging required).
 *
 * Exposes to React Native:
 *   - sendWorkoutState(state)  — push exercise/set info to Watch
 *   - sendRestStart(seconds)   — tell Watch a rest timer started
 *   - sendRestDone()           — clear Watch rest timer
 *   - sendSessionComplete(opts)— tell Watch all exercises are done
 *   - sendWeightUpdatePrompt() — show weight update prompt on Watch
 *   - endWorkout()             — clear Watch display
 *
 * Emits RN events:
 *   - WatchSetDone, WatchSkipRest, WatchCardioPause, WatchCardioResume,
 *     WatchCardioEnd, WatchEndSession, WatchAdjustWeight, WatchAdjustReps,
 *     WatchSubmitEstimate, WatchUpdateWeights, WatchSkipUpdateWeights,
 *     WatchStartTimer, WatchPedometerUpdate
 */

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <WatchConnectivity/WatchConnectivity.h>

@interface WatchSession : RCTEventEmitter <RCTBridgeModule, WCSessionDelegate>
+ (instancetype)shared;
@end

@implementation WatchSession {
  BOOL _hasListeners;
  /// Cache the last workout_state so applicationContext always has it,
  /// even when transient messages (rest_start, rest_done) are sent after.
  NSDictionary *_lastWorkoutState;
}

RCT_EXPORT_MODULE();

+ (instancetype)shared {
  static WatchSession *instance;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    instance = [WatchSession new];
  });
  return instance;
}

+ (BOOL)requiresMainQueueSetup { return NO; }

- (instancetype)init {
  if (self = [super init]) {
    if ([WCSession isSupported]) {
      WCSession.defaultSession.delegate = self;
      [WCSession.defaultSession activateSession];
    }
  }
  return self;
}

// MARK: - RCTEventEmitter

- (NSArray<NSString *> *)supportedEvents {
  return @[
    @"WatchSetDone", @"WatchSkipRest",
    @"WatchCardioPause", @"WatchCardioResume", @"WatchCardioEnd",
    @"WatchPedometerUpdate", @"WatchEndSession",
    @"WatchAdjustWeight", @"WatchAdjustReps",
    @"WatchSubmitEstimate", @"WatchUpdateWeights", @"WatchSkipUpdateWeights",
    @"WatchStartTimer"
  ];
}

- (void)startObserving { _hasListeners = YES; }
- (void)stopObserving  { _hasListeners = NO; }

// MARK: - JS methods

RCT_EXPORT_METHOD(sendWorkoutState:(NSDictionary *)state) {
  NSMutableDictionary *msg = [state mutableCopy];
  msg[@"type"] = @"workout_state";
  _lastWorkoutState = [msg copy];
  [self pushToWatch:msg useContext:YES];
}

RCT_EXPORT_METHOD(sendRestStart:(double)restTotal) {
  // Transient message — send real-time but do NOT overwrite applicationContext.
  // The context should always hold the latest workout_state so the Watch
  // gets correct exercise/set info when it wakes up.
  [self pushToWatch:@{ @"type": @"rest_start", @"restTotal": @((int)restTotal) } useContext:NO];
}

RCT_EXPORT_METHOD(sendRestDone) {
  [self pushToWatch:@{ @"type": @"rest_done" } useContext:NO];
}

RCT_EXPORT_METHOD(endWorkout) {
  _lastWorkoutState = nil;
  [self pushToWatch:@{ @"type": @"end_workout" } useContext:YES];
}

RCT_EXPORT_METHOD(sendWeightUpdatePrompt) {
  [self pushToWatch:@{ @"type": @"weight_update_prompt" } useContext:NO];
}

RCT_EXPORT_METHOD(sendSessionComplete:(NSDictionary *)options) {
  NSMutableDictionary *msg = [@{ @"type": @"session_complete" } mutableCopy];
  if (options[@"completionLabel"]) {
    msg[@"completionLabel"] = options[@"completionLabel"];
  }
  [self pushToWatch:msg useContext:YES];
}

// MARK: - Internal

- (void)pushToWatch:(NSDictionary *)message useContext:(BOOL)updateCtx {
  if (![WCSession isSupported]) return;
  WCSession *session = WCSession.defaultSession;
  if (!session.isPaired) return;

  if (session.isReachable) {
    [session sendMessage:message replyHandler:nil errorHandler:nil];
  }
  if (updateCtx) {
    NSError *err = nil;
    [session updateApplicationContext:message error:&err];
    if (err) NSLog(@"[WatchSession] updateApplicationContext error: %@", err);
  }
}

// MARK: - WCSessionDelegate

- (void)session:(WCSession *)session
activationDidCompleteWithState:(WCSessionActivationState)activationState
          error:(nullable NSError *)error {}

- (void)sessionDidBecomeInactive:(WCSession *)session {}

- (void)sessionDidDeactivate:(WCSession *)session {
  [WCSession.defaultSession activateSession];
}

// Receive queued user-info transfers (fallback when Watch was not reachable)
- (void)session:(WCSession *)session didReceiveUserInfo:(NSDictionary<NSString *, id> *)userInfo {
  [self session:session didReceiveMessage:userInfo];
}

- (void)session:(WCSession *)session didReceiveMessage:(NSDictionary<NSString *, id> *)message {
  if (!_hasListeners) return;
  NSString *type = message[@"type"];
  if (!type) return;

  dispatch_async(dispatch_get_main_queue(), ^{
    if ([type isEqualToString:@"set_done"]) {
      [self sendEventWithName:@"WatchSetDone" body:nil];
    } else if ([type isEqualToString:@"skip_rest"]) {
      [self sendEventWithName:@"WatchSkipRest" body:nil];
    } else if ([type isEqualToString:@"cardio_pause"]) {
      [self sendEventWithName:@"WatchCardioPause" body:nil];
    } else if ([type isEqualToString:@"cardio_resume"]) {
      [self sendEventWithName:@"WatchCardioResume" body:nil];
    } else if ([type isEqualToString:@"cardio_end"]) {
      [self sendEventWithName:@"WatchCardioEnd" body:nil];
    } else if ([type isEqualToString:@"end_session"]) {
      [self sendEventWithName:@"WatchEndSession" body:nil];
    } else if ([type isEqualToString:@"adjust_weight"]) {
      [self sendEventWithName:@"WatchAdjustWeight" body:@{ @"delta": message[@"delta"] ?: @0 }];
    } else if ([type isEqualToString:@"adjust_reps"]) {
      [self sendEventWithName:@"WatchAdjustReps" body:@{ @"delta": message[@"delta"] ?: @0 }];
    } else if ([type isEqualToString:@"submit_estimate"]) {
      [self sendEventWithName:@"WatchSubmitEstimate" body:@{ @"value": message[@"value"] ?: @"0" }];
    } else if ([type isEqualToString:@"update_weights"]) {
      [self sendEventWithName:@"WatchUpdateWeights" body:nil];
    } else if ([type isEqualToString:@"skip_update_weights"]) {
      [self sendEventWithName:@"WatchSkipUpdateWeights" body:nil];
    } else if ([type isEqualToString:@"start_timer"]) {
      [self sendEventWithName:@"WatchStartTimer" body:nil];
    } else if ([type isEqualToString:@"pedometer_update"]) {
      NSMutableDictionary *body = [@{
        @"distanceKm": message[@"distanceKm"] ?: @0,
        @"steps":      message[@"steps"]      ?: @0,
      } mutableCopy];
      if (message[@"paceSecPerKm"]) {
        body[@"paceSecPerKm"] = message[@"paceSecPerKm"];
      }
      [self sendEventWithName:@"WatchPedometerUpdate" body:body];
    }
  });
}

@end
