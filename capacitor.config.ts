import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ojtify.app',
  appName: 'OJTify',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    cleartext: true,
  },
};

export default config;
