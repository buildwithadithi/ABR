# Frontend

This frontend is the browser client for the adaptive video streaming application. It handles authentication, video uploads, video listing, HLS playback, and the network simulator used to test bitrate adaptation.

## Stack

- Next.js 16
- React 19
- TypeScript
- `hls.js` for HLS playback
- Vitest for component and ABR logic tests

## Local setup

From the repository root:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

If you do not have an `.env.example`, create `.env.local` manually with:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLOUDFRONT_URL=http://localhost:8000
```

Then open http://localhost:3000.

## Main screens and features

- `app/page.tsx` — app entry point
- `app/components/MyVideos.tsx` — authenticated video dashboard
- `app/components/VideoUpload.tsx` — S3 multipart upload UI
- `app/components/VideoPlayer.tsx` — HLS playback and ABR monitoring
- `app/simulator/page.tsx` — adjustable network simulation for testing adaptation behavior

## ABR and playback logic

The adaptive logic is implemented under `app/abr/` and includes:

- bandwidth estimation
- buffer health tracking
- startup ramp-up
- hysteresis thresholds
- quality selection decisions

The simulator page lets you vary network bandwidth and observe how the client responds over time.

## Useful commands

```bash
npm run dev
npm run build
npm run lint
npm test
```

## Notes

- The frontend expects the FastAPI backend to be running on port 8000.
- Uploads are authenticated with JWT tokens from the backend.
- The app is designed for local experimentation and demo use rather than production deployment.
