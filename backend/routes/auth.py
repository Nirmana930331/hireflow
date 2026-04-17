from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
import jwt, os, datetime
from backend.models import db, User, Tenant
from backend.middleware.auth import token_required

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    required = ['company_name', 'email', 'password', 'first_name', 'last_name']
    for f in required:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400

    import re, uuid
    slug = re.sub(r'[^a-z0-9]', '-', data['company_name'].lower())[:50]
    if Tenant.query.filter_by(slug=slug).first():
        slug = slug + '-' + str(uuid.uuid4())[:8]

    tenant = Tenant(name=data['company_name'], slug=slug)
    db.session.add(tenant)
    db.session.flush()

    if User.query.filter_by(email=data['email'], tenant_id=tenant.id).first():
        return jsonify({'error': 'Email already registered'}), 400

    user = User(
        tenant_id=tenant.id,
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        first_name=data['first_name'],
        last_name=data['last_name'],
        role='admin'
    )
    db.session.add(user)
    db.session.commit()

    token = _make_token(user)
    return jsonify({'token': token, 'user': _user_dict(user), 'tenant': {'id': tenant.id, 'name': tenant.name}}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    user = User.query.filter_by(email=data['email']).first()
    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    if not user.is_active:
        return jsonify({'error': 'Account disabled'}), 403
    token = _make_token(user)
    tenant = Tenant.query.get(user.tenant_id)
    return jsonify({'token': token, 'user': _user_dict(user), 'tenant': {'id': tenant.id, 'name': tenant.name}})

@auth_bp.route('/me', methods=['GET'])
@token_required
def me():
    tenant = Tenant.query.get(g.current_user.tenant_id)
    return jsonify({'user': _user_dict(g.current_user), 'tenant': {'id': tenant.id, 'name': tenant.name}})

@auth_bp.route('/users', methods=['GET'])
@token_required
def list_users():
    users = User.query.filter_by(tenant_id=g.tenant_id, is_active=True).all()
    return jsonify([_user_dict(u) for u in users])

@auth_bp.route('/users', methods=['POST'])
@token_required
def create_user():
    if g.current_user.role != 'admin':
        return jsonify({'error': 'Admin only'}), 403
    data = request.get_json()
    if User.query.filter_by(email=data['email'], tenant_id=g.tenant_id).first():
        return jsonify({'error': 'Email already exists'}), 400
    user = User(
        tenant_id=g.tenant_id,
        email=data['email'],
        password_hash=generate_password_hash(data.get('password', 'changeme123')),
        first_name=data.get('first_name', ''),
        last_name=data.get('last_name', ''),
        role=data.get('role', 'recruiter')
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(_user_dict(user)), 201

def _make_token(user):
    return jwt.encode({
        'user_id': user.id,
        'tenant_id': user.tenant_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, os.environ.get('JWT_SECRET', 'dev-secret'), algorithm='HS256')

def _user_dict(u):
    return {'id': u.id, 'email': u.email, 'first_name': u.first_name, 'last_name': u.last_name,
            'full_name': u.full_name, 'role': u.role, 'tenant_id': u.tenant_id}
