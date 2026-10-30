const state = {
    directory: '',
    files: new Set(),
};

const $ = (id) => document.getElementById(id);

function showError(error) {
    $('status').textContent = error.message || error;
    $('status').className = 'error';
}

async function loadModels() {
    const baseUrl = $('base-url').value.trim();
    const response = await fetch(`/api/models?base_url=${encodeURIComponent(baseUrl)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load models');

    $('model-options').replaceChildren(...data.models.map((model) => {
        const option = document.createElement('option');
        option.value = model;
        return option;
    }));
    $('status').textContent = `${data.models.length} model(s) available`;
    $('status').className = 'success';
}

function renderBrowser(data) {
    state.directory = data.path;
    $('directory').value = data.path;
    $('directory-list').replaceChildren();

    if (data.path !== data.parent) {
        const up = document.createElement('button');
        up.textContent = '..';
        up.className = 'entry directory';
        up.onclick = () => browse(data.parent);
        $('directory-list').append(up);
    }

    data.entries.forEach((entry) => {
        const button = document.createElement('button');
        button.textContent = entry.is_directory ? `📁 ${entry.name}` : entry.name;
        button.className = `entry ${entry.is_directory ? 'directory' : ''}`;
        button.onclick = () => entry.is_directory ? browse(entry.path) : addFile(entry.path);
        $('directory-list').append(button);
    });
}

async function browse(path = $('directory').value) {
    const response = await fetch(`/api/browse?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not browse directory');
    renderBrowser(data);
}

function addFile(path) {
    state.files.add(path);
    $('files').value = [...state.files].join('\n');
}

async function runAider() {
    $('status').textContent = 'Running Aider...';
    $('status').className = '';
    $('output').textContent = '';
    const files = $('files').value.split(/\r?\n/).map((file) => file.trim()).filter(Boolean);
    const payload = {
        directory: $('directory').value,
        model: $('model').value,
        base_url: $('base-url').value,
        api_key: $('api-key').value,
        prompt: $('prompt').value,
        files,
        raw_args: $('raw-args').value,
        edit_format: $('edit-format').value,
    };
    document.querySelectorAll('[data-flag]').forEach((input) => {
        payload[input.dataset.flag] = input.checked;
    });

    try {
        const response = await fetch('/api/run', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Aider failed to start');
        $('output').textContent = [data.stdout, data.stderr].filter(Boolean).join('\n');
        $('status').textContent = data.returncode === 0
            ? 'Aider completed successfully'
            : `Aider exited with code ${data.returncode}`;
        $('status').className = data.returncode === 0 ? 'success' : 'error';
    } catch (error) {
        showError(error);
    }
}

$('load-models').onclick = () => loadModels().catch(showError);
$('browse').onclick = () => browse().catch(showError);
$('run').onclick = runAider;
$('directory').onchange = () => browse().catch(showError);
browse().catch(showError);
loadModels().catch(() => {
    $('status').textContent = 'LM Studio unavailable; enter a model manually or start LM Studio.';
});
