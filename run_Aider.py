import os
import subprocess
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, HTTPServer
import webbrowser

# Add local bin to path dynamically
local_bin = os.path.expanduser(r"~\.local\bin")
os.environ["PATH"] = local_bin + os.pathsep + os.environ["PATH"]

# Aider command arguments
cmd = [
    "aider",
    "--model", "openai/qwen2.5-coder-14b-instruct",
    "--openai-api-base", "http://localhost:1234/v1",
    "--openai-api-key", "lm-studio"
]

class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            with open('aider_interface.html', 'rb') as file:
                self.wfile.write(file.read())
        else:
            self.send_error(404, "File not found")

    def do_POST(self):
        if self.path == '/run_aider':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            command = data.get('command', '')

            try:
                result = subprocess.run(cmd + [command], check=True, capture_output=True, text=True).stdout
                self.send_response(200)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(result.encode('utf-8'))
            except FileNotFoundError:
                self.send_response(404)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b"Error: Aider is not found. Make sure it's installed via pip.")
            except subprocess.CalledProcessError as e:
                self.send_response(e.returncode)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(e.stderr.encode('utf-8'))
        else:
            self.send_error(404, "File not found")

def run(server_class=HTTPServer, handler_class=RequestHandler):
    server_address = ('', 8000)
    httpd = server_class(server_address, handler_class)
    print("Starting Aider with local Qwen 14B...")
    webbrowser.open('http://localhost:8000')
    httpd.serve_forever()

if __name__ == '__main__':
    run()
