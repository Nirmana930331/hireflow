from flask import Blueprint, request, jsonify, g
from backend.models import db, Offer, Application, Job
from backend.middleware.auth import token_required
from datetime import datetime

offers_bp = Blueprint('offers', __name__)

@offers_bp.route('', methods=['GET'])
@token_required
def list_offers():
    q = Offer.query.join(Application).join(Job).filter(Job.tenant_id == g.tenant_id)
    status = request.args.get('status')
    if status:
        q = q.filter(Offer.status == status)
    offers = q.order_by(Offer.created_at.desc()).all()
    return jsonify([_offer_dict(o) for o in offers])

@offers_bp.route('', methods=['POST'])
@token_required
def create_offer():
    data = request.get_json()
    if not data.get('application_id'):
        return jsonify({'error': 'application_id required'}), 400

    app = Application.query.join(Job).filter(
        Application.id == data['application_id'], Job.tenant_id == g.tenant_id
    ).first_or_404()

    offer = Offer(
        application_id=app.id,
        salary=data.get('salary'),
        currency=data.get('currency', 'USD'),
        start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
        equity=data.get('equity'),
        bonus=data.get('bonus'),
        notes=data.get('notes'),
        status='draft',
        created_by=g.current_user.id
    )
    db.session.add(offer)
    db.session.commit()
    return jsonify(_offer_dict(offer)), 201

@offers_bp.route('/<oid>', methods=['GET'])
@token_required
def get_offer(oid):
    offer = _get_offer(oid)
    return jsonify(_offer_dict(offer))

@offers_bp.route('/<oid>', methods=['PUT'])
@token_required
def update_offer(oid):
    offer = _get_offer(oid)
    data = request.get_json()
    for field in ['salary','currency','equity','bonus','notes']:
        if field in data:
            setattr(offer, field, data[field])
    if 'start_date' in data and data['start_date']:
        offer.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    if 'status' in data:
        offer.status = data['status']
        if data['status'] == 'sent' and not offer.sent_at:
            offer.sent_at = datetime.utcnow()
        if data['status'] in ('accepted', 'declined'):
            offer.responded_at = datetime.utcnow()
    db.session.commit()
    return jsonify(_offer_dict(offer))

def _get_offer(oid):
    return Offer.query.join(Application).join(Job).filter(
        Offer.id == oid, Job.tenant_id == g.tenant_id
    ).first_or_404()

def _offer_dict(o):
    app = o.application
    return {
        'id': o.id,
        'application_id': o.application_id,
        'salary': o.salary, 'currency': o.currency,
        'start_date': o.start_date.isoformat() if o.start_date else None,
        'equity': o.equity, 'bonus': o.bonus, 'notes': o.notes,
        'status': o.status,
        'sent_at': o.sent_at.isoformat() if o.sent_at else None,
        'responded_at': o.responded_at.isoformat() if o.responded_at else None,
        'created_at': o.created_at.isoformat(),
        'candidate': {'id': app.candidate.id, 'full_name': app.candidate.full_name},
        'job': {'id': app.job.id, 'title': app.job.title},
    }
