from flask import Blueprint, request, jsonify, g
from backend.models import db, Application, Candidate, Job, StageHistory, PIPELINE_STAGES
from backend.middleware.auth import token_required
from backend.services.ai_screening import score_application
import json
from datetime import datetime

applications_bp = Blueprint('applications', __name__)

@applications_bp.route('', methods=['GET'])
@token_required
def list_applications():
    job_id = request.args.get('job_id')
    stage = request.args.get('stage')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))

    q = Application.query.join(Job).filter(Job.tenant_id == g.tenant_id)
    if job_id:
        q = q.filter(Application.job_id == job_id)
    if stage:
        q = q.filter(Application.stage == stage)

    total = q.count()
    apps = q.order_by(Application.created_at.desc()).offset((page-1)*per_page).limit(per_page).all()
    return jsonify({'applications': [_app_dict(a) for a in apps], 'total': total})

@applications_bp.route('', methods=['POST'])
@token_required
def create_application():
    data = request.get_json()
    if not data.get('candidate_id') or not data.get('job_id'):
        return jsonify({'error': 'candidate_id and job_id required'}), 400

    job = Job.query.filter_by(id=data['job_id'], tenant_id=g.tenant_id).first_or_404()
    candidate = Candidate.query.filter_by(id=data['candidate_id'], tenant_id=g.tenant_id).first_or_404()

    existing = Application.query.filter_by(candidate_id=candidate.id, job_id=job.id).first()
    if existing:
        return jsonify({'error': 'Application already exists', 'application_id': existing.id}), 409

    app = Application(
        job_id=job.id,
        candidate_id=candidate.id,
        stage='applied',
        source=data.get('source', 'direct'),
        cover_letter=data.get('cover_letter'),
        notes=data.get('notes'),
    )
    db.session.add(app)
    db.session.flush()

    history = StageHistory(application_id=app.id, from_stage=None, to_stage='applied', changed_by=g.current_user.id)
    db.session.add(history)

    ai_score, signals = score_application(
        candidate.resume_text, candidate.parsed_skills, candidate.years_experience,
        job.required_skills, job.min_years_experience, job.description
    )
    app.ai_score = ai_score
    app.ai_signals = json.dumps(signals)
    app.stage = 'ai_screening'
    h2 = StageHistory(application_id=app.id, from_stage='applied', to_stage='ai_screening', changed_by=g.current_user.id, reason='auto')
    db.session.add(h2)

    db.session.commit()
    return jsonify(_app_dict(app, detail=True)), 201

@applications_bp.route('/<app_id>', methods=['GET'])
@token_required
def get_application(app_id):
    app = _get_app(app_id)
    return jsonify(_app_dict(app, detail=True))

@applications_bp.route('/<app_id>/stage', methods=['PUT'])
@token_required
def update_stage(app_id):
    app = _get_app(app_id)
    data = request.get_json()
    new_stage = data.get('stage')
    if new_stage not in PIPELINE_STAGES + ['rejected', 'withdrawn']:
        return jsonify({'error': f'Invalid stage: {new_stage}'}), 400

    old_stage = app.stage
    app.stage = new_stage
    app.updated_at = datetime.utcnow()

    if data.get('rejection_reason'):
        app.rejection_reason = data['rejection_reason']

    history = StageHistory(
        application_id=app.id, from_stage=old_stage, to_stage=new_stage,
        changed_by=g.current_user.id, reason=data.get('reason')
    )
    db.session.add(history)
    db.session.commit()
    return jsonify(_app_dict(app, detail=True))

@applications_bp.route('/<app_id>/notes', methods=['PUT'])
@token_required
def update_notes(app_id):
    app = _get_app(app_id)
    data = request.get_json()
    app.notes = data.get('notes', '')
    db.session.commit()
    return jsonify({'notes': app.notes})

@applications_bp.route('/<app_id>/history', methods=['GET'])
@token_required
def get_history(app_id):
    app = _get_app(app_id)
    history = StageHistory.query.filter_by(application_id=app_id).order_by(StageHistory.created_at.asc()).all()
    return jsonify([{
        'id': h.id, 'from_stage': h.from_stage, 'to_stage': h.to_stage,
        'reason': h.reason, 'created_at': h.created_at.isoformat()
    } for h in history])

@applications_bp.route('/pipeline', methods=['GET'])
@token_required
def pipeline_board():
    job_id = request.args.get('job_id')
    if not job_id:
        return jsonify({'error': 'job_id required'}), 400
    job = Job.query.filter_by(id=job_id, tenant_id=g.tenant_id).first_or_404()
    apps = Application.query.filter_by(job_id=job_id).all()
    board = {stage: [] for stage in PIPELINE_STAGES + ['rejected', 'withdrawn']}
    for a in apps:
        board.setdefault(a.stage, []).append(_app_dict(a))
    return jsonify({'job': {'id': job.id, 'title': job.title}, 'board': board})

def _get_app(app_id):
    app = Application.query.join(Job).filter(Application.id == app_id, Job.tenant_id == g.tenant_id).first_or_404()
    return app

def _app_dict(a, detail=False):
    signals = {}
    try:
        signals = json.loads(a.ai_signals or '{}')
    except:
        pass
    d = {
        'id': a.id, 'stage': a.stage, 'ai_score': a.ai_score,
        'ai_signals': signals,
        'rejection_reason': a.rejection_reason,
        'source': a.source,
        'created_at': a.created_at.isoformat(),
        'updated_at': a.updated_at.isoformat(),
        'candidate': {
            'id': a.candidate.id, 'full_name': a.candidate.full_name,
            'email': a.candidate.email, 'phone': a.candidate.phone,
            'years_experience': a.candidate.years_experience,
            'parsed_skills': json.loads(a.candidate.parsed_skills or '[]'),
        },
        'job': {'id': a.job.id, 'title': a.job.title, 'department': a.job.department},
    }
    if detail:
        d['notes'] = a.notes
        d['cover_letter'] = a.cover_letter
    return d
