# Adaptive Video Streaming

A full-stack demo application that streams HLS video and adapts playback quality in real time based on measured network throughput.

The project combines a FastAPI backend for serving video assets and handling uploads with a Next.js frontend that uses `hls.js` to switch between quality levels automatically.

## Overview

This repository is a compact adaptive streaming prototype:

- The backend exposes a static HLS directory and upload endpoints.
- The frontend loads the HLS master playlist and chooses a bitrate based on observed download speed.
- The app is designed for local development and demonstration, not production-scale deployment.

## Architecture

- Backend: FastAPI app in [backend/main.py](backend/main.py)
- Frontend: Next.js app in [frontend/app/page.tsx](frontend/app/page.tsx) and [frontend/app/VideoPlayer.tsx](frontend/app/VideoPlayer.tsx)
- Sample HLS assets: [backend/processed](backend/processed)
- Uploaded videos: [backend/videos](backend/videos)

## Features

- Upload video files to the backend
- Serve HLS media through the FastAPI static route
- Browse available uploaded videos via API
- Adaptive bitrate selection using throughput estimation
- Startup ramp-up logic and hysteresis-based quality changes
- Browser-based playback with `hls.js`

## Repository structure

```text
adaptive-video-streaming/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── processed/
│   │   └── master.m3u8 and quality variants
│   └── videos/
│       └── sample uploaded files
├── frontend/
│   ├── app/
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── README.md
└── README.md
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

## Backend setup

From the repository root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will run at:

- http://localhost:8000

### Backend API

- `GET /` — health/metadata response
- `POST /upload` — upload a video file
- `GET /videos` — list uploaded files
- `GET /hls/{path}` — serve HLS manifests and segments from the `processed` directory

## Frontend setup

Open a second terminal and run:

```bash
cd frontend
npm install
npm run dev
```

Then open:

- http://localhost:3000

The frontend fetches the HLS stream from:

```text
http://127.0.0.1:8000/hls/master.m3u8
```

## How the adaptive streaming works

The player in [frontend/app/VideoPlayer.tsx](frontend/app/VideoPlayer.tsx) measures fragment download throughput, smooths recent samples, applies a safety factor, and decides whether to move to a higher or lower quality level.

The logic includes:

- startup ramp-up for initial stabilization
- throughput-based quality selection
- hysteresis to avoid frequent up/down switching
- quality level handoff via `hls.nextLoadLevel`

## Suggested workflow

1. Start the backend.
2. Start the frontend.
3. Open the site in the browser.
4. Upload a video via the backend or use the sample HLS stream already bundled in the processed folder.
5. Observe the player adapting quality as network conditions change.

## Notes

- This is a local demo project and does not include a full production-ready streaming pipeline or deployment configuration.
- The supplied `processed` directory already contains sample HLS playlists and segments for testing.
- The backend CORS configuration is currently limited to `http://localhost:3000`.

## License

This project does not currently declare a license file. If you plan to distribute or publish it, add an explicit license before doing so.
