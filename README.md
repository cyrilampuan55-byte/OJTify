# OJTify

OJTify is a React + Vite application for tracking OJT hours, student progress, notifications, and admin monitoring. The app now uses Supabase for authentication, database storage, and realtime updates.

## Environment setup

Create `.env.local` for local web development:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Use `.env.mobile` for Capacitor and APK builds. A starter file is included at [.env.mobile.example](/c:/Users/ABSOLUTE/Documents/OJTify/.env.mobile.example).

## Local development

```bash
npm install
npm run dev:client
```

This starts the Vite frontend on `http://localhost:8080`.

## Supabase setup

Before the app can log in, run the SQL schema in [supabase/schema.sql](/c:/Users/ABSOLUTE/Documents/OJTify/supabase/schema.sql) in the Supabase SQL editor.

Then in Supabase:

1. Enable the `Email` auth provider.
2. Disable email confirmation temporarily if you want faster testing.
3. Register the admin user with `admin@ojtify.com` if you want that account to receive the admin role automatically.

## Mobile builds

For Android/iOS wrappers, see [MOBILE.md](/c:/Users/ABSOLUTE/Documents/OJTify/MOBILE.md).
