# OJTify

OJTify is a React + Vite application with an Express API and SQLite database for tracking OJT hours, student progress, notifications, and admin monitoring.

## Local development

```bash
npm install
npm run dev
```

This starts:

- the Vite frontend on `http://localhost:8080`
- the API server on `http://localhost:3001`

## Production hosting

The app is set up to be deployed as a single Node service:

- Vite builds the frontend into `dist`
- Express serves the built frontend and the `/api/*` routes
- SQLite uses a configurable database path so you can mount persistent storage

### Important environment variables

- `NODE_ENV=production`
- `PORT` provided by the host
- `DATA_DIR` optional directory for database storage
- `DATABASE_PATH` optional explicit SQLite file path

If `DATABASE_PATH` is not set, the app uses `DATA_DIR/ojtify.db`.

## Render deployment

This repo includes [render.yaml](render.yaml) for a Render web service with a persistent disk.

Typical flow:

1. Push this repository to GitHub.
2. Create a new Render Blueprint or Web Service.
3. Attach a persistent disk.
4. Deploy.

The included `render.yaml` already configures:

- build command: `npm install && npm run build`
- start command: `npm run server`
- persistent disk mounted at `/var/data`
- SQLite path at `/var/data/ojtify.db`

## Mobile builds

For Android/iOS wrappers, see [MOBILE.md](MOBILE.md).

If the mobile app needs to call a public backend, build it with:

```env
VITE_API_BASE=https://your-public-domain/api
```
