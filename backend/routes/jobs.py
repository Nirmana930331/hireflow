from flask import Blueprint, request, jsonify, g
from backend.models import db, Job, Application
from backend.middleware.auth import token_required
from datetime import datetime
import json

jobs_bp = Blueprint('jobs', __name__)

@jobs_bp.route('', methods=['GET'])
@token_required
def list_jobs():
    status = request.args.get('status')
    q = Job.query.filter_by(tenant_id=g.tenant_id)
    if status:
        q = q.filter_by(status=status)
    jobs = q.order_by(Job.created_at.desc()).all()
    return jsonify([_job_dict(j) for j in jobs])

@jobs_bp.route('', methods=['POST'])
@token_required
def create_job():
    data = request.get_json()
    if not data.get('title'):
        return jsonify({'error': 'title required'}), 400
    job = Job(
        tenant_id=g.tenant_id,
        title=data['title'],
        department=data.get('department'),
        location=data.get('location'),
        employment_type=data.get('employment_type', 'full_time'),
        description=data.get('description'),
        requirements=data.get('requirements'),
        salary_min=data.get('salary_min'),
        salary_max=data.get('salary_max'),
        status=data.get('status', 'draft'),
        required_skills=json.dumps(data.get('required_skills', [])),
        min_years_experience=data.get('min_years_experience', 0),
        created_by=g.current_user.id
    )
    db.session.add(job)
    db.session.commit()
    return jsonify(_job_dict(job)), 201

@jobs_bp.route('/<job_id>', methods=['GET'])
@token_required
def get_job(job_id):
    job = Job.query.filter_by(id=job_id, tenant_id=g.tenant_id).first_or_404()
    return jsonify(_job_dict(job, detail=True))

@jobs_bp.route('/<job_id>', methods=['PUT'])
@token_required
def update_job(job_id):
    job = Job.query.filter_by(id=job_id, tenant_id=g.tenant_id).first_or_404()
    data = request.get_json()
    for field in ['title','department','location','employment_type','description','requirements','salary_min','salary_max','status','min_years_experience']:
        if field in data:
            setattr(job, field, data[field])
    if 'required_skills' in data:
        job.required_skills = json.dumps(data['required_skills'])
    job.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(_job_dict(job))

@jobs_bp.route('/<job_id>', methods=['DELETE'])
@token_required
def delete_job(job_id):
    job = Job.query.filter_by(id=job_id, tenant_id=g.tenant_id).first_or_404()
    db.session.delete(job)
    db.session.commit()
    return '', 204

@jobs_bp.route('/<job_id>/stats', methods=['GET'])
@token_required
def job_stats(job_id):
    job = Job.query.filter_by(id=job_id, tenant_id=g.tenant_id).first_or_404()
    apps = Application.query.filter_by(job_id=job_id).all()
    by_stage = {}
    for a in apps:
        by_stage[a.stage] = by_stage.get(a.stage, 0) + 1
    return jsonify({'total': len(apps), 'by_stage': by_stage})

def _job_dict(j, detail=False):
    d = {
        'id': j.id, 'title': j.title, 'department': j.department,
        'location': j.location, 'employment_type': j.employment_type,
        'status': j.status, 'salary_min': j.salary_min, 'salary_max': j.salary_max,
        'min_years_experience': j.min_years_experience,
        'required_skills': json.loads(j.required_skills or '[]'),
        'created_at': j.created_at.isoformat(),
        'application_count': len(j.applications)
    }
    if detail:
        d.update({'description': j.description, 'requirements': j.requirements})
    return d
