from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()

def generate_uuid():
    return str(uuid.uuid4())

class Tenant(db.Model):
    __tablename__ = 'tenants'
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    plan = db.Column(db.String(50), default='starter')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    users = db.relationship('User', backref='tenant', lazy=True, cascade='all, delete-orphan')
    jobs = db.relationship('Job', backref='tenant', lazy=True, cascade='all, delete-orphan')
    candidates = db.relationship('Candidate', backref='tenant', lazy=True, cascade='all, delete-orphan')

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    tenant_id = db.Column(db.String, db.ForeignKey('tenants.id'), nullable=False)
    email = db.Column(db.String(200), nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    role = db.Column(db.String(50), default='recruiter')  # admin, recruiter, hiring_manager, interviewer
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('tenant_id', 'email'),)

    @property
    def full_name(self):
        return f"{self.first_name or ''} {self.last_name or ''}".strip() or self.email

class Job(db.Model):
    __tablename__ = 'jobs'
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    tenant_id = db.Column(db.String, db.ForeignKey('tenants.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    department = db.Column(db.String(100))
    location = db.Column(db.String(200))
    employment_type = db.Column(db.String(50), default='full_time')
    description = db.Column(db.Text)
    requirements = db.Column(db.Text)
    salary_min = db.Column(db.Integer)
    salary_max = db.Column(db.Integer)
    status = db.Column(db.String(50), default='draft')  # draft, open, closed, archived
    required_skills = db.Column(db.Text, default='[]')   # JSON array
    min_years_experience = db.Column(db.Integer, default=0)
    created_by = db.Column(db.String, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    applications = db.relationship('Application', backref='job', lazy=True, cascade='all, delete-orphan')

class Candidate(db.Model):
    __tablename__ = 'candidates'
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    tenant_id = db.Column(db.String, db.ForeignKey('tenants.id'), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(50))
    linkedin_url = db.Column(db.String(300))
    resume_filename = db.Column(db.String(300))
    resume_text = db.Column(db.Text)
    parsed_skills = db.Column(db.Text, default='[]')  # JSON
    years_experience = db.Column(db.Float, default=0)
    source = db.Column(db.String(100), default='direct')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    applications = db.relationship('Application', backref='candidate', lazy=True, cascade='all, delete-orphan')
    __table_args__ = (db.UniqueConstraint('tenant_id', 'email'),)

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

PIPELINE_STAGES = ['applied', 'ai_screening', 'recruiter_review', 'phone_screen', 'interviewing', 'hiring_decision', 'offer_extended', 'offer_accepted', 'hired']

class Application(db.Model):
    __tablename__ = 'applications'
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    job_id = db.Column(db.String, db.ForeignKey('jobs.id'), nullable=False)
    candidate_id = db.Column(db.String, db.ForeignKey('candidates.id'), nullable=False)
    stage = db.Column(db.String(50), default='applied')
    ai_score = db.Column(db.Float)
    ai_signals = db.Column(db.Text, default='{}')  # JSON breakdown
    rejection_reason = db.Column(db.String(200))
    notes = db.Column(db.Text)
    source = db.Column(db.String(100))
    cover_letter = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    stage_history = db.relationship('StageHistory', backref='application', lazy=True, cascade='all, delete-orphan')
    interviews = db.relationship('Interview', backref='application', lazy=True, cascade='all, delete-orphan')
    offers = db.relationship('Offer', backref='application', lazy=True, cascade='all, delete-orphan')
    __table_args__ = (db.UniqueConstraint('job_id', 'candidate_id'),)

class StageHistory(db.Model):
    __tablename__ = 'stage_history'
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    application_id = db.Column(db.String, db.ForeignKey('applications.id'), nullable=False)
    from_stage = db.Column(db.String(50))
    to_stage = db.Column(db.String(50), nullable=False)
    changed_by = db.Column(db.String, db.ForeignKey('users.id'))
    reason = db.Column(db.String(300))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Interview(db.Model):
    __tablename__ = 'interviews'
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    application_id = db.Column(db.String, db.ForeignKey('applications.id'), nullable=False)
    interview_type = db.Column(db.String(50), default='phone')  # phone, technical, panel, final, debrief
    scheduled_at = db.Column(db.DateTime, nullable=False)
    duration_minutes = db.Column(db.Integer, default=60)
    location = db.Column(db.String(300))  # room / video link
    notes = db.Column(db.Text)
    status = db.Column(db.String(50), default='scheduled')  # scheduled, completed, cancelled, no_show
    created_by = db.Column(db.String, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    interviewers = db.relationship('InterviewParticipant', backref='interview', lazy=True, cascade='all, delete-orphan')
    scorecards = db.relationship('Scorecard', backref='interview', lazy=True, cascade='all, delete-orphan')

class InterviewParticipant(db.Model):
    __tablename__ = 'interview_participants'
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    interview_id = db.Column(db.String, db.ForeignKey('interviews.id'), nullable=False)
    user_id = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)

class Scorecard(db.Model):
    __tablename__ = 'scorecards'
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    interview_id = db.Column(db.String, db.ForeignKey('interviews.id'), nullable=False)
    submitted_by = db.Column(db.String, db.ForeignKey('users.id'), nullable=False)
    scores = db.Column(db.Text, default='{}')  # JSON {communication, technical, culture, problem_solving}
    overall_rating = db.Column(db.Integer)  # 1-5
    recommendation = db.Column(db.String(50))  # strong_yes, yes, no, strong_no
    feedback = db.Column(db.Text)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)

class Offer(db.Model):
    __tablename__ = 'offers'
    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    application_id = db.Column(db.String, db.ForeignKey('applications.id'), nullable=False)
    salary = db.Column(db.Integer)
    currency = db.Column(db.String(10), default='USD')
    start_date = db.Column(db.Date)
    equity = db.Column(db.String(100))
    bonus = db.Column(db.Integer)
    notes = db.Column(db.Text)
    status = db.Column(db.String(50), default='draft')  # draft, sent, accepted, declined, expired
    expires_at = db.Column(db.DateTime)
    sent_at = db.Column(db.DateTime)
    responded_at = db.Column(db.DateTime)
    created_by = db.Column(db.String, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
