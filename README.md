# Digital Companion for Field Drug Testing — Full Prototype

React/Vite frontend + Python/FastAPI/OpenCV backend.

## 1. Install frontend

From this folder:

```bash
npm install
```

## 2. Start backend

Open Terminal 1:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

You should see:

`Uvicorn running on http://127.0.0.1:8000`

Test it at:

http://localhost:8000/health

## 3. Start frontend

Open Terminal 2, from the project root:

```bash
npm run dev
```

Open:

http://localhost:5173/

## 4. Test image

Use an image that visibly contains the synthetic colour reference card and a purple result area. Click:

**New Field Test → Upload Image → Analyze Result**

The browser sends the image to FastAPI, and the backend returns the prototype classification, confidence, quality, SHA-256 hash, and model version.

## Safety / SIH note

This classifier is intentionally a broad visual prototype for synthetic demonstration images. It does not identify or confirm a real controlled substance, and the UI should continue to state that laboratory confirmation is required.

## Deploying (frontend on Vercel + backend on Render)

The frontend and backend deploy as two separate services. They talk to each
other over HTTPS using environment variables — no code changes needed.

### 1. Push this folder to a GitHub repo

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy the backend to Render

1. Go to https://render.com → **New +** → **Blueprint**, and point it at your
   repo. Render will read `render.yaml` and configure the service
   automatically (root dir `backend`, build/start commands, Python runtime).
   - If you'd rather set it up manually: New Web Service → root directory
     `backend` → build command `pip install -r requirements.txt` → start
     command `uvicorn main:app --host 0.0.0.0 --port $PORT`.
2. Once deployed, copy the service URL, e.g. `https://field-test-backend.onrender.com`.
3. Check `https://<your-backend>.onrender.com/health` returns `{"status": "ok"}`.

### 3. Deploy the frontend to Vercel

1. Go to https://vercel.com → **Add New** → **Project**, import the same repo.
   Vercel auto-detects Vite (build command `npm run build`, output `dist`).
2. In **Project Settings → Environment Variables**, add:
   - `VITE_API_URL` = `https://<your-backend>.onrender.com`
3. Deploy. Vercel gives you a URL like `https://field-test-app.vercel.app`.

### 4. Connect the two

Go back to the Render service → **Environment**, and set:

- `ALLOWED_ORIGINS` = `https://field-test-app.vercel.app`

Render redeploys automatically. Open your Vercel URL, run a field test, and
confirm the analysis step successfully calls the backend (check the Network
tab if anything looks off).

> **Note:** Render's free tier spins down after inactivity, so the first
> request after idling can take ~30–60 seconds to wake up — worth doing a
> "warm-up" request a minute before a live demo.

### Local development after this change

Both `npm run dev` and `./start-backend.sh` still work unmodified — the
frontend falls back to `http://localhost:8000` and the backend falls back to
allowing `localhost:5173` when the environment variables aren't set.

## Production roadmap

For a real deployment, replace the prototype colour heuristic with a validated, kit-specific computer-vision pipeline, authenticated operator accounts, PostgreSQL/object storage, secure backend signing keys, audit logs, and offline synchronization.
