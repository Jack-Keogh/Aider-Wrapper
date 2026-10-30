import json
import os
import shlex
import subprocess
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.error import URLError
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).resolve().parent
DIST_DIR = PROJECT_ROOT / 'dist'
DEFAULT_LM_STUDIO_URL = 'http://localhost:1234/v1'

local_bin = Path.home() / '.local' / 'bin'
os.environ['PATH'] = str(local_bin) + os.pathsep + os.environ['PATH']


def json_response(handler, status, payload):
    body = json.dumps(payload).encode('utf-8')
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Content-Length', str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


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


def build_aider_command(data):
    directory = resolve_directory(data.get('directory'))
    model = str(data.get('model', '')).strip()
    base_url = str(data.get('base_url', DEFAULT_LM_STUDIO_URL)).strip().rstrip('/')
    api_key = str(data.get('api_key', 'lm-studio')).strip()
    prompt = str(data.get('prompt', '')).strip()
    files = [str(file).strip() for file in data.get('files', []) if str(file).strip()]
    raw_args = str(data.get('raw_args', '')).strip()

    command = ['aider']
    if model:
        command.extend(['--model', model])
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

    edit_format = str(data.get('edit_format', '')).strip()
    if edit_format:
        command.extend(['--edit-format', edit_format])

    if raw_args:
        command.extend(shlex.split(raw_args, posix=os.name != 'nt'))
    command.extend(files)
    if prompt:
        command.append(prompt)

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

        try:
            command, directory = build_aider_command(read_json(self))
            result = subprocess.run(
                command,
                cwd=directory,
                check=False,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace',
            )
            json_response(self, 200, {
                'command': command,
                'returncode': result.returncode,
                'stdout': result.stdout,
                'stderr': result.stderr,
            })
        except (FileNotFoundError, OSError) as error:
            json_response(self, 500, {'error': f'Aider could not be started: {error}'})
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
            json_response(self, 400, {'error': str(error)})


def run(server_class=HTTPServer, handler_class=RequestHandler):
    httpd = server_class(('', 8000), handler_class)
    print('Starting Aider launcher at http://localhost:8000')
    webbrowser.open('http://localhost:8000')
    httpd.serve_forever()


if __name__ == '__main__':
    DIST_DIR.mkdir(exist_ok=True)
    npm_command = 'npm.cmd' if os.name == 'nt' else 'npm'
    subprocess.run([npm_command, 'run', 'build'], cwd=PROJECT_ROOT, check=True)
    run()
