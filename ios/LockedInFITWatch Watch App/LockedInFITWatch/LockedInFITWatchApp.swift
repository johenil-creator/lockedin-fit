import SwiftUI

@main
struct LockedInFITWatchApp: App {
  // Activate WCSession as early as possible
  @ObservedObject private var connectivity = SessionConnectivity.shared

  var body: some Scene {
    WindowGroup {
      WorkoutView()
        .environmentObject(connectivity)
    }
  }
}
