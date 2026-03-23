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
