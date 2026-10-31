"""Fail-closed API authorization. No browser credentials or trust in CORS."""
import os
import hmac
from threading import Lock
from flask import jsonify, request

_app = None
_lock = Lock()


def values(name):
    return {value.strip() for value in os.environ.get(name, '').split(',') if value.strip()}


def firebase_app():
    # An emulator must never silently disable signature verification on this API.
    if os.environ.get('FIREBASE_AUTH_EMULATOR_HOST'):
        raise RuntimeError('Emulator authentication is not supported by this server')
    project = os.environ.get('NETSCOPE_FIREBASE_PROJECT_ID')
    if not project:
        raise RuntimeError('Server authentication is not configured')
    import firebase_admin
    global _app
    with _lock:
        if _app is None:
            _app = firebase_admin.initialize_app(options={'projectId': project}, name='netscope-live')
    return _app


def verify_token(token):
    from firebase_admin import auth
    return auth.verify_id_token(token, app=firebase_app(), check_revoked=True)


def install_security(app):
    @app.before_request
    def authorize():
        if not request.path.startswith('/api/'):
            return None
        origin = request.headers.get('Origin')
        if request.path == '/api/telemetry/ingest':
            secret = os.environ.get('NETSCOPE_INGEST_TOKEN', '')
            supplied = request.headers.get('Authorization', '')
            if (origin or request.method != 'POST' or os.environ.get('NETSCOPE_TELEMETRY_STORAGE') != 'firestore'
                    or len(secret) < 32 or not hmac.compare_digest(supplied.encode('utf-8'), ('Bearer ' + secret).encode('utf-8'))):
                return jsonify(error='Telemetry upload denied.'), 403
            return None
        if origin and origin not in values('NETSCOPE_ALLOWED_ORIGINS'):
            return jsonify(error='Origin is not allowed.'), 403
        # Administrative collection is not a browser operation and is disabled by default.
        if request.path == '/api/refresh':
            if origin or os.environ.get('NETSCOPE_ENABLE_ADMIN_REFRESH') != 'true':
                return jsonify(error='Administrative collection is disabled.'), 403
        if request.method == 'OPTIONS':
            if request.path not in ('/api/live/snapshot', '/api/health'):
                return jsonify(error='Preflight not allowed.'), 403
            return '', 204
        if request.path == '/api/health':
            return None
        header = request.headers.get('Authorization', '')
        parts = header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer' or len(parts[1]) > 8192:
            return jsonify(error='A Firebase ID token is required.'), 401
        try:
            claims = verify_token(parts[1])
        except Exception as error:
            # Only SDK authentication rejections become 401. Configuration/network
            # failures are 503; neither case exposes tokens or credential details.
            from firebase_admin import auth
            invalid = (auth.InvalidIdTokenError, auth.ExpiredIdTokenError,
                       auth.RevokedIdTokenError, auth.UserDisabledError)
            if isinstance(error, invalid):
                return jsonify(error='Session expired or invalid. Sign in again.'), 401
            return jsonify(error='Authentication service is unavailable.'), 503
        uid = claims.get('uid')
        if not uid or uid not in values('NETSCOPE_LIVE_UIDS'):
            return jsonify(error='This account is not authorized for this network.'), 403
        if request.path == '/api/refresh' and uid not in values('NETSCOPE_ADMIN_UIDS'):
            return jsonify(error='Administrator access is required.'), 403
        return None

    @app.after_request
    def response_headers(response):
        if request.path.startswith('/api/'):
            response.headers['Cache-Control'] = 'no-store'
            response.headers['X-Content-Type-Options'] = 'nosniff'
            response.headers.add('Vary', 'Origin')
            origin = request.headers.get('Origin')
            if origin in values('NETSCOPE_ALLOWED_ORIGINS'):
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
                response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        return response
