# GRIT Seating — Backend

Flask + SQLite API (scaffold only).

## Structure

```
app/
├── models/       # User, Classroom, Bench, Student
├── routes/       # auth, dashboard, upload, seating, export
├── services/     # auth, csv_upload, seating, export
└── utils/        # database helpers
instance/         # SQLite database (gitignored)
data/             # sample CSV template
tests/
```

## Setup

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

Business logic is commented out with `TODO` markers.
