## Mobile Build Notes

`OJTify` now supports:

- PWA install from the browser
- Capacitor wrappers for Android and iOS

### Supabase configuration

For mobile builds, create `.env.mobile` with:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can copy from `.env.mobile.example` and fill in your project values.

Before login will work, run [supabase/schema.sql](/c:/Users/ABSOLUTE/Documents/OJTify/supabase/schema.sql) in the Supabase SQL editor and enable the Email auth provider.

### Commands

```bash
npm run build
npm run build:mobile
npm run cap:sync
npm run cap:sync:mobile
npm run cap:android
npm run cap:ios
```

### Tooling requirements

- Android APK: Android Studio, Java SDK, Android SDK
- iOS app build: macOS with Xcode

### Important

An APK is Android-only. iOS uses an Xcode project / IPA, not an APK.

## How to ask Codex efficiently (mobile lean context)

Use this template for APK/IPA requests:

```txt
Task:
Target platform: Android APK / iOS IPA / both
Build type: debug / release
Environment file used: .env.mobile / .env.local
Current error (exact text):
Definition of done:
```

Mobile-specific tips:

1. Include whether this is a local build or Codemagic build.
2. Share if the issue is build-time or runtime (for example: login connection error).
3. Mention if GPS/location permission is required for the test case.
4. For iOS IPA, include signing method (manual or automatic via App Store Connect).
5. Include the expected output path if you want a specific artifact location.
