const vscode = require('vscode');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const {spawn} = require('child_process');

let backend;

function findFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const {port} = server.address();
            server.close(() => resolve(port));
        });
    });
}

function waitForBackend(port) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + 15000;
        let settled = false;
        const check = () => {
            const request = http.get(`http://127.0.0.1:${port}/api/browse`, (response) => {
                response.resume();
                if (response.statusCode === 200) {
                    settled = true;
                    resolve();
                } else {
                    retry();
                }
            });
            request.on('error', retry);
        };
        const retry = () => {
            if (settled) return;
            if (Date.now() >= deadline) {
                reject(new Error('Aider Wrapper backend did not start in time.'));
            } else {
                setTimeout(check, 250);
            }
        };
        check();
    });
}

async function startBackend(context) {
    if (backend) return backend.port;
    const port = await findFreePort();
    const pythonPath = vscode.workspace.getConfiguration('aiderWrapper').get('pythonPath', 'python');
    const script = path.join(context.extensionPath, 'backend', 'run_Aider.py');
    backend = {
        port,
        process: spawn(pythonPath, [script], {
            cwd: context.extensionPath,
            env: {
                ...process.env,
                WBOARD_BIND_HOST: '127.0.0.1',
                WBOARD_NO_BROWSER: '1',
                WBOARD_PORT: String(port),
                WBOARD_SKIP_BUILD: '1',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        }),
    };
    backend.process.stderr.on('data', (data) => {
        console.error(`[Aider Wrapper] ${data.toString().trim()}`);
    });
    backend.process.on('error', (error) => {
        backend = undefined;
        console.error(`[Aider Wrapper] Could not start Python backend: ${error.message}`);
    });
    backend.process.on('exit', () => {
        backend = undefined;
    });
    try {
        await waitForBackend(port);
    } catch (error) {
        if (backend && backend.process && !backend.process.killed) {
            backend.process.kill();
        }
        backend = undefined;
        throw new Error(
            `${error.message} Check aiderWrapper.pythonPath and ensure Python/Aider are installed.`,
        );
    }
    return port;
}

function getWebviewHtml(webview, context, port) {
    const dist = path.join(context.extensionPath, 'dist');
    let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
    const resource = (file) => webview.asWebviewUri(vscode.Uri.file(path.join(dist, file))).toString();
    html = html.replace(/(src|href)="\/([^"]+)"/g, (_match, attribute, file) => (
        `${attribute}="${resource(file)}"`
    ));
    html = html.replace(
        'window.__AIDER_API_BASE__ = \'\';',
        `window.__AIDER_API_BASE__ = 'http://127.0.0.1:${port}';`,
    );
    return html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src http://127.0.0.1:${port}; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">`);
}

async function openPanel(context) {
    await vscode.commands.executeCommand('workbench.view.extension.aiderWrapper');
}

class AiderViewProvider {
    constructor(context) {
        this.context = context;
    }

    resolveWebviewView(webviewView) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'dist'))],
        };
        webviewView.webview.html = '<p>Starting Aider Wrapper...</p>';
        startBackend(this.context)
            .then((port) => {
                webviewView.webview.html = getWebviewHtml(webviewView.webview, this.context, port);
            })
            .catch((error) => {
                webviewView.webview.html = `<p>Unable to start Aider Wrapper: ${escapeHtml(error.message)}</p>`;
            });
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function activate(context) {
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'aiderWrapper.view',
            new AiderViewProvider(context),
        ),
    );
    context.subscriptions.push(vscode.commands.registerCommand('aiderWrapper.open', () => {
        openPanel(context).catch((error) => vscode.window.showErrorMessage(error.message));
    }));
}

function deactivate() {
    if (backend && backend.process) backend.process.kill();
}

module.exports = {activate, deactivate};
