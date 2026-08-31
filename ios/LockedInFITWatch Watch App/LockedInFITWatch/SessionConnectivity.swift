/**
 * SessionConnectivity.swift — Watch-side WatchConnectivity delegate.
 *
 * Receives workout state from the LockedInFIT iPhone app and exposes it as
 * a published @Observable so SwiftUI views update automatically.
 *
 * Also sends "set_done" and "skip_rest" commands back to the iPhone.
 */

import Foundation
import Combine
import CoreMotion
import HealthKit
import WatchConnectivity
import WatchKit

// MARK: - State model

struct WatchWorkoutState {
  var isActive:            Bool    = false
  var exerciseName:        String  = ""
  var setIndex:            Int     = 0
  var totalSets:           Int     = 0
  var exerciseIndex:       Int     = 0
  var totalExercises:      Int     = 0
  var targetReps:          String  = ""
  var targetWeight:        Double  = 0
  var weightUnit:          String  = "lb"
  var isResting:           Bool    = false
  var restTotal:           Int     = 90
  // All exercises done — show end-session prompt
  var isSessionComplete:   Bool    = false
  // Explicit cardio flag — avoids fragile totalSets == 0 discriminator
  var isCardio:            Bool    = false
  var isWarmUp:            Bool    = false
  var side:                String  = ""    // "L", "R", or "" (bilateral)
  var notes:               String  = ""    // coach cues for current exercise
  // Timed exercise fields (plank, hold, etc.)
  var isTimed:             Bool    = false
  var timerTarget:         Int     = 0     // seconds; 0 = open-ended countup
  var timerStartedAt:      Double  = 0     // unix seconds; 0 = not started yet
  // Cardio-specific fields
  var cardioModality:      String  = ""
  var cardioCalories:      Int     = 0
  var cardioDistanceKm:    Double  = 0
  var cardioIsPaused:      Bool    = false
  // 1RM test: awaiting estimate input from user
  var isAwaitingEstimate:  Bool    = false
  // Custom label for completion button (e.g. "Save to Profile" for 1RM test)
  var completionLabel:     String  = ""
  // Post-save prompt to update plan weights
  var isPromptingWeightUpdate: Bool = false
}

// MARK: - Connectivity

final class SessionConnectivity: NSObject, ObservableObject, WCSessionDelegate {

  static let shared = SessionConnectivity()

  @Published var state = WatchWorkoutState()
  @Published var isReachable: Bool = false

  // Local rest countdown
  @Published var restRemaining: Int = 0
  private var restTimer: Timer?

  // Cardio state: virtualStartAt is @Published so WorkoutView's TimelineView computes
  // elapsed = floor(now - virtualStartAt) without a separate Timer (no jitter, no drift,
  // AOD-safe). cardioElapsedSec holds the whole-second display value when paused.
  // frozenElapsedMs carries the ms-accurate elapsed at the pause instant so resumeCardio()
  // can compute virtualStartAt without losing up to 999 ms of sub-second precision.
  @Published var virtualStartAt: Double = 0    // unix seconds; set by iPhone on every sync
  @Published var cardioElapsedSec: Int = 0     // whole-second display value when paused
  private var frozenElapsedMs: Double = 0      // ms-accurate elapsed at pause (for resume)

  // CMPedometer — real step-based distance for walking/running sessions.
  // Active only when cardioModality supports step counting.
  private let pedometer = CMPedometer()
  private var isPedometerActive = false

  private override init() {
    super.init()
    guard WCSession.isSupported() else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
    isReachable = WCSession.default.isReachable
  }

  // MARK: - Commands to iPhone

  func markSetDone() {
    sendReliable(["type": "set_done"])
  }

  func adjustWeight(delta: Double) {
    sendReliable(["type": "adjust_weight", "delta": delta])
  }

  func adjustReps(delta: Int) {
    sendReliable(["type": "adjust_reps", "delta": delta])
  }

  func skipRest() {
    stopLocalRestTimer()
    state.isResting = false
    sendReliable(["type": "skip_rest"])
  }

  func pauseCardio() {
    // Snapshot ms-accurate elapsed BEFORE flipping state so TimelineView immediately
    // shows the correct frozen value, and resumeCardio() can anchor precisely.
    if virtualStartAt > 0 {
      frozenElapsedMs = max(0, (Date().timeIntervalSince1970 - virtualStartAt) * 1000)
      cardioElapsedSec = Int(frozenElapsedMs / 1000)
    }
    state.cardioIsPaused = true
    send(["type": "cardio_pause"])
  }

  func resumeCardio() {
    state.cardioIsPaused = false
    // Use ms-accurate frozen value so virtualStartAt matches iPhone's anchor precisely.
    // Integer-second rounding (was: Double(cardioElapsedSec)) caused Watch to be up to
    // 1 second out of sync with the iPhone after resume.
    virtualStartAt = Date().timeIntervalSince1970 - frozenElapsedMs / 1000
    send(["type": "cardio_resume"])
  }

  func endCardio() {
    send(["type": "cardio_end"])
  }

  func endSession() {
    sendReliable(["type": "end_session"])
  }

  func submitEstimate(value: String) {
    sendReliable(["type": "submit_estimate", "value": value])
  }

  func updateWeights() {
    sendReliable(["type": "update_weights"])
  }

  func skipUpdateWeights() {
    sendReliable(["type": "skip_update_weights"])
  }

  func startTimer() {
    sendReliable(["type": "start_timer"])
  }

  // Reliable delivery for strength commands (set_done, skip_rest):
  // tries sendMessage first; falls back to transferUserInfo if not reachable.
  // transferUserInfo survives backgrounding and arrives within seconds once
  // the iPhone app is reachable again.
  // NOTE: do NOT use for cardio toggle commands (pause/resume) — transferUserInfo
  // has a queue delay that causes double-toggle if both paths deliver the message.
  private func sendReliable(_ message: [String: Any]) {
    let session = WCSession.default
    if session.isReachable {
      session.sendMessage(message, replyHandler: nil) { _ in
        // sendMessage failed — fall back to queued delivery
        session.transferUserInfo(message)
      }
    } else {
      session.transferUserInfo(message)
    }
  }

  // Real-time only — for cardio toggle commands where duplicate delivery would
  // toggle state back (pause → resume → toggled back to paused).
  private func send(_ message: [String: Any]) {
    guard WCSession.default.isReachable else { return }
    WCSession.default.sendMessage(message, replyHandler: nil, errorHandler: nil)
  }

  // MARK: - Local rest timer

  private func startLocalRestTimer(seconds: Int) {
    stopLocalRestTimer()
    restRemaining = seconds
    restTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
      guard let self else { return }
      if self.restRemaining > 1 {
        self.restRemaining -= 1
      } else {
        self.stopLocalRestTimer()
        self.state.isResting = false
        WKInterfaceDevice.current().play(.success)
      }
    }
  }

  private func stopLocalRestTimer() {
    restTimer?.invalidate()
    restTimer = nil
    restRemaining = 0
  }

  // MARK: - CMPedometer

  /// Start real step-based distance tracking for walking/running modalities.
  /// CMPedometer on the Watch is wrist-based, so it works on treadmills where
  /// the iPhone is stationary on the equipment shelf.
  private func startPedometer(modality: String) {
    let supported = ["walking", "running"].contains(modality)
    guard supported, CMPedometer.isStepCountingAvailable() else { return }
    guard !isPedometerActive else { return }
    isPedometerActive = true

    pedometer.startUpdates(from: Date()) { [weak self] data, error in
      guard let self, let data, error == nil else { return }
      let distanceM  = data.distance?.doubleValue ?? 0
      let distanceKm = distanceM / 1000.0
      let steps      = data.numberOfSteps.intValue

      DispatchQueue.main.async {
        // Update Watch display directly — no need to wait for iPhone round-trip.
        self.state.cardioDistanceKm = distanceKm
      }

      // currentPace is s/m when moving, nil when stationary — convert to s/km.
      // Apple smooths this internally so it won't flutter while standing still.
      var msg: [String: Any] = [
        "type":       "pedometer_update",
        "distanceKm": distanceKm,
        "steps":      steps,
      ]
      if let pace = data.currentPace {
        msg["paceSecPerKm"] = pace.doubleValue * 1000.0
      }
      self.send(msg)
    }
  }

  private func stopPedometer() {
    guard isPedometerActive else { return }
    pedometer.stopUpdates()
    isPedometerActive = false
  }

  // MARK: - WCSessionDelegate

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    DispatchQueue.main.async { self.isReachable = session.isReachable }
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    DispatchQueue.main.async { self.isReachable = session.isReachable }
  }

  // Receive real-time messages when iPhone is reachable
  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    DispatchQueue.main.async { self.handleMessage(message) }
  }

  // Receive context update when Watch wakes up
  func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
    DispatchQueue.main.async { self.handleMessage(context) }
  }

  private func handleMessage(_ message: [String: Any]) {
    guard let type = message["type"] as? String else { return }
    switch type {

    case "workout_state":
      state.isActive           = true
      state.isSessionComplete  = false
      // Start HKWorkoutSession if not already active — keeps app alive on wrist-drop,
      // shows green workout dot, and contributes calories to Activity Rings.
      if !WorkoutSessionManager.shared.isSessionActive {
        let isCardioMsg = (message["isCardio"] as? NSNumber)?.boolValue
                       ?? (message["isCardio"] as? Bool)
                       ?? ((message["totalSets"] as? NSNumber)?.intValue == 0)
        let activityType: HKWorkoutActivityType = isCardioMsg ? .other : .traditionalStrengthTraining
        WorkoutSessionManager.shared.startWorkoutSession(activityType: activityType)
      }
      state.exerciseName  = message["exerciseName"]  as? String ?? state.exerciseName
      state.setIndex      = (message["setIndex"]  as? NSNumber)?.intValue ?? state.setIndex
      state.totalSets     = (message["totalSets"] as? NSNumber)?.intValue ?? state.totalSets
      state.exerciseIndex  = (message["exerciseIndex"]  as? NSNumber)?.intValue ?? state.exerciseIndex
      state.totalExercises = (message["totalExercises"] as? NSNumber)?.intValue ?? state.totalExercises
      state.targetReps    = message["targetReps"]    as? String ?? state.targetReps
      state.targetWeight  = message["targetWeight"]  as? Double ?? state.targetWeight
      state.weightUnit    = message["weightUnit"]    as? String ?? state.weightUnit
      // Timed exercise fields
      state.isTimed        = (message["isTimed"] as? NSNumber)?.boolValue
                          ?? (message["isTimed"] as? Bool)
                          ?? false
      state.timerTarget    = (message["timerTarget"]    as? NSNumber)?.intValue    ?? 0
      state.timerStartedAt = (message["timerStartedAt"] as? NSNumber)?.doubleValue ?? 0
      // Explicit cardio flag — falls back to totalSets == 0 for backward compat
      state.isCardio       = (message["isCardio"] as? NSNumber)?.boolValue
                          ?? (message["isCardio"] as? Bool)
                          ?? (state.totalSets == 0)
      state.isWarmUp       = (message["isWarmUp"] as? NSNumber)?.boolValue
                          ?? (message["isWarmUp"] as? Bool)
                          ?? false
      state.side           = message["side"] as? String ?? ""
      state.notes          = message["notes"] as? String ?? ""
      state.isAwaitingEstimate = (message["isAwaitingEstimate"] as? NSNumber)?.boolValue
                              ?? (message["isAwaitingEstimate"] as? Bool)
                              ?? false
      // isResting is managed solely by rest_start and the local timer.
      // Do NOT clear it here — workout_state now fires after every set completion
      // to update setIndex, and clearing rest here would dismiss the rest timer
      // the moment the set was marked done.
      // Cardio session — elapsed display is driven by TimelineView in the view layer;
      // we update virtualStartAt (running) or cardioElapsedSec (paused) and SwiftUI
      // re-renders automatically.
      if state.isCardio {
        // Store modality and start pedometer on the first workout_state for this session.
        if let mod = message["cardioModality"] as? String, !mod.isEmpty {
          state.cardioModality = mod
          startPedometer(modality: mod)
        }
        if let cal = message["cardioCalories"] as? NSNumber { state.cardioCalories = cal.intValue }
        // Only accept iPhone's distance estimate when the pedometer isn't active.
        // When active, CMPedometer updates state.cardioDistanceKm directly and is
        // more accurate than the MET-based estimate (especially on treadmills).
        if !isPedometerActive {
          if let dist = message["cardioDistanceKm"] as? Double { state.cardioDistanceKm = dist }
        }

        // NSNumber bridge: booleans from JS come as NSNumber, not Swift Bool
        let newPaused = (message["cardioIsPaused"] as? NSNumber)?.boolValue
                     ?? (message["cardioIsPaused"] as? Bool)
                     ?? false

        if newPaused {
          // Paused — store iPhone's authoritative elapsed.
          // Prefer ms-accurate cardioElapsedMs if sent; fall back to integer seconds.
          if let ms = message["cardioElapsedMs"] as? NSNumber {
            frozenElapsedMs = ms.doubleValue
            cardioElapsedSec = Int(frozenElapsedMs / 1000)
          } else if let n = message["cardioElapsedSec"] as? NSNumber {
            cardioElapsedSec = n.intValue
            frozenElapsedMs = Double(n.intValue) * 1000
          }
          state.cardioIsPaused = true
        } else {
          // Running — update anchor; TimelineView computes elapsed = floor(now - virtualStartAt)
          if let vsa = message["cardioVirtualStartAt"] as? Double, vsa > 0 {
            virtualStartAt = vsa
          }
          state.cardioIsPaused = false
        }
      }

    case "rest_start":
      let total = (message["restTotal"] as? NSNumber)?.intValue ?? 90
      state.isResting = true
      state.restTotal = total
      startLocalRestTimer(seconds: total)

    case "rest_done":
      stopLocalRestTimer()
      state.isResting = false

    case "session_complete":
      stopLocalRestTimer()
      state.isResting = false
      state.isSessionComplete = true
      state.isPromptingWeightUpdate = false
      state.completionLabel = message["completionLabel"] as? String ?? ""

    case "weight_update_prompt":
      state.isSessionComplete = false
      state.isPromptingWeightUpdate = true

    case "end_workout":
      stopLocalRestTimer()
      stopPedometer()
      WorkoutSessionManager.shared.stopWorkoutSession()
      virtualStartAt   = 0
      frozenElapsedMs  = 0
      cardioElapsedSec = 0
      state = WatchWorkoutState() // resets all fields including timed ones
    default:
      break
    }
  }
}
