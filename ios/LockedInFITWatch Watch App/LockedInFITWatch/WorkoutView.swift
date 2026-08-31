/**
 * WorkoutView.swift — Main Apple Watch UI for LockedInFIT.
 *
 * Eight states, evaluated in priority order:
 *   1. idle               → !isActive — "Start a session in LockedInFIT" prompt
 *   2. weight update      → isPromptingWeightUpdate — "Update Plan Weights?" prompt
 *   3. session complete   → isSessionComplete — "Workout Complete!" with end button
 *   4. resting            → isResting — Rest countdown with "Skip" button
 *   5. estimate input     → isAwaitingEstimate — Number pad for 1RM estimate entry
 *   6. cardio             → isCardio — Elapsed timer, pause/resume/end controls
 *   7. timed set          → isTimed — Countdown/countup ring with Done button
 *   8. standard set       → (else) — Exercise name, weight x reps, "Done" button
 */

import SwiftUI
import WatchKit

// MARK: - Brand colors (matching iPhone #00875A theme)

extension Color {
  /// Primary brand green — matches iPhone's #00875A.
  static let lockedInGreen   = Color(red: 0,     green: 0x87 / 255.0, blue: 0x5A / 255.0)
  /// Rest timer — matches iPhone's #FF375F.
  static let lockedInRest    = Color(red: 1.0,    green: 0.216,        blue: 0.373)
  /// Danger/destructive — matches iPhone's #F85149.
  static let lockedInDanger  = Color(red: 0.973,  green: 0.318,        blue: 0.286)
  /// Calorie metric — matches iPhone's #FF9F0A.
  static let lockedInCalorie = Color(red: 1.0,    green: 0.624,        blue: 0.039)
  /// Distance metric — matches iPhone's #64D2FF.
  static let lockedInDist    = Color(red: 0.392,  green: 0.824,        blue: 1.0)
}

// MARK: - Shared helpers

private func formatTime(_ s: Int) -> String {
  if s >= 3600 {
    return String(format: "%d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60)
  }
  return String(format: "%d:%02d", s / 60, s % 60)
}

private func formatWeight(_ w: Double) -> String {
  if w.isNaN || w.isInfinite { return "\u{2014}" }
  return w.truncatingRemainder(dividingBy: 1) == 0
    ? String(Int(w))
    : String(format: "%.1f", w)
}

/// Parse leading integer from a string like "8", "8-10", "AMRAP".
private func parseLeadingInt(_ s: String) -> Int? {
  let digits = s.prefix(while: { $0.isNumber })
  return digits.isEmpty ? nil : Int(digits)
}

// MARK: - Shared sub-components

/// Progress badge row: "W/U  L  Set 2/4"
private struct ProgressBadgeRow: View {
  var isWarmUp: Bool = false
  var side: String = ""
  let setIndex: Int
  let totalSets: Int

  var body: some View {
    HStack(spacing: 4) {
      if isWarmUp {
        Text("W/U")
          .font(.system(size: 11, weight: .bold))
          .foregroundColor(.orange)
      }
      if !side.isEmpty {
        Text(side)
          .font(.system(size: 11, weight: .bold))
          .foregroundColor(.lockedInDist)
      }
      Text("Set \(setIndex + 1)/\(totalSets)")
        .font(.system(size: 11))
        .foregroundColor(.secondary)
    }
  }
}

// MARK: - Number Pad (full-screen sheet for weight/reps entry)

private struct NumberPadView: View {
  let title: String
  let unit: String
  let initialValue: String
  let allowDecimal: Bool
  let onConfirm: (String) -> Void

  @Environment(\.dismiss) private var dismiss
  @State private var input: String = ""

  var body: some View {
    ScrollView {
      VStack(spacing: 4) {
        Text(title)
          .font(.system(size: 11, weight: .semibold))
          .foregroundColor(.secondary)

        HStack(spacing: 2) {
          Text(input.isEmpty ? "0" : input)
            .font(.system(size: 28, weight: .bold, design: .monospaced))
            .foregroundColor(.lockedInGreen)
          if !unit.isEmpty {
            Text(unit)
              .font(.system(size: 13, weight: .medium))
              .foregroundColor(.secondary)
              .padding(.top, 6)
          }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 2)

        numberGrid(allowDecimal: allowDecimal, input: $input)

        Button(action: {
          WKInterfaceDevice.current().play(.click)
          onConfirm(input.isEmpty ? "0" : input)
          dismiss()
        }) {
          Label("Confirm", systemImage: "checkmark")
            .font(.system(size: 14, weight: .bold))
            .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(.lockedInGreen)
      }
      .padding(.horizontal, 4)
    }
    .onAppear {
      input = (initialValue == "0") ? "" : initialValue
    }
  }
}

// MARK: - Inline Number Pad (embedded directly in a view, not a sheet)

private struct InlineNumberPadView: View {
  let title: String
  let subtitle: String
  let unit: String
  let allowDecimal: Bool
  let onConfirm: (String) -> Void

  @State private var input: String = ""

  var body: some View {
    ScrollView {
      VStack(spacing: 4) {
        Text(title)
          .font(.system(size: 14, weight: .bold))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
          .frame(maxWidth: .infinity)

        Text(subtitle)
          .font(.system(size: 11))
          .foregroundColor(.secondary)

        HStack(spacing: 2) {
          Text(input.isEmpty ? "0" : input)
            .font(.system(size: 26, weight: .bold, design: .monospaced))
            .foregroundColor(.lockedInGreen)
          if !unit.isEmpty {
            Text(unit)
              .font(.system(size: 12, weight: .medium))
              .foregroundColor(.secondary)
              .padding(.top, 5)
          }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 2)

        numberGrid(allowDecimal: allowDecimal, input: $input)

        Button(action: {
          guard !input.isEmpty, input != "0" else { return }
          WKInterfaceDevice.current().play(.success)
          onConfirm(input)
        }) {
          Label("Generate Sets", systemImage: "arrow.right")
            .font(.system(size: 14, weight: .bold))
            .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(.lockedInGreen)
        .disabled(input.isEmpty || input == "0")
      }
      .padding(.horizontal, 4)
    }
  }
}

/// Shared 3x4 number grid used by both NumberPadView and InlineNumberPadView.
private func numberGrid(allowDecimal: Bool, input: Binding<String>) -> some View {
  LazyVGrid(
    columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 3),
    spacing: 4
  ) {
    ForEach(1...9, id: \.self) { n in
      digitButton(String(n), input: input)
    }
    if allowDecimal {
      digitButton(".", input: input)
    } else {
      Color.clear.frame(height: 36)
    }
    digitButton("0", input: input)
    Button(action: { if !input.wrappedValue.isEmpty { input.wrappedValue.removeLast() } }) {
      Image(systemName: "delete.left")
        .font(.system(size: 14, weight: .semibold))
        .frame(maxWidth: .infinity, minHeight: 36)
    }
    .buttonStyle(.bordered)
    .tint(.secondary)
  }
}

private func digitButton(_ label: String, input: Binding<String>) -> some View {
  Button(action: {
    if label == "." {
      if input.wrappedValue.contains(".") { return }
      if input.wrappedValue.isEmpty { input.wrappedValue = "0" }
    }
    input.wrappedValue += label
  }) {
    Text(label)
      .font(.system(size: 16, weight: .semibold))
      .frame(maxWidth: .infinity, minHeight: 36)
  }
  .buttonStyle(.bordered)
}

// MARK: - Root view

struct WorkoutView: View {
  @EnvironmentObject var connectivity: SessionConnectivity

  var body: some View {
    let ws = connectivity.state
    Group {
      if !ws.isActive {
        IdleView()
      } else if ws.isPromptingWeightUpdate {
        WeightUpdatePromptView(
          onUpdate: {
            WKInterfaceDevice.current().play(.success)
            connectivity.updateWeights()
          },
          onSkip: {
            connectivity.skipUpdateWeights()
          }
        )
      } else if ws.isSessionComplete {
        SessionCompleteView(
          buttonLabel: ws.completionLabel.isEmpty ? nil : ws.completionLabel,
          onEnd: {
            WKInterfaceDevice.current().play(.success)
            connectivity.endSession()
          }
        )
      } else if ws.isResting {
        RestView(
          restRemaining: connectivity.restRemaining,
          restTotal: ws.restTotal,
          exerciseName: ws.exerciseName,
          targetWeight: ws.targetWeight,
          weightUnit: ws.weightUnit,
          targetReps: ws.targetReps,
          onSkip: { connectivity.skipRest() }
        )
      } else if ws.isAwaitingEstimate {
        InlineNumberPadView(
          title: ws.exerciseName,
          subtitle: "Enter estimated 1RM",
          unit: ws.weightUnit,
          allowDecimal: true,
          onConfirm: { value in
            connectivity.submitEstimate(value: value)
          }
        )
      } else if ws.isCardio {
        TimelineView(.periodic(from: .distantPast, by: 1.0)) { _ in
          let elapsed: Int = ws.cardioIsPaused
            ? connectivity.cardioElapsedSec
            : max(0, Int(Date().timeIntervalSince1970 - connectivity.virtualStartAt))
          CardioView(
            exerciseName: ws.exerciseName,
            elapsedSec: elapsed,
            calories: ws.cardioCalories,
            distanceKm: ws.cardioDistanceKm > 0 ? ws.cardioDistanceKm : nil,
            isPaused: ws.cardioIsPaused,
            onPause:  { connectivity.pauseCardio() },
            onResume: { connectivity.resumeCardio() },
            onEnd:    { connectivity.endCardio() }
          )
        }
      } else if ws.isTimed {
        if ws.timerStartedAt > 0 {
          TimelineView(.periodic(from: .distantPast, by: 1.0)) { context in
            let elapsed = Int(max(0, context.date.timeIntervalSince1970 - ws.timerStartedAt))
            TimedSetView(
              exerciseName: ws.exerciseName,
              setIndex: ws.setIndex,
              totalSets: ws.totalSets,
              side: ws.side,
              timerTarget: ws.timerTarget,
              elapsed: elapsed,
              isWaiting: false,
              onStart: {},
              onDone: {
                WKInterfaceDevice.current().play(.success)
                connectivity.markSetDone()
              }
            )
          }
        } else {
          TimedSetView(
            exerciseName: ws.exerciseName,
            setIndex: ws.setIndex,
            totalSets: ws.totalSets,
            side: ws.side,
            timerTarget: ws.timerTarget,
            elapsed: 0,
            isWaiting: true,
            onStart: {
              WKInterfaceDevice.current().play(.click)
              connectivity.startTimer()
            },
            onDone: {
              WKInterfaceDevice.current().play(.success)
              connectivity.markSetDone()
            }
          )
        }
      } else {
        SetView(
          exerciseName: ws.exerciseName,
          setIndex: ws.setIndex,
          totalSets: ws.totalSets,
          isWarmUp: ws.isWarmUp,
          side: ws.side,
          targetReps: ws.targetReps,
          targetWeight: ws.targetWeight,
          weightUnit: ws.weightUnit,
          onDone: {
            WKInterfaceDevice.current().play(.success)
            connectivity.markSetDone()
          },
          onAdjustWeight: { delta in
            WKInterfaceDevice.current().play(.click)
            connectivity.adjustWeight(delta: delta)
          },
          onAdjustReps: { delta in
            WKInterfaceDevice.current().play(.click)
            connectivity.adjustReps(delta: delta)
          }
        )
      }
    }
    .transition(.opacity)
    .animation(.easeInOut(duration: 0.2), value: ws.isActive)
    .animation(.easeInOut(duration: 0.2), value: ws.isResting)
    .animation(.easeInOut(duration: 0.2), value: ws.isSessionComplete)
  }
}

// MARK: - Idle

private struct IdleView: View {
  var body: some View {
    VStack(spacing: 8) {
      Spacer()

      Image("locke_encouraging")
        .resizable()
        .scaledToFit()
        .frame(width: 90, height: 90)
        .accessibilityHidden(true)

      Text("Start a session\nin LockedInFIT")
        .font(.system(size: 14, weight: .medium))
        .multilineTextAlignment(.center)
        .foregroundColor(.secondary)

      Spacer()
    }
    .padding()
    .accessibilityElement(children: .combine)
    .accessibilityLabel("No active session. Start a workout in LockedInFIT on your iPhone.")
  }
}

// MARK: - Active set

private struct SetView: View {
  let exerciseName: String
  let setIndex: Int
  let totalSets: Int
  let isWarmUp: Bool
  let side: String
  let targetReps: String
  let targetWeight: Double
  let weightUnit: String
  let onDone: () -> Void
  let onAdjustWeight: (Double) -> Void
  let onAdjustReps: (Int) -> Void

  @State private var showWeightPad = false
  @State private var showRepsPad = false

  var body: some View {
    VStack(spacing: 6) {
      // Exercise name — hero element
      Text(exerciseName)
        .font(.system(size: 17, weight: .bold))
        .multilineTextAlignment(.center)
        .lineLimit(2)
        .minimumScaleFactor(0.7)
        .frame(maxWidth: .infinity)

      // Progress badges
      ProgressBadgeRow(
        isWarmUp: isWarmUp,
        side: side,
        setIndex: setIndex,
        totalSets: totalSets
      )

      // Weight + Reps side by side
      HStack(spacing: 8) {
        // Weight cell
        Button(action: { showWeightPad = true }) {
          VStack(spacing: 2) {
            if targetWeight > 0 {
              Text(formatWeight(targetWeight))
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .monospacedDigit()
              Text(weightUnit)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.secondary)
            } else {
              Text("BW")
                .font(.system(size: 17, weight: .semibold))
            }
          }
          .frame(maxWidth: .infinity, minHeight: 48)
          .background(
            RoundedRectangle(cornerRadius: 10)
              .stroke(Color.lockedInGreen.opacity(0.8), lineWidth: 2)
          )
        }
        .buttonStyle(.plain)
        .foregroundColor(.primary)
        .accessibilityLabel(targetWeight > 0 ? "\(formatWeight(targetWeight)) \(weightUnit). Tap to change." : "Bodyweight. Tap to add weight.")

        // Reps cell
        Button(action: { showRepsPad = true }) {
          VStack(spacing: 2) {
            Text(targetReps)
              .font(.system(size: 18, weight: .bold, design: .rounded))
            Text("reps")
              .font(.system(size: 11, weight: .medium))
              .foregroundColor(.secondary)
          }
          .frame(maxWidth: .infinity, minHeight: 48)
          .background(
            RoundedRectangle(cornerRadius: 10)
              .stroke(Color.lockedInGreen.opacity(0.8), lineWidth: 2)
          )
        }
        .buttonStyle(.plain)
        .foregroundColor(.primary)
        .accessibilityLabel("\(targetReps) reps. Tap to change.")
      }

      // Done button
      Button(action: onDone) {
        Label("Done", systemImage: "checkmark")
          .font(.system(size: 14, weight: .bold))
          .frame(maxWidth: .infinity, minHeight: 44)
      }
      .buttonStyle(.borderedProminent)
      .tint(.lockedInGreen)
      .accessibilityLabel("Complete set")
    }
    .padding(.horizontal, 6)
    .sheet(isPresented: $showWeightPad) {
      NumberPadView(
        title: "Weight",
        unit: weightUnit,
        initialValue: formatWeight(targetWeight),
        allowDecimal: true,
        onConfirm: { entered in
          guard let newWeight = Double(entered) else { return }
          let delta = newWeight - targetWeight
          if delta != 0 { onAdjustWeight(delta) }
        }
      )
    }
    .sheet(isPresented: $showRepsPad) {
      let currentReps = parseLeadingInt(targetReps) ?? 0
      let isRange = targetReps.contains("-") || targetReps.contains(where: { !$0.isNumber })
      NumberPadView(
        title: "Reps",
        unit: "",
        initialValue: currentReps > 0 ? String(currentReps) : "",
        allowDecimal: false,
        onConfirm: { entered in
          guard let newReps = Int(entered) else { return }
          let delta = newReps - currentReps
          if delta != 0 || isRange { onAdjustReps(delta) }
        }
      )
    }
  }
}

// MARK: - Cardio session

private struct CardioView: View {
  let exerciseName: String
  let elapsedSec: Int
  let calories: Int
  let distanceKm: Double?
  let isPaused: Bool
  let onPause:  () -> Void
  let onResume: () -> Void
  let onEnd:    () -> Void

  @State private var pendingCommand = false
  @State private var showEndConfirmation = false

  var body: some View {
    VStack(spacing: 6) {
      // Exercise name
      Text(exerciseName)
        .font(.system(size: 14, weight: .semibold))
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .frame(maxWidth: .infinity)

      // Elapsed time — hero
      Text(formatTime(elapsedSec))
        .font(.system(size: 32, weight: .bold, design: .monospaced))
        .foregroundColor(isPaused ? Color.secondary : Color.lockedInGreen)
        .monospacedDigit()
        .accessibilityLabel("Elapsed time: \(formatTime(elapsedSec))")

      if isPaused {
        Text("PAUSED")
          .font(.system(size: 11, weight: .bold))
          .foregroundColor(.lockedInGreen)
          .tracking(2)
          .transition(.opacity)
      }

      // Calories + distance row
      HStack(spacing: 0) {
        VStack(spacing: 1) {
          Text("\(calories)")
            .font(.system(size: 14, weight: .bold))
            .foregroundColor(.lockedInCalorie)
          Text("CAL")
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)

        if let dist = distanceKm {
          Divider()
            .frame(height: 24)
            .background(Color.secondary.opacity(0.3))

          VStack(spacing: 1) {
            Text(String(format: "%.2f", dist))
              .font(.system(size: 14, weight: .bold))
              .foregroundColor(.lockedInDist)
            Text("KM")
              .font(.system(size: 11, weight: .semibold))
              .foregroundColor(.secondary)
          }
          .frame(maxWidth: .infinity)
        }
      }
      .padding(.vertical, 6)
      .background(Color.gray.opacity(0.2))
      .cornerRadius(8)

      // Controls — vertical layout when paused for larger tap targets
      if isPaused {
        VStack(spacing: 6) {
          Button(action: {
            guard !pendingCommand else { return }
            pendingCommand = true
            onResume()
          }) {
            Label("Resume", systemImage: "play.fill")
              .font(.system(size: 14, weight: .semibold))
              .frame(maxWidth: .infinity, minHeight: 44)
          }
          .buttonStyle(.borderedProminent)
          .tint(.lockedInGreen)
          .disabled(pendingCommand)

          Button(action: { showEndConfirmation = true }) {
            Label("End", systemImage: "stop.fill")
              .font(.system(size: 14, weight: .semibold))
              .frame(maxWidth: .infinity, minHeight: 44)
          }
          .buttonStyle(.borderedProminent)
          .tint(.lockedInDanger)
          .confirmationDialog("End Session?", isPresented: $showEndConfirmation, titleVisibility: .visible) {
            Button("End Session", role: .destructive, action: onEnd)
            Button("Cancel", role: .cancel) {}
          }
        }
      } else {
        Button(action: {
          guard !pendingCommand else { return }
          pendingCommand = true
          onPause()
        }) {
          Label("Pause", systemImage: "pause.fill")
            .font(.system(size: 14, weight: .semibold))
            .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(.lockedInGreen)
        .disabled(pendingCommand)
      }
    }
    .padding(.horizontal, 6)
    .onChange(of: isPaused) { _ in pendingCommand = false }
    .onChange(of: pendingCommand) { newValue in
      guard newValue else { return }
      DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
        pendingCommand = false
      }
    }
  }
}

// MARK: - Weight update prompt

private struct WeightUpdatePromptView: View {
  let onUpdate: () -> Void
  let onSkip: () -> Void

  var body: some View {
    VStack(spacing: 8) {
      Image(systemName: "scalemass.fill")
        .font(.system(size: 32))
        .foregroundColor(.lockedInGreen)
        .accessibilityHidden(true)

      Text("Update Plan\nWeights?")
        .font(.system(size: 17, weight: .bold))
        .multilineTextAlignment(.center)

      Text("Use your new 1RM data")
        .font(.system(size: 12))
        .foregroundColor(.secondary)

      Button(action: onUpdate) {
        Label("Update", systemImage: "arrow.triangle.2.circlepath")
          .font(.system(size: 14, weight: .semibold))
          .frame(maxWidth: .infinity, minHeight: 44)
      }
      .buttonStyle(.borderedProminent)
      .tint(.lockedInGreen)

      Button(action: onSkip) {
        Text("Skip")
          .font(.system(size: 14, weight: .medium))
          .frame(maxWidth: .infinity, minHeight: 44)
      }
      .buttonStyle(.bordered)
      .tint(.secondary)
    }
    .padding(.horizontal, 6)
  }
}

// MARK: - Session complete

private struct SessionCompleteView: View {
  var buttonLabel: String? = nil
  let onEnd: () -> Void
  @State private var appeared = false

  var body: some View {
    VStack(spacing: 10) {
      Image(systemName: "checkmark.circle.fill")
        .font(.system(size: 36))
        .foregroundColor(.lockedInGreen)
        .scaleEffect(appeared ? 1.0 : 0.5)
        .opacity(appeared ? 1.0 : 0)
        .accessibilityHidden(true)

      Text("Workout Complete!")
        .font(.system(size: 17, weight: .bold))

      Button(action: onEnd) {
        Label(
          buttonLabel ?? "End Session",
          systemImage: buttonLabel != nil ? "square.and.arrow.down" : "checkmark.circle"
        )
          .font(.system(size: 14, weight: .semibold))
          .frame(maxWidth: .infinity, minHeight: 44)
      }
      .buttonStyle(.borderedProminent)
      .tint(.lockedInGreen)
      .accessibilityLabel(buttonLabel ?? "End session and save workout")
    }
    .padding(.horizontal, 6)
    .onAppear {
      WKInterfaceDevice.current().play(.notification)
      withAnimation(.spring(response: 0.4, dampingFraction: 0.6)) {
        appeared = true
      }
    }
  }
}

// MARK: - Timed set (plank, hold, etc.)

private struct TimedSetView: View {
  let exerciseName: String
  let setIndex: Int
  let totalSets: Int
  let side: String
  let timerTarget: Int
  let elapsed: Int
  let isWaiting: Bool
  let onStart: () -> Void
  let onDone: () -> Void

  @State private var lastHapticAt: Int = -1
  @State private var didAutoComplete = false

  var body: some View {
    let isCountup    = timerTarget == 0
    let displaySecs  = isCountup ? elapsed : max(0, timerTarget - elapsed)
    let isUrgent     = !isCountup && displaySecs <= 3 && elapsed > 0

    VStack(spacing: 6) {
      // Exercise name — hero
      Text(exerciseName)
        .font(.system(size: 17, weight: .bold))
        .multilineTextAlignment(.center)
        .lineLimit(2)
        .minimumScaleFactor(0.7)
        .frame(maxWidth: .infinity)

      // Progress badges
      ProgressBadgeRow(side: side, setIndex: setIndex, totalSets: totalSets)

      Spacer()

      if isWaiting {
        // Pre-start state
        if timerTarget > 0 {
          Text(formatTime(timerTarget))
            .font(.system(size: 36, weight: .bold, design: .monospaced))
            .monospacedDigit()
            .foregroundColor(.secondary)
        }

        Button(action: {
          WKInterfaceDevice.current().play(.click)
          onStart()
        }) {
          Label("Start", systemImage: "play.fill")
            .font(.system(size: 14, weight: .bold))
            .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(.lockedInGreen)
        .accessibilityLabel("Tap to start timer")
      } else {
        // Running state
        if !isCountup {
          Text("HOLD")
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(.secondary)
            .tracking(3)
        }

        Text(formatTime(displaySecs))
          .font(.system(size: 44, weight: .bold, design: .monospaced))
          .foregroundColor(isUrgent ? Color.lockedInDanger : Color.lockedInGreen)
          .monospacedDigit()
          .accessibilityLabel("Timer: \(formatTime(displaySecs))")

        Spacer()

        Button(action: onDone) {
          Label(
            isCountup ? "Stop" : "Done",
            systemImage: isCountup ? "stop.fill" : "checkmark"
          )
            .font(.system(size: 14, weight: .bold))
            .frame(maxWidth: .infinity, minHeight: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(.lockedInGreen)
      }

      Spacer()
    }
    .padding(.horizontal, 6)
    .onAppear {
      didAutoComplete = false
      lastHapticAt = -1
    }
    .onChange(of: elapsed) { newElapsed in
      guard !isCountup, timerTarget > 0 else { return }
      let remaining = max(0, timerTarget - newElapsed)

      if remaining <= 3 && remaining > 0 && remaining != lastHapticAt {
        lastHapticAt = remaining
        WKInterfaceDevice.current().play(.click)
      }

      if newElapsed >= timerTarget && !didAutoComplete {
        didAutoComplete = true
        WKInterfaceDevice.current().play(.notification)
        onDone()
      }
    }
  }
}

// MARK: - Rest timer

private struct RestView: View {
  let restRemaining: Int
  let restTotal: Int
  let exerciseName: String
  let targetWeight: Double
  let weightUnit: String
  let targetReps: String
  let onSkip: () -> Void

  @State private var lastHapticAt: Int = -1

  private var isUrgent: Bool {
    restRemaining <= 3 && restRemaining > 0
  }

  var body: some View {
    VStack(spacing: 6) {
      Spacer()

      // "REST" label
      Text("REST")
        .font(.system(size: 12, weight: .semibold))
        .foregroundColor(.lockedInRest)
        .tracking(3)

      // Countdown — hero
      Text(formatTime(restRemaining))
        .font(.system(size: 44, weight: .bold, design: .monospaced))
        .monospacedDigit()
        .foregroundColor(isUrgent ? Color.lockedInDanger : Color.lockedInGreen)
        .accessibilityLabel("Rest remaining: \(formatTime(restRemaining))")

      // Next set preview
      Text("Next: \(exerciseName)")
        .font(.system(size: 12, weight: .medium))
        .foregroundColor(.secondary)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .frame(maxWidth: .infinity)

      Spacer()

      Button(action: onSkip) {
        Label("Skip", systemImage: "forward.fill")
          .font(.system(size: 14, weight: .semibold))
          .frame(maxWidth: .infinity, minHeight: 44)
      }
      .buttonStyle(.borderedProminent)
      .tint(.lockedInGreen)
    }
    .padding(.horizontal, 6)
    .onAppear { lastHapticAt = -1 }
    .onChange(of: restRemaining) { remaining in
      // Haptic tick at 3, 2, 1
      if remaining <= 3 && remaining > 0 && remaining != lastHapticAt {
        lastHapticAt = remaining
        WKInterfaceDevice.current().play(.click)
      }
    }
  }
}
