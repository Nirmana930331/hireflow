#!/usr/bin/env python3
"""
Seed script: creates a demo company with realistic data.
Run: python seed.py
Login: admin@acme.com / password123
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app import create_app
from backend.models import db, Tenant, User, Job, Candidate, Application, StageHistory, Interview, InterviewParticipant, Scorecard, Offer
from backend.services.ai_screening import score_application, extract_skills_from_text, estimate_years_experience
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
import json, uuid, random

app = create_app()

JOBS_DATA = [
    {
        'title': 'Senior Frontend Engineer',
        'department': 'Engineering',
        'location': 'Remote',
        'employment_type': 'full_time',
        'status': 'open',
        'salary_min': 130000, 'salary_max': 170000,
        'min_years_experience': 4,
        'required_skills': ['React', 'TypeScript', 'CSS', 'JavaScript'],
        'description': 'We are looking for a Senior Frontend Engineer to lead our web platform. You will architect and build complex React applications, mentor junior engineers, and drive technical decisions. Strong TypeScript skills required.',
        'requirements': '4+ years experience with React. TypeScript proficiency. Experience with design systems. Strong CSS/HTML fundamentals. Familiarity with testing (Jest, Cypress).',
    },
    {
        'title': 'Backend Engineer (Python)',
        'department': 'Engineering',
        'location': 'New York, NY',
        'employment_type': 'full_time',
        'status': 'open',
        'salary_min': 120000, 'salary_max': 160000,
        'min_years_experience': 3,
        'required_skills': ['Python', 'PostgreSQL', 'REST', 'Docker'],
        'description': 'Join our backend team to build scalable APIs and data pipelines. You will work with Python, PostgreSQL, and cloud infrastructure. Experience with high-traffic systems is a plus.',
        'requirements': '3+ years Python backend experience. PostgreSQL or similar. Docker/Kubernetes. REST API design. Bonus: Kafka, Redis, AWS.',
    },
    {
        'title': 'Product Designer',
        'department': 'Design',
        'location': 'San Francisco, CA',
        'employment_type': 'full_time',
        'status': 'open',
        'salary_min': 110000, 'salary_max': 145000,
        'min_years_experience': 3,
        'required_skills': ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
        'description': 'We need a Product Designer who loves solving complex UX problems. You will own end-to-end design for core product flows, conduct user research, and collaborate closely with engineering.',
        'requirements': '3+ years product design. Expert Figma user. Portfolio showing end-to-end design process. Experience with design systems. User research skills.',
    },
    {
        'title': 'DevOps Engineer',
        'department': 'Infrastructure',
        'location': 'Remote',
        'employment_type': 'full_time',
        'status': 'open',
        'salary_min': 125000, 'salary_max': 155000,
        'min_years_experience': 3,
        'required_skills': ['Kubernetes', 'Terraform', 'AWS', 'CI/CD', 'Docker'],
        'description': 'Build and maintain our cloud infrastructure on AWS. Manage Kubernetes clusters, Terraform configs, and CI/CD pipelines. Drive reliability and observability improvements.',
        'requirements': '3+ years DevOps/SRE. Kubernetes administration. Terraform. AWS (EKS, RDS, S3). CI/CD (GitHub Actions or similar). Monitoring (Datadog/Prometheus).',
    },
    {
        'title': 'Data Analyst',
        'department': 'Data',
        'location': 'Remote',
        'employment_type': 'full_time',
        'status': 'draft',
        'salary_min': 90000, 'salary_max': 120000,
        'min_years_experience': 2,
        'required_skills': ['SQL', 'Python', 'Data Analysis', 'Tableau'],
        'description': 'Join our data team to help build dashboards, run analyses, and surface insights to the business. You will work closely with product, marketing, and engineering.',
        'requirements': '2+ years data analysis. Expert SQL. Python (pandas, numpy). Tableau or similar BI tool. Excellent written communication.',
    },
]

CANDIDATES_DATA = [
    {
        'first_name': 'Aisha', 'last_name': 'Okonkwo', 'email': 'aisha.okonkwo@email.com',
        'phone': '+1 415 555 0101', 'source': 'linkedin',
        'resume_text': 'Senior Frontend Engineer with 6 years of experience. Led design system at Stripe using React, TypeScript, and CSS. Built component library used by 40+ engineers. Expert in React hooks, performance optimization, and accessibility. TypeScript, Jest, Cypress, Figma, GraphQL, Node.js.',
        'years_experience': 6,
    },
    {
        'first_name': 'Marco', 'last_name': 'Silva', 'email': 'marco.silva@email.com',
        'phone': '+1 628 555 0102', 'source': 'referral',
        'resume_text': 'UI Engineer with 3 years experience. Strong Vue.js background transitioning to React. Built customer-facing dashboards at a fintech startup. Skills: Vue, React, JavaScript, CSS, Figma. 2021-2024.',
        'years_experience': 3,
    },
    {
        'first_name': 'Priya', 'last_name': 'Menon', 'email': 'priya.menon@email.com',
        'phone': '+1 510 555 0103', 'source': 'direct',
        'resume_text': 'Frontend Developer with 5 years experience. React specialist with deep GraphQL experience. Worked at two Y Combinator startups. Skills: React, TypeScript, GraphQL, Jest, CSS-in-JS, performance optimization, accessibility. 2019-2024.',
        'years_experience': 5,
    },
    {
        'first_name': 'James', 'last_name': 'Osei', 'email': 'james.osei@email.com',
        'phone': '+1 332 555 0104', 'source': 'indeed',
        'resume_text': 'Full-stack JavaScript Engineer 4 years experience. Node.js, React, AWS, PostgreSQL. Built REST APIs and React frontends. Docker, Redis, CI/CD with GitHub Actions.',
        'years_experience': 4,
    },
    {
        'first_name': 'Lena', 'last_name': 'Braun', 'email': 'lena.braun@email.com',
        'phone': '+49 30 555 0105', 'source': 'linkedin',
        'resume_text': 'Senior Frontend Engineer 7 years experience. Led frontend architecture at SoundCloud. Expert React, TypeScript, performance optimization, accessibility. Design system architect. Mentored 8 engineers. React, TypeScript, CSS, JavaScript, a11y, Jest, Webpack, Vite. 2017-2024.',
        'years_experience': 7,
    },
    {
        'first_name': 'Kwame', 'last_name': 'Asante', 'email': 'kwame.asante@email.com',
        'phone': '+1 213 555 0106', 'source': 'referral',
        'resume_text': 'Web Engineer 4 years experience. React, Redux, CSS Modules. Built e-commerce frontend at Shopify. Strong collaborator, agile team experience. JavaScript, TypeScript basics, React, Redux, CSS.',
        'years_experience': 4,
    },
    {
        'first_name': 'Sofia', 'last_name': 'Reyes', 'email': 'sofia.reyes@email.com',
        'phone': '+34 91 555 0107', 'source': 'linkedin',
        'resume_text': 'Frontend Lead 8 years experience. Currently Staff Engineer at Figma. Led team of 12 engineers, defined frontend architecture for design editor. React expert, TypeScript, performance, WebAssembly, CSS, accessibility, design systems. 2016-2024.',
        'years_experience': 8,
    },
    {
        'first_name': 'Tom', 'last_name': 'Nguyen', 'email': 'tom.nguyen@email.com',
        'phone': '+1 408 555 0108', 'source': 'direct',
        'resume_text': 'Junior Frontend Developer 2 years experience. React, CSS, HTML. Built landing pages and simple dashboards. Learning TypeScript. Bootcamp graduate 2022.',
        'years_experience': 2,
    },
    {
        'first_name': 'Amara', 'last_name': 'Diallo', 'email': 'amara.diallo@email.com',
        'phone': '+1 718 555 0109', 'source': 'indeed',
        'resume_text': 'Frontend Developer 3 years experience. Angular and React. Built data visualization dashboards. SQL, REST APIs, JavaScript, TypeScript, Angular, React. 2021-2024.',
        'years_experience': 3,
    },
    {
        'first_name': 'Yuki', 'last_name': 'Tanaka', 'email': 'yuki.tanaka@email.com',
        'phone': '+81 3 555 0110', 'source': 'linkedin',
        'resume_text': 'Python Backend Engineer 5 years experience. Built high-scale APIs at Mercari serving 20M users. PostgreSQL, Redis, Docker, Kubernetes, AWS, Python, Django, FastAPI, SQLAlchemy, Kafka. 2019-2024.',
        'years_experience': 5,
    },
    {
        'first_name': 'Carlos', 'last_name': 'Mendez', 'email': 'carlos.mendez@email.com',
        'phone': '+1 312 555 0111', 'source': 'referral',
        'resume_text': 'Backend Engineer 4 years Python experience. REST APIs, PostgreSQL, Docker, AWS, Flask, SQLAlchemy, Celery, Redis. CI/CD. 2020-2024.',
        'years_experience': 4,
    },
    {
        'first_name': 'Fatima', 'last_name': 'Al-Hassan', 'email': 'fatima.alhassan@email.com',
        'phone': '+971 4 555 0112', 'source': 'direct',
        'resume_text': 'Product Designer 5 years experience. Led redesign of Careem app (10M+ users). Expert Figma, user research, prototyping, design systems. Cross-functional team collaboration. 2019-2024.',
        'years_experience': 5,
    },
    {
        'first_name': 'David', 'last_name': 'Kim', 'email': 'david.kim@email.com',
        'phone': '+1 650 555 0113', 'source': 'linkedin',
        'resume_text': 'DevOps / SRE 6 years experience. Kubernetes, Terraform, AWS (EKS, RDS, S3, Lambda), Docker, CI/CD, Datadog, PagerDuty. Reduced deployment time 70% at Twilio. 2018-2024.',
        'years_experience': 6,
    },
]

APP_STAGES = {
    'aisha.okonkwo@email.com': 'recruiter_review',
    'marco.silva@email.com': 'recruiter_review',
    'priya.menon@email.com': 'phone_screen',
    'james.osei@email.com': 'phone_screen',
    'lena.braun@email.com': 'interviewing',
    'kwame.asante@email.com': 'interviewing',
    'sofia.reyes@email.com': 'offer_extended',
    'tom.nguyen@email.com': 'ai_screening',
    'amara.diallo@email.com': 'ai_screening',
}


def run():
    with app.app_context():
        print("Dropping existing tables...")
        db.drop_all()
        print("Creating tables...")
        db.create_all()

        print("Creating tenant: Acme Corp...")
        tenant = Tenant(name='Acme Corp', slug='acme', plan='pro')
        db.session.add(tenant)
        db.session.flush()

        print("Creating users...")
        users = {}
        user_data = [
            ('admin@acme.com',    'Admin',   'User',    'admin'),
            ('sarah@acme.com',    'Sarah',   'Rahman',  'recruiter'),
            ('tom.k@acme.com',    'Tom',     'Keller',  'hiring_manager'),
            ('diana@acme.com',    'Diana',   'Lee',     'interviewer'),
            ('marcus@acme.com',   'Marcus',  'Torres',  'hiring_manager'),
        ]
        for email, fn, ln, role in user_data:
            u = User(
                tenant_id=tenant.id, email=email,
                password_hash=generate_password_hash('password123'),
                first_name=fn, last_name=ln, role=role
            )
            db.session.add(u)
            users[email] = u
        db.session.flush()

        print("Creating jobs...")
        jobs = {}
        for jd in JOBS_DATA:
            j = Job(
                tenant_id=tenant.id,
                title=jd['title'], department=jd['department'],
                location=jd['location'], employment_type=jd['employment_type'],
                status=jd['status'], salary_min=jd['salary_min'], salary_max=jd['salary_max'],
                description=jd['description'], requirements=jd['requirements'],
                required_skills=json.dumps(jd['required_skills']),
                min_years_experience=jd['min_years_experience'],
                created_by=users['sarah@acme.com'].id
            )
            db.session.add(j)
            jobs[jd['title']] = j
        db.session.flush()

        print("Creating candidates & applications...")
        fe_job = jobs['Senior Frontend Engineer']
        for cd in CANDIDATES_DATA:
            c = Candidate(
                tenant_id=tenant.id,
                first_name=cd['first_name'], last_name=cd['last_name'],
                email=cd['email'], phone=cd['phone'], source=cd['source'],
                resume_text=cd['resume_text'],
                years_experience=cd['years_experience'],
                parsed_skills=json.dumps(extract_skills_from_text(cd['resume_text']))
            )
            db.session.add(c)
            db.session.flush()

            target_stage = APP_STAGES.get(cd['email'])
            if not target_stage:
                continue

            ai_score, signals = score_application(
                c.resume_text, c.parsed_skills, c.years_experience,
                fe_job.required_skills, fe_job.min_years_experience, fe_job.description
            )

            app_obj = Application(
                job_id=fe_job.id, candidate_id=c.id,
                stage=target_stage, ai_score=ai_score,
                ai_signals=json.dumps(signals),
                source=cd['source'],
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 20))
            )
            db.session.add(app_obj)
            db.session.flush()

            stages_up_to = []
            all_stages = ['applied', 'ai_screening', 'recruiter_review', 'phone_screen', 'interviewing', 'offer_extended']
            for s in all_stages:
                stages_up_to.append(s)
                if s == target_stage:
                    break

            prev = None
            for st in stages_up_to:
                h = StageHistory(
                    application_id=app_obj.id, from_stage=prev, to_stage=st,
                    changed_by=users['sarah@acme.com'].id,
                    created_at=app_obj.created_at + timedelta(days=stages_up_to.index(st) * 2)
                )
                db.session.add(h)
                prev = st

        db.session.flush()

        print("Creating interviews...")
        lena_app = Application.query.join(Candidate).filter(Candidate.email == 'lena.braun@email.com').first()
        kwame_app = Application.query.join(Candidate).filter(Candidate.email == 'kwame.asante@email.com').first()
        sofia_app = Application.query.join(Candidate).filter(Candidate.email == 'sofia.reyes@email.com').first()
        priya_app = Application.query.join(Candidate).filter(Candidate.email == 'priya.menon@email.com').first()

        interview_data = [
            (priya_app, 'phone', datetime.utcnow() - timedelta(days=3), 30, users['sarah@acme.com'],
             [users['sarah@acme.com']], True,
             {'communication': 4, 'technical': 4, 'culture': 5, 'problem_solving': 4}, 4, 'yes',
             'Solid React fundamentals, articulate communicator. Clear passion for frontend craft. Recommend advancing to technical round.'),
            (lena_app, 'technical', datetime.utcnow() + timedelta(days=1), 60, users['tom.k@acme.com'],
             [users['tom.k@acme.com'], users['diana@acme.com']], False, {}, None, None, ''),
            (kwame_app, 'panel', datetime.utcnow() + timedelta(days=2), 45, users['sarah@acme.com'],
             [users['sarah@acme.com'], users['tom.k@acme.com']], False, {}, None, None, ''),
            (sofia_app, 'final', datetime.utcnow() - timedelta(days=5), 60, users['marcus@acme.com'],
             [users['marcus@acme.com']], True,
             {'communication': 5, 'technical': 5, 'culture': 5, 'problem_solving': 5}, 5, 'strong_yes',
             'Exceptional candidate. Staff-level expertise, led design system at Figma. Unanimous hire — extend offer immediately.'),
        ]

        for app_obj, itype, sched, dur, creator, interviewers, submitted, scores, rating, rec, fb in interview_data:
            if not app_obj:
                continue
            iv = Interview(
                application_id=app_obj.id, interview_type=itype,
                scheduled_at=sched, duration_minutes=dur,
                status='completed' if submitted else 'scheduled',
                created_by=creator.id,
                notes=f'{itype.capitalize()} interview for {app_obj.candidate.full_name}'
            )
            db.session.add(iv)
            db.session.flush()
            for u in interviewers:
                db.session.add(InterviewParticipant(interview_id=iv.id, user_id=u.id))
            if submitted and scores:
                sc = Scorecard(
                    interview_id=iv.id, submitted_by=creator.id,
                    scores=json.dumps(scores), overall_rating=rating,
                    recommendation=rec, feedback=fb
                )
                db.session.add(sc)

        print("Creating offer for Sofia Reyes...")
        sofia_app = Application.query.join(Candidate).filter(Candidate.email == 'sofia.reyes@email.com').first()
        if sofia_app:
            offer = Offer(
                application_id=sofia_app.id, salary=165000, currency='USD',
                start_date=(datetime.utcnow() + timedelta(days=30)).date(),
                equity='0.15%', bonus=15000,
                notes='Top-of-band offer. Approved by Marcus.',
                status='sent', sent_at=datetime.utcnow() - timedelta(days=2),
                created_by=users['sarah@acme.com'].id
            )
            db.session.add(offer)

        print("Adding Python Backend Engineer candidates...")
        py_job = jobs['Backend Engineer (Python)']
        for cd in [c for c in CANDIDATES_DATA if c['email'] in ('yuki.tanaka@email.com', 'carlos.mendez@email.com')]:
            cand = Candidate.query.filter_by(email=cd['email'], tenant_id=tenant.id).first()
            if not cand:
                continue
            ai_score, signals = score_application(
                cand.resume_text, cand.parsed_skills, cand.years_experience,
                py_job.required_skills, py_job.min_years_experience, py_job.description
            )
            a = Application(
                job_id=py_job.id, candidate_id=cand.id,
                stage='recruiter_review', ai_score=ai_score,
                ai_signals=json.dumps(signals), source=cand.source,
                created_at=datetime.utcnow() - timedelta(days=5)
            )
            db.session.add(a)

        db.session.commit()
        print("\nSeed complete!")
        print("=" * 40)
        print("Login credentials:")
        print("  Admin:          admin@acme.com    / password123")
        print("  Recruiter:      sarah@acme.com    / password123")
        print("  Hiring Manager: tom.k@acme.com    / password123")
        print("=" * 40)
        print(f"Tenant: Acme Corp")
        print(f"Jobs:   {len(JOBS_DATA)}")
        print(f"Candidates: {len(CANDIDATES_DATA)}")

if __name__ == '__main__':
    run()
