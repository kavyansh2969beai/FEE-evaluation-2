# Mindora Client

## Local development

1. Install dependencies in `client` and `server` with `npm install`.
2. Copy `client/.env.example` to `client/.env.local` and set `VITE_API_URL` to the backend origin.
3. Copy `server/.env.example` to `server/.env` and configure the MongoDB URI and a private JWT secret.
4. Start the backend from `server` with `npm run dev`, then start the frontend from `client` with `npm run dev`.

`CLIENT_ORIGINS` is a comma-separated list of browser origins allowed to access the API and Socket.IO server. Include the deployed frontend origin there. Set `VITE_API_URL` to the deployed backend origin and rebuild the client after changing it.

## Checks

- `npm run lint`
- `npm run build`

The backend currently has no automated test suite configured.
