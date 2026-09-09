"""Run with python3 tests/nginx-app-accounts.test.py; requires nginx with auth_request."""
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class AuthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        assert self.path == '/api/v1/user/info'
        assert not self.headers.get('Cookie')
        token = self.headers.get('Authorization')
        status = {'valid': 200, 'expired': 401, 'invalid': 403, 'outage': 503, 'redirect': 302}.get(token, 401)
        self.send_response(status)
        self.end_headers()
        self.wfile.write(b'{"data":{"email":"test@example.com"}}')

    def log_message(self, *args):
        pass


nginx = shutil.which('nginx')
assert nginx, 'nginx must be installed'
root = Path(__file__).resolve().parents[1]
auth = ThreadingHTTPServer(('127.0.0.1', 0), AuthHandler)
threading.Thread(target=auth.serve_forever, daemon=True).start()
with socket.socket() as listener:
    listener.bind(('127.0.0.1', 0))
    port = listener.getsockname()[1]

try:
    with tempfile.TemporaryDirectory(prefix='moss-nginx-test-') as temp:
        folder = Path(temp)
        private_file = folder / 'private.json'
        payload = {'data': {'塔台': {'appleId': 'fixture@example.com', 'password': 'test-only'}}}
        private_file.write_text(json.dumps(payload))
        snippet = (root / 'deploy/nginx/app-accounts.conf').read_text()
        snippet = snippet.replace('https://xboard.example.com', f'http://127.0.0.1:{auth.server_port}')
        snippet = snippet.replace('/etc/moss-private/app-accounts.json', str(private_file))
        # Local mock upstream is HTTP; production keeps verified TLS.
        snippet = '\n'.join(line for line in snippet.splitlines() if 'proxy_ssl_' not in line)
        conf = folder / 'nginx.conf'
        conf.write_text(f'''pid {folder}/nginx.pid;
error_log {folder}/error.log;
events {{}}
http {{
    access_log off;
    client_body_temp_path {folder}/body;
    proxy_temp_path {folder}/proxy;
    server {{
        listen 127.0.0.1:{port};
        {snippet}
    }}
}}
''')
        subprocess.run([nginx, '-t', '-p', temp, '-c', str(conf)], check=True, capture_output=True)
        process = subprocess.Popen([nginx, '-p', temp, '-c', str(conf), '-g', 'daemon off;'])
        try:
            def request(path='/api/v1/user/app-accounts', token=None, method='GET', origin='https://theme.example.com'):
                headers = {'Cookie': 'must-not-reach-xboard=yes', 'Origin': origin}
                if method == 'OPTIONS':
                    headers['Access-Control-Request-Method'] = 'GET'
                    headers['Access-Control-Request-Headers'] = 'authorization,content-type,cache-control'
                if token:
                    headers['Authorization'] = token
                req = Request(f'http://127.0.0.1:{port}{path}', headers=headers, method=method)
                try:
                    response = urlopen(req, timeout=3)
                except HTTPError as error:
                    response = error
                with response:
                    return response.status, response.headers, response.read()

            for attempt in range(50):
                try:
                    request()
                    break
                except URLError:
                    time.sleep(0.05)
            else:
                raise AssertionError('nginx did not start')

            for token in (None, 'invalid', 'expired', 'outage', 'redirect'):
                status, headers, body = request(token=token)
                assert status in (401, 403), (token, status)
                assert b'test-only' not in body
                assert 'no-store' in headers['Cache-Control']
                assert headers['Access-Control-Allow-Origin'] == 'https://theme.example.com'
            status, headers, body = request(method='OPTIONS')
            assert status == 204 and body == b'', (status, body)
            assert headers['Access-Control-Allow-Origin'] == 'https://theme.example.com'
            assert 'GET' in headers['Access-Control-Allow-Methods']
            allowed = {value.strip().lower() for value in headers['Access-Control-Allow-Headers'].split(',')}
            assert {'authorization', 'content-type', 'cache-control'} <= allowed
            assert request(method='OPTIONS', origin='https://untrusted.example')[1]['Access-Control-Allow-Origin'] == 'https://theme.example.com'
            status, headers, body = request(token='valid')
            assert status == 200 and json.loads(body) == payload
            assert 'no-store' in headers['Cache-Control']
            assert headers['Access-Control-Allow-Origin'] == 'https://theme.example.com'
            assert request('/_app_accounts_auth', 'valid')[0] in (403, 404)
            for path in ('/app-accounts.json', '/public/app-accounts.json'):
                assert request(path, 'valid')[0] == 404
            assert request(token='valid', method='POST')[0] == 403
            private_file.unlink()
            assert request(token='valid')[0] == 403
            print('PASS: authenticated access, missing/invalid/expired tokens, upstream errors/redirects, private auth path, retired URLs, methods, missing file, no-store, CORS preflight/success/errors')
        finally:
            process.terminate()
            process.wait(timeout=5)
finally:
    auth.shutdown()
    auth.server_close()
