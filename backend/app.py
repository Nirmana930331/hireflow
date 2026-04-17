import os
from flask import Flask, jsonify
from flask_cors import CORS
from backend.models import db

def create_app(config=None):
    app = Flask(__name__)

    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///hireflow.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET'] = os.environ.get('JWT_SECRET', 'dev-secret-change-in-production')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB uploads
    app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', 'uploads')

    if config:
        app.config.update(config)

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    CORS(app, resources={r"/api/*": {"origins": os.environ.get('CORS_ORIGINS', '*')}})
    db.init_app(app)

    from backend.routes.auth import auth_bp
    from backend.routes.jobs import jobs_bp
    from backend.routes.candidates import candidates_bp
    from backend.routes.applications import applications_bp
    from backend.routes.interviews import interviews_bp
    from backend.routes.offers import offers_bp
    from backend.routes.analytics import analytics_bp

    app.register_blueprint(auth_bp,          url_prefix='/api/auth')
    app.register_blueprint(jobs_bp,           url_prefix='/api/jobs')
    app.register_blueprint(candidates_bp,     url_prefix='/api/candidates')
    app.register_blueprint(applications_bp,   url_prefix='/api/applications')
    app.register_blueprint(interviews_bp,     url_prefix='/api/interviews')
    app.register_blueprint(offers_bp,         url_prefix='/api/offers')
    app.register_blueprint(analytics_bp,      url_prefix='/api/analytics')

    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'version': '1.0.0'})

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'error': 'Method not allowed'}), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    with app.app_context():
        db.create_all()

    return app
