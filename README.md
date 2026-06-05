# GRIT Seating Arrangement System

Professional seating arrangement platform for NIAT classrooms, built with React, Tailwind CSS, Three.js, Flask, and SQLite.

## Project structure

```
GRIT-Seating-System/
├── assets/              # Branding assets (GRIT / NIAT logos)
├── backend/             # Flask API
└── frontend/            # React + Vite SPA
```

## Stack

| Layer      | Technology                          |
|-----------|--------------------------------------|
| Frontend  | React, Tailwind CSS, Three.js        |
| Backend   | Flask                                |
| Database  | SQLite                               |

## Features (scaffolded)

1. **Authentication** — Login & signup
2. **Dashboard** — Classrooms, benches, students per bench, bench numbering
3. **CSV upload** — Student ID, Name, Skill, Classroom
4. **Seating logic** — No same-skill students beside / front / back
5. **3D visualization** — Classroom view with Three.js
6. **Export** — CSV and Excel
7. **Branding** — GRIT & NIAT premium brown/red UI

## Getting started

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the app in your browser: `http://localhost:5173` (do not paste the URL into PowerShell as a command).

## Status

Project structure and placeholder files are in place. Business logic is not implemented yet.

## Deployment

### Render Settings

**Root Directory:** backend

**Build Command:** pip install -r requirements.txt

**Start Command:** gunicorn run:app

### Environment Variables

The following environment variables must be configured in Render:

- `DATABASE_HOST` - Railway MySQL host
- `DATABASE_PORT` - Railway MySQL port (default: 3306)
- `DATABASE_NAME` - Railway MySQL database name
- `DATABASE_USER` - Railway MySQL username
- `DATABASE_PASSWORD` - Railway MySQL password
- `SECRET_KEY` - Flask secret key for session management
- `FLASK_ENV=production` - Set to production mode
