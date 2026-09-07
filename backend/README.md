# FastAPI backend

## Start

From the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API:
- http://localhost:8000/
- http://localhost:8000/health
- http://localhost:8000/docs

The frontend at http://localhost:5173 sends uploaded/captured images to `POST /analyze`.

This is a prototype visual colour classifier for synthetic demonstration images. It does not identify or confirm real controlled substances and must not replace laboratory confirmation.
