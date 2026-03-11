# HealthKit Integration — QA Checklist

Comprehensive testing checklist for the Apple Health / HealthKit integration.
Follow sections A–J in order. Mark each item ✅ pass, ❌ fail, or ⏭️ N/A.

---

## A. Permission Flow

- [ ] A1. First-time permission request shows Apple Health dialog
- [ ] A2. Granting all permissions → status shows "Connected"
- [ ] A3. Denying all permissions → status shows "Access Denied"
- [ ] A4. Partial grant (some types denied) → status shows "Partially Connected"
- [ ] A5. Re-requesting after denial triggers dialog again
- [ ] A6. Permission revoked in Settings > Health mid-session → app handles gracefully
- [ ] A7. Onboarding weight sync still works independently
- [ ] A8. Enhanced permissions can be requested after minimum grant
- [ ] A9. Write permission requested separately from read permissions
- [ ] A10. Permission status persists across app launches

## B. Data Availability

- [ ] B1. With Apple Watch paired → HR, HRV, resting HR populate
- [ ] B2. Without Apple Watch (iPhone only) → steps and workouts still work
- [ ] B3. No health data at all → neutral readiness (no penalty)
- [ ] B4. Stale data (>24h old) → confidence downgraded to "low"
- [ ] B5. Very large datasets (years of history) → no performance regression
- [ ] B6. Data from multiple sources (Oura, Whoop, etc.) → aggregated correctly
- [ ] B7. Daily snapshot builds correctly at midnight rollover
- [ ] B8. Weekly snapshots include 7 distinct days

## C. External Workout Detection

- [ ] C1. Apple Watch workout NOT logged in app → shows as external workout
- [ ] C2. LockedInFIT workout → NOT duplicated as external
- [ ] C3. Overlapping timestamps (within 30 min) → correctly filtered
- [ ] C4. Very short workouts (<5 min) → excluded
- [ ] C5. Very long workouts (>3 hours) → handled correctly
- [ ] C6. Workout with no heart rate data → duration-only load estimate
- [ ] C7. Workout with no calorie data → handled gracefully
- [ ] C8. Multiple external workouts in one day → all detected
- [ ] C9. External workout card displays correct icon, duration, calories
- [ ] C10. "Detected via Apple Health" badge shows correctly

## D. Readiness Integration

- [ ] D1. Health signal with full data → weight reallocation active (14% health)
- [ ] D2. Health signal with partial data → proportional confidence
- [ ] D3. Health signal with no data → original 5-component weights used
- [ ] D4. Elevated resting HR → readiness score decreases
- [ ] D5. Suppressed HRV → readiness score decreases
- [ ] D6. Poor sleep (<6h) → readiness penalty applied
- [ ] D7. High step count (>15k) → slight fatigue addition
- [ ] D8. All health signals positive → readiness boosted
- [ ] D9. Readiness label transitions (Prime/Ready/Manage Load/Recover) correct
- [ ] D10. Readiness cache invalidates when health data refreshes

## E. Recovery Dashboard Integration

- [ ] E1. Health insight banner appears when health data available
- [ ] E2. Banner collapses/expands correctly
- [ ] E3. Factor bars (Resting HR, HRV, Sleep, Activity) render
- [ ] E4. External workout cards display in recovery view
- [ ] E5. Health data rows show correct values and trend arrows
- [ ] E6. Empty states shown when no health data
- [ ] E7. Confidence percentage displays correctly
- [ ] E8. Colors match readiness zones (green/yellow/red)

## F. Onboarding Flow

- [ ] F1. New user → weight sync step works as before
- [ ] F2. After weight sync → expanded health benefits shown
- [ ] F3. "Connect Apple Health" button requests enhanced permissions
- [ ] F4. "Maybe Later" skips without error
- [ ] F5. Locke mood changes appropriately (excited → celebrating)
- [ ] F6. Existing users not forced through new onboarding
- [ ] F7. Skip returns to normal onboarding flow

## G. Performance

- [ ] G1. Health data fetch completes < 2 seconds on real device
- [ ] G2. No UI blocking during background sync
- [ ] G3. Cache prevents redundant HealthKit reads within TTL
- [ ] G4. Foreground refresh debounced to 15-minute intervals
- [ ] G5. Promise.all batch reads (not sequential)
- [ ] G6. Memory usage stable with large health datasets
- [ ] G7. App cold start not delayed by health sync

## H. Simulator vs Device

- [ ] H1. Simulator: HealthKit available, fake data accepted
- [ ] H2. Real device with Apple Watch: full data flow
- [ ] H3. Real device without Apple Watch: steps/workouts work
- [ ] H4. iPad: HealthKit available, no Apple Watch data
- [ ] H5. Android: all health features gracefully hidden

## I. App Store / iOS Review

- [ ] I1. NSHealthShareUsageDescription accurate and specific
- [ ] I2. NSHealthUpdateUsageDescription present for write access
- [ ] I3. HealthKit entitlement in provisioning profile
- [ ] I4. Privacy nutrition labels include Health data category
- [ ] I5. Health data stays local (never uploaded to servers)
- [ ] I6. App does not require HealthKit to function
- [ ] I7. User can use full app without granting any Health permissions
- [ ] I8. No health data in crash reports or analytics

## J. Edge Cases

- [ ] J1. App backgrounded during permission request → resumes correctly
- [ ] J2. Network offline → HealthKit reads work (local API)
- [ ] J3. User switches Apple ID → cached data invalidated
- [ ] J4. iOS < 15 → health features disabled gracefully
- [ ] J5. Multiple LockedInFIT sessions same day → external filter correct
- [ ] J6. Workout write to Health → appears in Health app
- [ ] J7. Auto-sync toggle persists across app restarts
- [ ] J8. Disconnect → cached health data cleared
- [ ] J9. Reconnect after disconnect → fresh permission request
- [ ] J10. Rapid foreground/background cycling → no duplicate syncs
