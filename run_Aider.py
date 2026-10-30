import json
import os
import queue
import shlex
import subprocess
import sys
import time
import threading
import webbrowser
from codecs import getincrementaldecoder
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.error import URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

PROJECT_ROOT = Path(__file__).resolve().parent
DIST_DIR = PROJECT_ROOT / 'dist'
DEFAULT_LM_STUDIO_URL = 'http://localhost:1234/v1'

local_bin = Path.home() / '.local' / 'bin'
os.environ['PATH'] = str(local_bin) + os.pathsep + os.environ['PATH']


def json_response(handler, status, payload):
    body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Content-Length', str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def stream_event(handler, event, **payload):
    body = (json.dumps({'event': event, **payload}, ensure_ascii=False) + '\n').encode('utf-8')
    handler.wfile.write(body)
    handler.wfile.flush()


def stream_process_output(process, handler):
    output_queue = queue.Queue()

    def read_output():
        try:
            while True:
                chunk = process.stdout.read(1)
                if not chunk:
                    break
                output_queue.put(chunk)
        finally:
            output_queue.put(None)

    reader = threading.Thread(target=read_output, daemon=True)
    reader.start()
    decoder = getincrementaldecoder('utf-8')('replace')
    pending = []
    finished = False
    deadline = time.monotonic() + 600

    while not finished:
        if time.monotonic() >= deadline:
            process.kill()
            raise subprocess.TimeoutExpired(process.args, 600)
        try:
            chunk = output_queue.get(timeout=0.05)
            if chunk is None:
                finished = True
            else:
                pending.append(decoder.decode(chunk))
        except queue.Empty:
            pass

        if pending and (finished or len(''.join(pending)) >= 128 or output_queue.empty()):
            stream_event(handler, 'output', text=''.join(pending))
            pending.clear()

    remainder = decoder.decode(b'', final=True)
    if remainder:
        stream_event(handler, 'output', text=remainder)
    return process.wait(timeout=5)


def read_json(handler):
    length = int(handler.headers.get('Content-Length', 0))
    return json.loads(handler.rfile.read(length).decode('utf-8'))


def model_endpoint(base_url):
    return base_url.rstrip('/') + '/models'


def list_models(base_url):
    request = Request(model_endpoint(base_url), headers={'Accept': 'application/json'})
    with urlopen(request, timeout=5) as response:
        payload = json.loads(response.read().decode('utf-8'))
    return [model['id'] for model in payload.get('data', []) if model.get('id')]


def resolve_directory(value):
    directory = Path(value).expanduser().resolve() if value else PROJECT_ROOT
    if not directory.is_dir():
        raise ValueError(f'Target directory does not exist: {directory}')
    return directory


def normalize_model(model):
    if model and '/' not in model:
        return f'openai/{model}'
    return model


def wait_for_vite():
    for _ in range(60):
        try:
            with urlopen('http://localhost:5173/', timeout=1):
                return
        except OSError:
            time.sleep(0.25)
    raise RuntimeError('Vite did not become ready on http://localhost:5173')


def build_aider_command(data):
    directory = resolve_directory(data.get('directory'))
    model = normalize_model(str(data.get('model', '')).strip())
    base_url = str(data.get('base_url', DEFAULT_LM_STUDIO_URL)).strip().rstrip('/')
    api_key = str(data.get('api_key', 'lm-studio')).strip()
    prompt = str(data.get('prompt', '')).strip()
    files = [str(file).strip() for file in data.get('files', []) if str(file).strip()]
    raw_args = str(data.get('raw_args', '')).strip()
    if not prompt:
        raise ValueError('A prompt is required')
    if not model:
        raise ValueError('Select an LM Studio model before running Aider')

    command = ['aider', '--model', model]
    if base_url:
        command.extend(['--openai-api-base', base_url])
    if api_key:
        command.extend(['--openai-api-key', api_key])

    for flag in (
        'yes_always',
        'auto_commits',
        'no_auto_commits',
        'dirty_commits',
        'attribute_author',
        'attribute_committer',
        'no_stream',
        'dark_mode',
        'show_diffs',
        'watch_files',
    ):
        if data.get(flag):
            command.append('--' + flag.replace('_', '-'))

    if not data.get('no_stream'):
        command.append('--stream')

    edit_format = str(data.get('edit_format', '')).strip()
    if edit_format:
        command.extend(['--edit-format', edit_format])

    if raw_args:
        command.extend(shlex.split(raw_args, posix=os.name != 'nt'))
    command.extend(['--no-show-model-warnings', '--no-pretty', '--message', prompt])
    command.extend(files)

    return command, directory


class RequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/models':
            base_url = parse_qs(parsed.query).get('base_url', [DEFAULT_LM_STUDIO_URL])[0]
            try:
                json_response(self, 200, {'models': list_models(base_url)})
            except (OSError, URLError, ValueError, json.JSONDecodeError) as error:
                json_response(self, 502, {'error': f'Unable to load models from LM Studio: {error}'})
            return

        if parsed.path == '/api/browse':
            requested = parse_qs(parsed.query).get('path', [''])[0]
            try:
                directory = resolve_directory(requested)
                entries = [
                    {'name': entry.name, 'path': str(entry), 'is_directory': entry.is_dir()}
                    for entry in sorted(directory.iterdir(), key=lambda item: (not item.is_dir(), item.name.lower()))
                    if not entry.name.startswith('.') and (entry.is_dir() or entry.is_file())
                ]
                json_response(self, 200, {'path': str(directory), 'parent': str(directory.parent), 'entries': entries})
            except (OSError, ValueError) as error:
                json_response(self, 400, {'error': str(error)})
            return

        super().do_GET()

    def do_POST(self):
        if self.path != '/api/run':
            self.send_error(404, 'File not found')
            return

        headers_sent = False
        try:
            command, directory = build_aider_command(read_json(self))
            process = subprocess.Popen(
                command,
                cwd=directory,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                bufsize=0,
            )

            self.send_response(200)
            self.send_header('Content-Type', 'application/x-ndjson; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'close')
            self.end_headers()
            headers_sent = True
            stream_event(self, 'started', command=command)
            returncode = stream_process_output(process, self)
            stream_event(self, 'complete', returncode=returncode)
        except subprocess.TimeoutExpired:
            process.kill()
            if headers_sent:
                stream_event(self, 'error', error='Aider timed out after 10 minutes')
            else:
                json_response(self, 504, {'error': 'Aider timed out after 10 minutes'})
        except (FileNotFoundError, OSError) as error:
            if headers_sent:
                return
            else:
                json_response(self, 500, {'error': f'Aider could not be started: {error}'})
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
            json_response(self, 400, {'error': str(error)})


def run(server_class=HTTPServer, handler_class=RequestHandler, dev=False):
    httpd = server_class(('', 8000), handler_class)
    vite_process = None
    if dev:
        vite_command = PROJECT_ROOT / 'node_modules' / '.bin' / (
            'vite.cmd' if os.name == 'nt' else 'vite'
        )
        vite_process = subprocess.Popen(
            [str(vite_command), '--host', 'localhost'],
            cwd=PROJECT_ROOT,
            env=os.environ.copy(),
        )
        wait_for_vite()
        print('Starting Aider launcher in development mode at http://localhost:5173')
        webbrowser.open(f'http://localhost:5173/index.html?dev={time.time_ns()}')
    else:
        print('Starting Aider launcher at http://localhost:8000')
        webbrowser.open('http://localhost:8000')
    try:
        httpd.serve_forever()
    finally:
        if vite_process:
            vite_process.terminate()


if __name__ == '__main__':
    os.environ.setdefault('PYTHONUTF8', '1')
    os.environ.setdefault('PYTHONIOENCODING', 'utf-8')
    dev_mode = '--dev' in os.sys.argv
    if not dev_mode:
        DIST_DIR.mkdir(exist_ok=True)
        npm_command = 'npm.cmd' if os.name == 'nt' else 'npm'
        subprocess.run([npm_command, 'run', 'build'], cwd=PROJECT_ROOT, check=True)
    run(dev=dev_mode)
