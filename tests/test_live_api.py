import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from firebase_admin import auth
from app.api.main import app
from app.api import security


class LiveApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.env = patch.dict(os.environ, {'NETSCOPE_LIVE_UIDS': 'operator', 'NETSCOPE_TELEMETRY_DIR': self.temp.name, 'NETSCOPE_ALLOWED_ORIGINS': 'https://ui.example', 'NETSCOPE_ENABLE_ADMIN_REFRESH': 'false'}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)
        self.verify = patch('app.api.security.verify_token', return_value={'uid': 'operator'}).start()
        self.addCleanup(patch.stopall)
        self.client = app.test_client()
        self.headers = {'Authorization': 'Bearer synthetic'}

    def test_anonymous_legacy_and_live_routes_rejected(self):
        for path in ('telemetry', 'diagnosis', 'incidents', 'live/snapshot'):
            self.assertEqual(self.client.get('/api/' + path).status_code, 401)
        self.assertEqual(self.client.get('/api/health').status_code, 200)
        self.verify.assert_not_called()

    def test_invalid_and_revoked_tokens(self):
        for error in (auth.InvalidIdTokenError('invalid'), auth.RevokedIdTokenError('revoked'), auth.UserDisabledError('disabled')):
            self.verify.side_effect = error
            response = self.client.get('/api/live/snapshot', headers=self.headers)
            self.assertEqual(response.status_code, 401)
            self.assertNotIn('synthetic', response.get_data(as_text=True))

    def test_fail_closed_configuration_and_authorization(self):
        self.verify.side_effect = RuntimeError('private credential detail')
        response = self.client.get('/api/live/snapshot', headers=self.headers)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('credential', response.get_data(as_text=True))
        self.verify.side_effect = None
        self.verify.return_value = {'uid': 'other'}
        self.assertEqual(self.client.get('/api/live/snapshot', headers=self.headers).status_code, 403)

    def test_cors_is_exact_and_does_not_replace_auth(self):
        self.assertEqual(self.client.get('/api/live/snapshot', headers={**self.headers, 'Origin': 'https://ui.example.evil'}).status_code, 403)
        response = self.client.options('/api/live/snapshot', headers={'Origin': 'https://ui.example'})
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.headers['Access-Control-Allow-Origin'], 'https://ui.example')
        self.assertEqual(self.client.get('/api/live/snapshot', headers={'Origin': 'https://ui.example'}).status_code, 401)

    def test_refresh_disabled_browser_blocked_and_admin_required(self):
        with patch('app.api.main.collect_snapshot') as collect:
            self.assertEqual(self.client.post('/api/refresh', headers=self.headers).status_code, 403)
            os.environ['NETSCOPE_ENABLE_ADMIN_REFRESH'] = 'true'
            self.assertEqual(self.client.post('/api/refresh', headers={**self.headers, 'Origin': 'https://ui.example'}).status_code, 403)
            self.assertEqual(self.client.post('/api/refresh', headers=self.headers).status_code, 403)
            collect.assert_not_called()

    def test_missing_and_malformed_storage(self):
        self.assertEqual(self.client.get('/api/live/snapshot', headers=self.headers).status_code, 404)
        Path(self.temp.name, 'telemetry_1.json').write_text('{')
        self.assertEqual(self.client.get('/api/live/snapshot', headers=self.headers).status_code, 503)
        del os.environ['NETSCOPE_TELEMETRY_DIR']
        self.assertEqual(self.client.get('/api/live/snapshot', headers=self.headers).status_code, 503)

    def test_snapshot_is_read_only_sanitized_and_stale(self):
        path = Path(self.temp.name, 'telemetry_1.json')
        path.write_text(json.dumps({'collected_at': '2020-01-01T00:00:00Z', 'routers': [{'router': 'r1', 'healthy_collection': False, 'bgp': {'success': False, 'output': 'PRIVATE RAW OUTPUT'}}]}))
        before = path.read_bytes()
        with patch('app.api.main.collect_snapshot') as collect, patch('app.api.main.save_snapshot') as save, patch('app.api.main.update_incident_history') as history:
            response = self.client.get('/api/live/snapshot', headers=self.headers)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json['freshness'], 'stale')
            self.assertEqual(response.json['routers'][0]['status'], 'unknown')
            self.assertTrue(all(link['physical_status'] == 'not_measured' for link in response.json['topology']['links']))
            self.assertNotIn('PRIVATE RAW OUTPUT', response.get_data(as_text=True))
            self.assertEqual(response.headers['Cache-Control'], 'no-store')
            collect.assert_not_called(); save.assert_not_called(); history.assert_not_called()
        self.assertEqual(path.read_bytes(), before)
        self.assertEqual(len(list(Path(self.temp.name).iterdir())), 1)


class TokenVerificationTests(unittest.TestCase):
    def test_sdk_project_and_revocation_check(self):
        with patch.dict(os.environ, {'NETSCOPE_FIREBASE_PROJECT_ID': 'test-project'}, clear=True), patch.object(security, '_app', None), patch('firebase_admin.initialize_app', return_value='admin-app') as initialize, patch('firebase_admin.auth.verify_id_token', return_value={'uid': 'operator'}) as verify:
            security.verify_token('synthetic')
            initialize.assert_called_once_with(options={'projectId': 'test-project'}, name='netscope-live')
            verify.assert_called_once_with('synthetic', app='admin-app', check_revoked=True)

    def test_emulator_is_rejected(self):
        with patch.dict(os.environ, {'FIREBASE_AUTH_EMULATOR_HOST': 'localhost:9099'}, clear=True):
            with self.assertRaises(RuntimeError):
                security.verify_token('synthetic')
