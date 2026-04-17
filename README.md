# HireFlow ATS

A full-stack, cloud-ready Applicant Tracking System built with Python/Flask and React.

## Features

- **Multi-tenant** — each company gets fully isolated data
- **Pipeline kanban** — drag candidates through configurable stages
- **AI screening** — automatic resume scoring on every application (skills match, experience, JD relevance, tenure)
- **Interview management** — schedule interviews, assign interviewers, collect scorecards
- **Offer management** — create, send, and track offer letters
- **Analytics** — funnel, time-to-hire, source attribution, stage velocity
- **JWT auth** — role-based access (admin, recruiter, hiring_manager, interviewer)

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Backend    | Python 3.12, Flask, SQLAlchemy          |
| Database   | SQLite (dev) / PostgreSQL (production)  |
| Auth       | JWT (PyJWT), bcrypt                     |
| Frontend   | React 18, Vite, React Router, Recharts  |
| Styling    | Tailwind CSS v3                         |
| Container  | Docker + docker-compose                 |

## Quick Start (Development)

### Prerequisites
- Python 3.10+
- Node.js 18+

### One-command start

```bash
bash start.sh
```

This will:
1. Install Python and Node dependencies
2. Create the SQLite database and seed it with demo data
3. Start the backend API on `http://localhost:5000`
4. Start the frontend on `http://localhost:5173`

### Manual start

```bash
# Backend
pip install -r requirements.txt
python3 seed.py          # only needed once
python3 run.py

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Demo credentials

| Role           | Email                | Password    |
|----------------|----------------------|-------------|
| Admin          | admin@acme.com       | password123 |
| Recruiter      | sarah@acme.com       | password123 |
| Hiring Manager | tom.k@acme.com       | password123 |
| Interviewer    | diana@acme.com       | password123 |

---

## Project Structure

```
hireflow/
├── backend/
│   ├── app.py                  # Flask app factory
│   ├── models/
│   │   └── __init__.py         # All SQLAlchemy models
│   ├── routes/
│   │   ├── auth.py             # Register, login, users
│   │   ├── jobs.py             # Job CRUD + stats
│   │   ├── candidates.py       # Candidate CRUD
│   │   ├── applications.py     # Pipeline board + stage transitions
│   │   ├── interviews.py       # Scheduling + scorecards
│   │   ├── offers.py           # Offer lifecycle
│   │   └── analytics.py        # Funnel, TTH, sources
│   ├── services/
│   │   └── ai_screening.py     # Resume scoring engine
│   └── middleware/
│       └── auth.py             # JWT + RBAC decorators
├── frontend/
│   └── src/
│       ├── App.jsx             # Router
│       ├── context/
│       │   └── AuthContext.jsx # Global auth state
│       ├── components/
│       │   ├── Layout.jsx      # Sidebar nav
│       │   └── ui.jsx          # Badge, Modal, Btn, Avatar...
│       ├── pages/
│       │   ├── Auth.jsx        # Login / Register
│       │   ├── Dashboard.jsx   # Overview + quick actions
│       │   ├── Jobs.jsx        # List, create, edit, detail
│       │   ├── Pipeline.jsx    # Kanban board
│       │   ├── Candidates.jsx  # List + detail
│       │   ├── Interviews.jsx  # Calendar list + scorecards
│       │   └── OffersAndAnalytics.jsx
│       └── utils/
│           └── api.js          # Axios client + all API calls
├── run.py                      # Server entrypoint
├── seed.py                     # Demo data seeder
├── requirements.txt
├── docker-compose.yml
├── Dockerfile.backend
├── .env.example
└── start.sh                    # One-command dev launcher
```

---

## API Reference

All endpoints require `Authorization: Bearer <token>` except `/api/auth/login` and `/api/auth/register`.

### Auth
| Method | Path                  | Description          |
|--------|-----------------------|----------------------|
| POST   | /api/auth/register    | Create company + admin user |
| POST   | /api/auth/login       | Get JWT token        |
| GET    | /api/auth/me          | Current user         |
| GET    | /api/auth/users       | List team members    |
| POST   | /api/auth/users       | Invite team member   |

### Jobs
| Method | Path              | Description          |
|--------|-------------------|----------------------|
| GET    | /api/jobs         | List jobs (filter by status) |
| POST   | /api/jobs         | Create job           |
| GET    | /api/jobs/:id     | Job detail           |
| PUT    | /api/jobs/:id     | Update job           |
| DELETE | /api/jobs/:id     | Delete job           |
| GET    | /api/jobs/:id/stats | Application counts by stage |

### Applications & Pipeline
| Method | Path                          | Description              |
|--------|-------------------------------|--------------------------|
| GET    | /api/applications             | List (filter by job/stage) |
| POST   | /api/applications             | Create + auto-score      |
| GET    | /api/applications/:id         | Application detail       |
| PUT    | /api/applications/:id/stage   | Advance or reject        |
| PUT    | /api/applications/:id/notes   | Update notes             |
| GET    | /api/applications/:id/history | Stage transition log     |
| GET    | /api/applications/pipeline    | Kanban board by job      |

### Candidates
| Method | Path                          | Description              |
|--------|-------------------------------|--------------------------|
| GET    | /api/candidates               | List + search            |
| POST   | /api/candidates               | Create + parse skills    |
| GET    | /api/candidates/:id           | Profile detail           |
| PUT    | /api/candidates/:id           | Update profile           |
| GET    | /api/candidates/:id/applications | All applications      |

### Interviews
| Method | Path                          | Description              |
|--------|-------------------------------|--------------------------|
| GET    | /api/interviews               | List (filter by date/job) |
| POST   | /api/interviews               | Schedule interview       |
| GET    | /api/interviews/:id           | Interview detail         |
| PUT    | /api/interviews/:id           | Update / reschedule      |
| DELETE | /api/interviews/:id           | Cancel                   |
| POST   | /api/interviews/:id/scorecard | Submit scorecard         |
| GET    | /api/interviews/:id/scorecard | Get scorecards           |

### Offers
| Method | Path            | Description              |
|--------|-----------------|--------------------------|
| GET    | /api/offers     | List offers              |
| POST   | /api/offers     | Create offer             |
| GET    | /api/offers/:id | Offer detail             |
| PUT    | /api/offers/:id | Update / change status   |

### Analytics
| Method | Path                          | Description              |
|--------|-------------------------------|--------------------------|
| GET    | /api/analytics/overview       | Key metrics summary      |
| GET    | /api/analytics/funnel         | Candidates per stage     |
| GET    | /api/analytics/time-to-hire   | TTH average + median     |
| GET    | /api/analytics/sources        | Applications by source   |

---

## Pipeline Stages

```
applied → ai_screening → recruiter_review → phone_screen →
interviewing → hiring_decision → offer_extended → offer_accepted → hired

At any stage: → rejected
Candidate self-removes: → withdrawn
```

## AI Screening

On every new application, the engine automatically computes a 0–100 score:

| Signal         | Weight | How it's calculated                              |
|----------------|--------|--------------------------------------------------|
| Skills match   | 40%    | Parsed skills vs job required_skills + JD text   |
| Experience     | 30%    | Years experience vs min_years_experience         |
| JD relevance   | 20%    | Keyword overlap between resume and job description |
| Tenure         | 10%    | Average job tenure (penalises job-hopping)       |

Skills are auto-detected from free-text resume by regex matching against 60+ common tech skills.

---

## Production Deployment

### Environment variables

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET and DATABASE_URL at minimum
```

### With Docker Compose

```bash
docker-compose up -d

# Seed initial data
docker-compose exec backend python3 seed.py
```

### Upgrading to PostgreSQL

1. Install the driver: `pip install psycopg2-binary`
2. Set `DATABASE_URL=postgresql://user:pass@host:5432/hireflow`
3. Run `python3 seed.py` to initialise the schema

### Security checklist for production

- [ ] Set a strong random `JWT_SECRET`
- [ ] Set `FLASK_DEBUG=false`
- [ ] Restrict `CORS_ORIGINS` to your actual frontend domain
- [ ] Use PostgreSQL, not SQLite
- [ ] Put the API behind HTTPS (nginx reverse proxy or cloud load balancer)
- [ ] Set `MAX_CONTENT_LENGTH` for upload size limits
- [ ] Enable rate limiting (add `flask-limiter`)
