from flask import Blueprint, request, jsonify, g, current_app
from backend.models import db, Candidate, Application, Job, StageHistory
from backend.middleware.auth import token_required
from backend.services.ai_screening import score_application, extract_skills_from_text, estimate_years_experience
import json, os

candidates_bp = Blueprint('candidates', __name__)

@candidates_bp.route('', methods=['GET'])
@token_required
def list_candidates():
    search = request.args.get('q', '')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    q = Candidate.query.filter_by(tenant_id=g.tenant_id)
    if search:
        q = q.filter(
            (Candidate.first_name.ilike(f'%{search}%')) |
            (Candidate.last_name.ilike(f'%{search}%')) |
            (Candidate.email.ilike(f'%{search}%'))
        )
    total = q.count()
    candidates = q.order_by(Candidate.created_at.desc()).offset((page-1)*per_page).limit(per_page).all()
    return jsonify({'candidates': [_candidate_dict(c) for c in candidates], 'total': total, 'page': page, 'per_page': per_page})

@candidates_bp.route('', methods=['POST'])
@token_required
def create_candidate():
    data = request.get_json()
    if not data.get('first_name') or not data.get('last_name') or not data.get('email'):
        return jsonify({'error': 'first_name, last_name, email required'}), 400
    existing = Candidate.query.filter_by(tenant_id=g.tenant_id, email=data['email']).first()
    if existing:
        return jsonify({'error': 'Candidate with this email already exists', 'candidate_id': existing.id}), 409
    c = Candidate(
        tenant_id=g.tenant_id,
        first_name=data['first_name'], last_name=data['last_name'],
        email=data['email'], phone=data.get('phone'),
        linkedin_url=data.get('linkedin_url'),
        source=data.get('source', 'direct'),
        resume_text=data.get('resume_text', ''),
        years_experience=data.get('years_experience', 0),
    )
    if c.resume_text:
        skills = extract_skills_from_text(c.resume_text)
        c.parsed_skills = json.dumps(skills)
        if not data.get('years_experience'):
            c.years_experience = estimate_years_experience(c.resume_text)
    db.session.add(c)
    db.session.commit()
    return jsonify(_candidate_dict(c)), 201

@candidates_bp.route('/<cid>', methods=['GET'])
@token_required
def get_candidate(cid):
    c = Candidate.query.filter_by(id=cid, tenant_id=g.tenant_id).first_or_404()
    return jsonify(_candidate_dict(c, detail=True))

@candidates_bp.route('/<cid>', methods=['PUT'])
@token_required
def update_candidate(cid):
    c = Candidate.query.filter_by(id=cid, tenant_id=g.tenant_id).first_or_404()
    data = request.get_json()
    for field in ['first_name','last_name','email','phone','linkedin_url','source','resume_text','years_experience']:
        if field in data:
            setattr(c, field, data[field])
    if 'resume_text' in data and data['resume_text']:
        c.parsed_skills = json.dumps(extract_skills_from_text(data['resume_text']))
    db.session.commit()
    return jsonify(_candidate_dict(c))

@candidates_bp.route('/<cid>/applications', methods=['GET'])
@token_required
def candidate_applications(cid):
    c = Candidate.query.filter_by(id=cid, tenant_id=g.tenant_id).first_or_404()
    apps = Application.query.filter_by(candidate_id=cid).all()
    return jsonify([_app_dict(a) for a in apps])

def _candidate_dict(c, detail=False):
    d = {
        'id': c.id, 'first_name': c.first_name, 'last_name': c.last_name,
        'full_name': c.full_name, 'email': c.email, 'phone': c.phone,
        'linkedin_url': c.linkedin_url, 'source': c.source,
        'years_experience': c.years_experience,
        'parsed_skills': json.loads(c.parsed_skills or '[]'),
        'resume_filename': c.resume_filename,
        'created_at': c.created_at.isoformat(),
        'application_count': len(c.applications),
    }
    if detail:
        d['resume_text'] = c.resume_text
    return d

def _app_dict(a):
    return {
        'id': a.id, 'stage': a.stage, 'ai_score': a.ai_score,
        'job': {'id': a.job.id, 'title': a.job.title} if a.job else None,
        'created_at': a.created_at.isoformat()
    }
