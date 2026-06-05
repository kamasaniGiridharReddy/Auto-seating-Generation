# GRIT Seating — Frontend

React + Vite + Tailwind CSS v4 + Three.js (scaffold).

## Structure

```
src/
├── api/              # Flask API clients
├── components/
│   ├── auth/         # Login, signup forms
│   ├── dashboard/    # Stats, classroom config, bench numbering
│   ├── export/       # CSV & Excel export buttons
│   ├── layout/       # Header, sidebar, footer, app shell
│   ├── seating/      # 2D seating preview
│   ├── ui/           # Button, Input, Card
│   ├── upload/       # CSV upload zone
│   └── visualization/ # Three.js scene (BenchMesh, StudentSeat)
├── context/          # AuthContext
├── hooks/
├── pages/
├── routes/
├── styles/           # GRIT brown/red theme
└── utils/
```

## Scripts

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in a browser (not as a PowerShell command).

Logic is not implemented yet — UI shells and TODO markers only.
