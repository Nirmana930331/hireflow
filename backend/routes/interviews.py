from flask import Blueprint, request, jsonify, g
from backend.models import db, Interview, InterviewParticipant, Scorecard, Application, Job, User
from backend.middleware.auth import token_required
from datetime import datetime
import json

interviews_bp = Blueprint('interviews', __name__)

@interviews_bp.route('', methods=['GET'])
@token_required
def list_interviews():
    job_id = request.args.get('job_id')
    application_id = request.args.get('application_id')
    start = request.args.get('start')
    end = request.args.get('end')

    q = Interview.query.join(Application).join(Job).filter(Job.tenant_id == g.tenant_id)
    if job_id:
        q = q.filter(Application.job_id == job_id)
    if application_id:
        q = q.filter(Interview.application_id == application_id)
    if start:
        q = q.filter(Interview.scheduled_at >= datetime.fromisoformat(start))
    if end:
        q = q.filter(Interview.scheduled_at <= datetime.fromisoformat(end))

    interviews = q.order_by(Interview.scheduled_at.asc()).all()
    return jsonify([_interview_dict(i) for i in interviews])

@interviews_bp.route('', methods=['POST'])
@token_required
def create_interview():
    data = request.get_json()
    required = ['application_id', 'scheduled_at', 'interview_type']
    for f in required:
        if not data.get(f):
            return jsonify({'error': f'{f} required'}), 400

    app = Application.query.join(Job).filter(
        Application.id == data['application_id'], Job.tenant_id == g.tenant_id
    ).first_or_404()

    interview = Interview(
        application_id=app.id,
        interview_type=data['interview_type'],
        scheduled_at=datetime.fromisoformat(data['scheduled_at']),
        duration_minutes=data.get('duration_minutes', 60),
        location=data.get('location'),
        notes=data.get('notes'),
        status='scheduled',
        created_by=g.current_user.id
    )
    db.session.add(interview)
    db.session.flush()

    for user_id in data.get('interviewer_ids', []):
        user = User.query.filter_by(id=user_id, tenant_id=g.tenant_id).first()
        if user:
            p = InterviewParticipant(interview_id=interview.id, user_id=user.id)
            db.session.add(p)

    db.session.commit()
    return jsonify(_interview_dict(interview)), 201

@interviews_bp.route('/<iid>', methods=['GET'])
@token_required
def get_interview(iid):
    interview = _get_interview(iid)
    return jsonify(_interview_dict(interview, detail=True))

@interviews_bp.route('/<iid>', methods=['PUT'])
@token_required
def update_interview(iid):
    interview = _get_interview(iid)
    data = request.get_json()
    for field in ['interview_type','duration_minutes','location','notes','status']:
        if field in data:
            setattr(interview, field, data[field])
    if 'scheduled_at' in data:
        interview.scheduled_at = datetime.fromisoformat(data['scheduled_at'])
    if 'interviewer_ids' in data:
        InterviewParticipant.query.filter_by(interview_id=interview.id).delete()
        for user_id in data['interviewer_ids']:
            user = User.query.filter_by(id=user_id, tenant_id=g.tenant_id).first()
            if user:
                p = InterviewParticipant(interview_id=interview.id, user_id=user.id)
                db.session.add(p)
    db.session.commit()
    return jsonify(_interview_dict(interview))

@interviews_bp.route('/<iid>', methods=['DELETE'])
@token_required
def delete_interview(iid):
    interview = _get_interview(iid)
    db.session.delete(interview)
    db.session.commit()
    return '', 204

@interviews_bp.route('/<iid>/scorecard', methods=['POST'])
@token_required
def submit_scorecard(iid):
    interview = _get_interview(iid)
    data = request.get_json()
    existing = Scorecard.query.filter_by(interview_id=iid, submitted_by=g.current_user.id).first()
    if existing:
        return jsonify({'error': 'Scorecard already submitted'}), 409

    sc = Scorecard(
        interview_id=iid,
        submitted_by=g.current_user.id,
        scores=json.dumps(data.get('scores', {})),
        overall_rating=data.get('overall_rating'),
        recommendation=data.get('recommendation'),
        feedback=data.get('feedback'),
    )
    db.session.add(sc)
    db.session.commit()
    return jsonify(_scorecard_dict(sc)), 201

@interviews_bp.route('/<iid>/scorecard', methods=['GET'])
@token_required
def get_scorecards(iid):
    interview = _get_interview(iid)
    scorecards = Scorecard.query.filter_by(interview_id=iid).all()
    return jsonify([_scorecard_dict(sc) for sc in scorecards])

def _get_interview(iid):
    return Interview.query.join(Application).join(Job).filter(
        Interview.id == iid, Job.tenant_id == g.tenant_id
    ).first_or_404()

def _interview_dict(i, detail=False):
    participants = []
    for p in i.interviewers:
        u = User.query.get(p.user_id)
        if u:
            participants.append({'id': u.id, 'full_name': u.full_name, 'email': u.email})

    app = i.application
    d = {
        'id': i.id,
        'application_id': i.application_id,
        'interview_type': i.interview_type,
        'scheduled_at': i.scheduled_at.isoformat(),
        'duration_minutes': i.duration_minutes,
        'location': i.location,
        'status': i.status,
        'interviewers': participants,
        'scorecard_count': len(i.scorecards),
        'scorecards_submitted': sum(1 for sc in i.scorecards),
        'candidate': {
            'id': app.candidate.id,
            'full_name': app.candidate.full_name,
        },
        'job': {'id': app.job.id, 'title': app.job.title},
    }
    if detail:
        d['notes'] = i.notes
        d['scorecards'] = [_scorecard_dict(sc) for sc in i.scorecards]
    return d

def _scorecard_dict(sc):
    submitter = User.query.get(sc.submitted_by)
    return {
        'id': sc.id,
        'submitted_by': {'id': submitter.id, 'full_name': submitter.full_name} if submitter else None,
        'scores': json.loads(sc.scores or '{}'),
        'overall_rating': sc.overall_rating,
        'recommendation': sc.recommendation,
        'feedback': sc.feedback,
        'submitted_at': sc.submitted_at.isoformat(),
    }
