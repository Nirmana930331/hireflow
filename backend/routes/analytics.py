from flask import Blueprint, request, jsonify, g
from backend.models import db, Application, Job, Candidate, Interview, Offer, StageHistory, PIPELINE_STAGES
from backend.middleware.auth import token_required
from sqlalchemy import func
from datetime import datetime, timedelta

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/overview', methods=['GET'])
@token_required
def overview():
    days = int(request.args.get('days', 30))
    since = datetime.utcnow() - timedelta(days=days)

    total_apps = Application.query.join(Job).filter(Job.tenant_id == g.tenant_id).count()
    new_apps = Application.query.join(Job).filter(Job.tenant_id == g.tenant_id, Application.created_at >= since).count()
    open_jobs = Job.query.filter_by(tenant_id=g.tenant_id, status='open').count()
    total_candidates = Candidate.query.filter_by(tenant_id=g.tenant_id).count()

    hired = Application.query.join(Job).filter(Job.tenant_id == g.tenant_id, Application.stage == 'hired').count()

    interviews_count = Interview.query.join(Application).join(Job).filter(
        Job.tenant_id == g.tenant_id, Interview.scheduled_at >= since
    ).count()

    pending_scorecards = Interview.query.join(Application).join(Job).filter(
        Job.tenant_id == g.tenant_id,
        Interview.status == 'scheduled',
        Interview.scheduled_at < datetime.utcnow()
    ).count()

    avg_score_row = db.session.query(func.avg(Application.ai_score)).join(Job).filter(
        Job.tenant_id == g.tenant_id, Application.ai_score != None
    ).scalar()

    return jsonify({
        'total_applications': total_apps,
        'new_applications': new_apps,
        'open_jobs': open_jobs,
        'total_candidates': total_candidates,
        'hired': hired,
        'interviews_this_period': interviews_count,
        'pending_scorecards': pending_scorecards,
        'avg_ai_score': round(float(avg_score_row), 1) if avg_score_row else 0,
    })

@analytics_bp.route('/funnel', methods=['GET'])
@token_required
def funnel():
    job_id = request.args.get('job_id')
    q = Application.query.join(Job).filter(Job.tenant_id == g.tenant_id)
    if job_id:
        q = q.filter(Application.job_id == job_id)
    apps = q.all()
    stage_order = PIPELINE_STAGES + ['rejected', 'withdrawn']
    counts = {s: 0 for s in stage_order}
    for a in apps:
        counts[a.stage] = counts.get(a.stage, 0) + 1
    total = len(apps)
    result = []
    for stage in stage_order:
        c = counts[stage]
        result.append({'stage': stage, 'count': c, 'pct': round(c/total*100, 1) if total else 0})
    return jsonify(result)

@analytics_bp.route('/time-to-hire', methods=['GET'])
@token_required
def time_to_hire():
    apps = Application.query.join(Job).filter(
        Job.tenant_id == g.tenant_id, Application.stage == 'hired'
    ).all()
    if not apps:
        return jsonify({'avg_days': 0, 'median_days': 0, 'count': 0})
    durations = [(a.updated_at - a.created_at).days for a in apps]
    durations.sort()
    avg = sum(durations) / len(durations)
    median = durations[len(durations)//2]
    return jsonify({'avg_days': round(avg, 1), 'median_days': median, 'count': len(apps)})

@analytics_bp.route('/sources', methods=['GET'])
@token_required
def sources():
    rows = db.session.query(Application.source, func.count(Application.id)).join(Job).filter(
        Job.tenant_id == g.tenant_id
    ).group_by(Application.source).all()
    return jsonify([{'source': r[0] or 'unknown', 'count': r[1]} for r in rows])

@analytics_bp.route('/pipeline-velocity', methods=['GET'])
@token_required
def pipeline_velocity():
    rows = db.session.query(
        StageHistory.from_stage, StageHistory.to_stage,
        func.avg(func.julianday(StageHistory.created_at)).label('avg_days')
    ).join(Application).join(Job).filter(
        Job.tenant_id == g.tenant_id
    ).group_by(StageHistory.from_stage, StageHistory.to_stage).all()
    return jsonify([{
        'from_stage': r[0], 'to_stage': r[1],
    } for r in rows])
