/**
 * WorkoutSessionManager.swift — HKWorkoutSession lifecycle for LockedInFIT Watch.
 *
 * Starts an HKWorkoutSession when the iPhone signals a workout is active and
 * stops it when the workout ends. This solves three critical problems:
 *
 *   1. Keeps the app alive when the wrist drops (prevents watchOS suspension).
 *   2. Shows the green workout dot on the Watch face.
 *   3. Contributes calories to Activity Rings via HKLiveWorkoutBuilder.
 *
 * The session uses .other activity type — we don't track heart rate or specific
 * metrics ourselves, but the session keeps the app foregrounded and lets
 * HealthKit collect background heart rate automatically.
 */

import Combine
import Foundation
import HealthKit

final class WorkoutSessionManager: NSObject, ObservableObject, HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate {

  static let shared = WorkoutSessionManager()

  @Published var isSessionActive = false

  private let healthStore = HKHealthStore()
  private var workoutSession: HKWorkoutSession?
  private var workoutBuilder: HKLiveWorkoutBuilder?

  private override init() {
    super.init()
  }

  // MARK: - Public API

  /// Start an HKWorkoutSession. Safe to call multiple times — no-ops if already active.
  func startWorkoutSession(activityType: HKWorkoutActivityType = .traditionalStrengthTraining) {
    guard HKHealthStore.isHealthDataAvailable() else { return }
    guard workoutSession == nil else { return }

    let config = HKWorkoutConfiguration()
    config.activityType = activityType
    config.locationType = .indoor

    do {
      let session = try HKWorkoutSession(healthStore: healthStore, configuration: config)
      let builder = session.associatedWorkoutBuilder()

      session.delegate = self
      builder.delegate = self
      builder.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: config)

      workoutSession = session
      workoutBuilder = builder

      session.startActivity(with: Date())
      builder.beginCollection(withStart: Date()) { _, _ in }

      DispatchQueue.main.async { self.isSessionActive = true }
    } catch {
      print("[WorkoutSessionManager] Failed to start session: \(error)")
    }
  }

  /// End the HKWorkoutSession and save the workout to HealthKit.
  func stopWorkoutSession() {
    guard let session = workoutSession, let builder = workoutBuilder else { return }

    session.end()
    builder.endCollection(withEnd: Date()) { _, _ in
      builder.finishWorkout { _, _ in }
    }

    workoutSession = nil
    workoutBuilder = nil
    DispatchQueue.main.async { self.isSessionActive = false }
  }

  // MARK: - HKWorkoutSessionDelegate

  func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
    // No additional handling needed — state is tracked via isSessionActive
  }

  func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
    print("[WorkoutSessionManager] Session failed: \(error)")
    DispatchQueue.main.async {
      self.workoutSession = nil
      self.workoutBuilder = nil
      self.isSessionActive = false
    }
  }

  // MARK: - HKLiveWorkoutBuilderDelegate

  func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

  func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {}
}
