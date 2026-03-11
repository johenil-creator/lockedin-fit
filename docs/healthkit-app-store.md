# HealthKit App Store & iOS Review Guide

## Required Entitlements

The `com.apple.developer.healthkit` entitlement must be enabled in the
Apple Developer Portal for the app's provisioning profile.

The `react-native-health` Expo config plugin handles adding the entitlement
to the Xcode project automatically via `app.json`:

```json
["react-native-health", { "isClinicalDataEnabled": false }]
```

## Required Info.plist Descriptions

### NSHealthShareUsageDescription (READ access)
```
LockedIn FIT reads your body weight, workouts, heart rate, resting heart rate,
HRV, step count, active energy, and sleep data from Apple Health to improve
your readiness scoring, detect external workouts, and provide personalized
recovery insights.
```

### NSHealthUpdateUsageDescription (WRITE access)
```
LockedIn FIT saves your completed workouts to Apple Health so all your
training is tracked in one place.
```

**Important:** These descriptions MUST accurately reflect what data is
being read/written. Apple will reject apps with vague or misleading
descriptions.

## Privacy Nutrition Labels

In App Store Connect, under App Privacy:

| Data Type | Category | Purpose | Linked to Identity |
|-----------|----------|---------|-------------------|
| Health & Fitness | Health | App Functionality | No |
| Health & Fitness | Fitness | App Functionality | No |

Mark as "Data Not Collected" for:
- Analytics
- Advertising
- Third-Party Advertising

## What Apple Reviewers Check

1. **HealthKit is optional** — The app MUST function without HealthKit
   access. Users who deny permissions should still be able to use all
   core features (workout logging, plans, progress tracking).

2. **Minimum necessary data** — Only request permissions for data types
   you actually use. Do not request permissions "just in case."

3. **Clear purpose strings** — The permission dialogs must explain WHY
   each data type is needed in user-friendly language.

4. **No server transmission** — Apple is strict about health data not
   being sent to external servers unless explicitly disclosed and
   consented to. LockedInFIT keeps all data local (AsyncStorage).

5. **Graceful degradation** — If a specific data type is denied, the
   app should still work with whatever data IS available.

## Common Rejection Reasons

1. **Vague usage description** — "We use your health data to improve
   your experience" → REJECTED. Be specific about each data type.

2. **Required HealthKit** — App crashes or shows error when Health
   access is denied → REJECTED.

3. **Requesting unused data** — Requesting sleep data but never
   displaying or using it → REJECTED.

4. **Missing entitlement** — HealthKit entitlement not in provisioning
   profile → build rejected at upload.

5. **Health data in analytics** — Sending HR/HRV/sleep data to Firebase
   or any analytics service → REJECTED.

## LockedInFIT Compliance Checklist

- [x] Health data stored locally only (AsyncStorage)
- [x] No health data in Firebase or analytics
- [x] App fully functional without HealthKit
- [x] Graceful fallback for denied permissions
- [x] Specific, accurate usage descriptions
- [x] Progressive permission model (request only what's needed)
- [x] User can disconnect and clear health data
- [x] Write access requested separately from read
- [x] No clinical data requested (isClinicalDataEnabled: false)

## Future Considerations

- If adding cloud sync, health data MUST be encrypted in transit and
  at rest, with explicit user consent before upload
- If adding HealthKit background delivery (observer queries), this
  requires additional entitlement and review justification
- watchOS companion app would require separate HealthKit authorization
