export const PRIVACY_POLICY = `LOCKEDINFIT PRIVACY POLICY

Effective Date: March 10, 2026

LockedInFIT ("we," "our," or "the app") is a fitness tracking application. This Privacy Policy explains what data we collect, how we use it, and your rights regarding that data.

1. DATA WE COLLECT

Personal Information
• Name (entered during onboarding)
• Email address (when creating an account)
• Body weight (entered manually or synced from Apple Health)

Fitness Data
• Workout sessions (exercises, sets, reps, weights, dates, duration)
• One-rep max (1RM) test results
• XP, rank, and streak data
• Custom workout plans

Apple Health Data (iOS only, with your permission)
• Body weight
• Heart rate and resting heart rate
• Heart rate variability (HRV)
• Step count and walking/running distance
• Active energy burned
• Sleep analysis
• Workout sessions (read and written)

Google Account Data (only if you use plan import)
• Email address
• Google Drive file access (limited to files you select)
• Google Sheets data (for plan import)

Social Features
• Friend codes
• League standings and weekly XP totals

2. HOW WE USE YOUR DATA

All data is used solely to provide app functionality:
• Tracking workouts and calculating progression
• Computing recovery estimates and readiness scores
• Auto-filling exercise weights based on your history
• Syncing XP and league standings with other users
• Importing workout plans from Google Sheets

We do NOT use your data for advertising, marketing, or profiling. We do NOT sell your data to third parties.

3. DATA STORAGE

Local Storage
Most of your data is stored locally on your device using AsyncStorage. This includes workout history, profile data, recovery scores, and cached health data. This data never leaves your device unless you explicitly export it.

Cloud Storage (Firebase)
If you create an account, the following is stored on Google Firebase servers:
• Email address and display name
• Friend code and rank
• Weekly XP totals
• Friendship connections
• League membership and standings

Apple Health Data
Your health data from Apple Health is cached locally on your device with short expiration times (5 minutes to 1 hour for most data types). Health data is NEVER uploaded to our servers, shared with third parties, or used for advertising. Completed workouts may be written back to Apple Health with your permission.

4. THIRD-PARTY SERVICES

• Firebase (Google) — Authentication, cloud database for social features. Subject to Google's Privacy Policy.
• Google OAuth — Used only for Google Sheets plan import. We request access only to files you explicitly select.
• Apple HealthKit — Used only with your permission to enhance recovery tracking and auto-fill body weight.

We do not use analytics services, crash reporting, or advertising SDKs.

5. DATA RETENTION

• Local data is retained until you clear it or delete the app.
• Health cache data expires automatically (5 minutes to 1 hour depending on type).
• Firebase data is retained until you delete your account.
• Daily fatigue snapshots are retained for 30 days.

6. YOUR RIGHTS

You have the right to:
• Access your data — Use the "Export Data" feature in Settings to download all stored data.
• Delete your data — Use "Delete Account" in Settings to permanently remove all local and cloud data.
• Withdraw consent — You can revoke Apple Health access in iOS Settings > Health > LockedInFIT at any time.
• Data portability — Your data export is provided in JSON format.

7. CHILDREN'S PRIVACY

LockedInFIT is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you are under 13, do not use this app or provide any personal information.

8. DATA SECURITY

We use industry-standard security measures including HTTPS encryption for all network communications and iOS file-level encryption for local data. However, no method of electronic storage is 100% secure.

9. CHANGES TO THIS POLICY

We may update this Privacy Policy from time to time. We will notify you of significant changes through the app. Continued use of the app after changes constitutes acceptance of the updated policy.

10. CONTACT US

If you have questions about this Privacy Policy or wish to exercise your data rights, contact us at:

support@lockedinfit.app
`;
