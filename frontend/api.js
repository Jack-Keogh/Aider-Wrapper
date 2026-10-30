async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'The request failed');
    }
    return data;
}

export function loadModels(baseUrl) {
    return requestJson(`/api/models?base_url=${encodeURIComponent(baseUrl)}`);
}

export function browseDirectory(path) {
    return requestJson(`/api/browse?path=${encodeURIComponent(path)}`);
}

export async function streamAider(payload, onEvent) {
    const response = await fetch('/api/run', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Aider could not be started');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    while (true) {
        const {value, done} = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), {stream: !done});
        const lines = buffer.split('\n');
        buffer = lines.pop();
        lines.filter(Boolean).forEach((line) => onEvent(JSON.parse(line)));
        if (done) break;
    }
    if (buffer.trim()) {
        onEvent(JSON.parse(buffer));
    }
}

export function startSession(payload) {
    return requestJson('/api/session/start', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
    });
}

export function sendPrompt(prompt) {
    return requestJson('/api/session/prompt', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({prompt}),
    });
}

export function stopSession() {
    return requestJson('/api/session/stop', {method: 'POST'});
}

export function subscribeToSession(onEvent, onError) {
    const source = new EventSource('/api/session/stream');
    source.onmessage = (message) => onEvent(JSON.parse(message.data));
    source.onerror = onError;
    return () => source.close();
}
