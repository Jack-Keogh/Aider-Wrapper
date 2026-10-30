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

export function runAider(payload) {
    return requestJson('/api/run', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
    });
}
