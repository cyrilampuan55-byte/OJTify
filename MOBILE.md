## Mobile Build Notes

`OJTify` now supports:

- PWA install from the browser
- Capacitor wrappers for Android and iOS

### API configuration

The mobile app cannot use `127.0.0.1:3001` unless the backend runs on the same device.

For phone testing, create `.env.local` or `.env.production` with:

```env
VITE_API_BASE=http://YOUR_LOCAL_IP:3001/api
```

Replace `YOUR_LOCAL_IP` with the machine running the OJTify server, for example `192.168.1.10`.

### Commands

```bash
npm run build
npm run cap:sync
npm run cap:android
npm run cap:ios
```

### Tooling requirements

- Android APK: Android Studio, Java SDK, Android SDK
- iOS app build: macOS with Xcode

### Important

An APK is Android-only. iOS uses an Xcode project / IPA, not an APK.
