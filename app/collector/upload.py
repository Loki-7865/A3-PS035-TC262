"""Run on the lab VM: collect and upload without writing local snapshots."""
import json
import os
import time
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.parse import urlsplit
from app.collector.telemetry import collect_snapshot


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def main():
    endpoint = os.environ['NETSCOPE_UPLOAD_URL']
    token = os.environ['NETSCOPE_INGEST_TOKEN']
    url = urlsplit(endpoint)
    if url.scheme != 'https' or not url.hostname or url.username or url.password or url.query or url.fragment or len(token) < 32:
        raise ValueError('HTTPS upload URL and strong token required')
    opener = build_opener(NoRedirect())
    while True:
        try:
            payload = json.dumps(collect_snapshot()).encode('utf-8')
            request = Request(endpoint, data=payload, headers={'Authorization': 'Bearer '+token, 'Content-Type':'application/json'}, method='POST')
            with opener.open(request, timeout=90) as response:
                print('Telemetry uploaded:', response.status, flush=True)
        except Exception as error:
            # Do not print request objects or credentials.
            print('Upload failed:', type(error).__name__, flush=True)
        time.sleep(60)


if __name__ == '__main__':
    main()
