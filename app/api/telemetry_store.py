"""Server-only latest snapshot storage for stateless hosting."""
import json
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

telemetry_ingest = Blueprint('telemetry_ingest', __name__)
MAX_BYTES = 500_000


def document():
    from firebase_admin import firestore
    from app.api.security import firebase_app
    return firestore.client(app=firebase_app()).collection('_netscope_private').document('latest')


def validate_snapshot(data):
    if not isinstance(data, dict):
        raise ValueError('Invalid snapshot')
    observed = datetime.fromisoformat(data['collected_at'].replace('Z', '+00:00'))
    if observed.tzinfo is None or not -60 <= (datetime.now(timezone.utc) - observed).total_seconds() <= 300:
        raise ValueError('Snapshot timestamp is not recent')
    routers = data['routers']
    if not isinstance(routers, list) or len(routers) != 5 or {r['router'] for r in routers} != {'r1','r2','r3','r4','r5'}:
        raise ValueError('Expected five lab routers')
    clean = []
    for router in routers:
        bgp = router['bgp']
        if not isinstance(bgp['success'], bool) or not isinstance(bgp['output'], str) or len(bgp['output']) > 50_000 or not isinstance(router['healthy_collection'], bool):
            raise ValueError('Invalid router data')
        clean.append({'router': router['router'], 'collected_at': data['collected_at'],
                      'healthy_collection': router['healthy_collection'],
                      'bgp': {'success': bgp['success'], 'output': bgp['output']}})
    return {'collected_at': data['collected_at'], 'routers': clean}


def load_snapshot():
    record = document().get(timeout=8)
    if not record.exists:
        return None
    return json.loads(record.to_dict()['snapshot'].decode('utf-8'))


@telemetry_ingest.post('/api/telemetry/ingest')
def ingest():
    try:
        raw = request.stream.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            return jsonify(error='Snapshot too large.'), 413
        clean = validate_snapshot(json.loads(raw))
        # Binary field is not an indexed nested telemetry map; only one record retained.
        document().set({'snapshot': json.dumps(clean).encode('utf-8')}, timeout=8)
        return jsonify(status='stored'), 201
    except (ValueError, TypeError, KeyError, AttributeError):
        return jsonify(error='Invalid telemetry snapshot.'), 400
    except Exception:
        return jsonify(error='Telemetry storage unavailable.'), 503
