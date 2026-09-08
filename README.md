# Adaptive Video Streaming

A full-stack adaptive streaming demo that uploads videos, transcodes them into HLS variants, and dynamically switches playback quality based on measured network throughput.

This repository combines a FastAPI backend, PostgreSQL, Redis/Celery workers, Amazon S3, and a Next.js frontend that uses `hls.js` plus a custom bitrate decision pipeline to test adaptive playback behavior.

## What this project does

- Accepts user registration and login via JWT-based auth.
- Lets authenticated users upload videos and track them in the database.
- Stores uploaded videos in S3 and starts async background processing.
- Uses FFmpeg to produce multiple HLS renditions such as 360p, 480p, and 720p.
- Uploads generated manifests and TS segments to S3 as a processed video package.
- Serves the HLS master playlist through the FastAPI app for playback.
- Adapts quality in the browser using throughput estimation and buffer-aware decision logic.
- Includes a bandwidth simulator that lets you test the ABR controller under different network conditions.

## Tech stack

- Frontend: Next.js, React, TypeScript, `hls.js`
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: PostgreSQL
- Background jobs: Celery + Redis
- Object storage: Amazon S3
- Transcoding: FFmpeg
- Auth: JWT + password hashing

## Repository structure

```text
adaptive-video-streaming/
├── backend/
│   ├── alembic/
│   ├── app/
│   │   ├── auth/
│   │   ├── database/
│   │   ├── processing/
│   │   ├── storage/
│   │   └── videos/
│   ├── processed/
│   ├── tmp/
│   ├── videos/
│   ├── .env
│   ├── alembic.ini
│   ├── requirements.txt
│   └── test_worker.py
├── frontend/
│   ├── app/
│   ├── public/
│   ├── .env.local
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── eslint.config.mjs
│   └── README.md
├── README.md
└── videos/
```

## Core application flow

1. A user registers or logs in through the FastAPI auth routes.
2. The frontend uploads a video through the `/videos` endpoints.
3. The backend stores the video metadata in PostgreSQL and enqueues Celery processing.
4. The worker downloads the original video from S3, transcodes it into multiple HLS renditions, and uploads the output back to S3.
5. The frontend loads the generated `master.m3u8` and uses the ABR logic to select the best quality for the current network state.

## Prerequisites

- Python 3.10+
- Node.js 20+
- npm
- Redis
- PostgreSQL or a compatible hosted database
- FFmpeg installed and available on your `PATH`
- AWS S3 credentials with a bucket configured

## Environment configuration

Create a backend environment file at `backend/.env` with values similar to:

```env
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/postgres
JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=your-region
AWS_S3_BUCKET=your-bucket-name
```

Create a frontend environment file at `frontend/.env.local` with:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLOUDFRONT_URL=http://localhost:8000
```

> The frontend reads the API base URL from `NEXT_PUBLIC_API_URL`, while the backend relies on the S3 and database settings from `backend/.env`.

## Local development setup

### 1) Install backend dependencies

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) Start Redis and the database

Make sure Redis is running locally and that your PostgreSQL database is reachable through `DATABASE_URL` in `backend/.env`.

### 3) Start the FastAPI backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend exposes endpoints such as:

- `GET /` — app metadata
- `GET /db-test` — database connectivity check
- `POST /auth/register` — register a user
- `POST /auth/login` — login and obtain a JWT
- `GET /videos/` — list the current user's videos
- `POST /videos/` — upload a video file
- `GET /hls/{path}` — serve HLS playlists and segments

### 4) Start the Celery worker

Open a second terminal and run:

```bash
cd backend
source .venv/bin/activate
celery -A app.processing.celery_app worker --loglevel=info
```

This worker handles the video transcription/processing pipeline once an upload is accepted.

### 5) Start the frontend

Open a third terminal and run:

```bash
cd frontend
npm install
npm run dev
```

Then open:

- http://localhost:3000

## Frontend experience

The Next.js app includes:

- a user/video dashboard
- upload UI for video files
- HLS playback for processed videos
- an ABR quality timeline view
- a simulator page to test network throttling and bandwidth transitions

Key frontend files:

- `frontend/app/page.tsx` — main entry page
- `frontend/app/components/MyVideos.tsx` — user dashboard
- `frontend/app/components/VideoUpload.tsx` — multipart upload flow
- `frontend/app/components/VideoPlayer.tsx` — playback and HLS monitoring
- `frontend/app/simulator/page.tsx` — network simulation environment

## Adaptive bitrate logic

The ABR logic lives in the frontend under `frontend/app/abr/` and is designed to:

- measure fragment download time
- estimate available bandwidth
- smooth recent throughput samples
- apply hysteresis to reduce unnecessary quality switching
- ramp up quality gradually on startup to avoid unstable transitions

This makes the player behave like a real adaptive streaming client while remaining easy to inspect and tune in the browser.

## Sample assets and generated output

- `backend/processed/` contains sample HLS playlists and segment files.
- `backend/tmp/` is used by the worker to stage transcoding output before upload.
- `backend/videos/` is the local upload directory used by the backend.

## Notes

- This project is a local demo and prototype rather than a fully hardened production deployment.
- The backend CORS configuration currently allows requests from `http://localhost:3000`.
- Generated HLS files are uploaded to S3 and served as processed streams, so local-only playback requires the backend to be running and the S3 bucket to be reachable.

## License

There is no explicit license file in this repository yet. If you plan to distribute or publish the project, add a license before doing so.
