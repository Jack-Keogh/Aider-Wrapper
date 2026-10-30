import {useCallback, useEffect, useState} from 'react';
import {browseDirectory, loadModels, streamAider} from './api.js';
import {DirectoryBrowser} from './components/DirectoryBrowser.jsx';
import {ModelSettings} from './components/ModelSettings.jsx';
import {OutputPanel} from './components/OutputPanel.jsx';
import {RequestPanel} from './components/RequestPanel.jsx';
import {StatusMessage} from './components/StatusMessage.jsx';

const initialRequest = {
    prompt: '',
    rawArgs: '',
    flags: {},
};

export function App() {
    const [directory, setDirectory] = useState('');
    const [parent, setParent] = useState('');
    const [entries, setEntries] = useState([]);
    const [files, setFiles] = useState('');
    const [models, setModels] = useState([]);
    const [settings, setSettings] = useState({
        baseUrl: 'http://localhost:1234/v1',
        model: '',
        apiKey: 'lm-studio',
        editFormat: '',
    });
    const [request, setRequest] = useState({
        ...initialRequest,
        flags: {yes_always: true},
    });
    const [status, setStatus] = useState({message: 'Loading...', tone: ''});
    const [output, setOutput] = useState('');

    const browse = useCallback(async (path = directory) => {
        try {
            const data = await browseDirectory(path);
            setDirectory(data.path);
            setParent(data.parent);
            setEntries(data.entries);
        } catch (error) {
            setStatus({message: error.message, tone: 'error'});
        }
    }, [directory]);

    const refreshModels = useCallback(async () => {
        try {
            const data = await loadModels(settings.baseUrl);
            setModels(data.models);
            if (data.models.length > 0) {
                setSettings((current) => ({
                    ...current,
                    model: current.model || data.models[0],
                }));
            }
            setStatus({message: `${data.models.length} model(s) available`, tone: 'success'});
        } catch {
            setStatus({
                message: 'LM Studio unavailable; enter a model manually or start LM Studio.',
                tone: 'error',
            });
        }
    }, [settings.baseUrl]);

    useEffect(() => {
        browse('');
        refreshModels();
    }, []);

    function updateSetting(name, value) {
        setSettings((current) => ({...current, [name]: value}));
    }

    function updateRequest(name, value) {
        if (name.startsWith('flag:')) {
            const flagName = name.slice(5);
            setRequest((current) => ({
                ...current,
                flags: {...current.flags, [flagName]: value},
            }));
            return;
        }
        setRequest((current) => ({...current, [name]: value}));
    }

    async function handleRun() {
        setStatus({message: 'Running Aider...', tone: ''});
        setOutput('');
        try {
            await streamAider({
                directory,
                model: settings.model,
                base_url: settings.baseUrl,
                api_key: settings.apiKey,
                edit_format: settings.editFormat,
                prompt: request.prompt,
                raw_args: request.rawArgs,
                files: files.split(/\r?\n/).map((file) => file.trim()).filter(Boolean),
                ...request.flags,
            }, (event) => {
                if (event.event === 'output') {
                    setOutput((current) => current + event.text);
                }
                if (event.event === 'complete') {
                    setStatus({
                        message: event.returncode === 0
                            ? 'Aider completed successfully'
                            : `Aider exited with code ${event.returncode}`,
                        tone: event.returncode === 0 ? 'success' : 'error',
                    });
                }
                if (event.event === 'error') {
                    throw new Error(event.error);
                }
            });
        } catch (error) {
            setStatus({message: error.message, tone: 'error'});
        }
    }

    return (
        <>
            <h1>Aider Launcher</h1>
            <StatusMessage {...status} />
            <div className="grid">
                <DirectoryBrowser
                    directory={directory}
                    parent={parent}
                    entries={entries}
                    onDirectoryChange={setDirectory}
                    onBrowse={browse}
                    files={files}
                    onFilesChange={(value) => setFiles(Array.isArray(value) ? value.join('\n') : value)}
                />
                <ModelSettings
                    {...settings}
                    models={models}
                    onChange={updateSetting}
                    onLoadModels={refreshModels}
                />
            </div>
            <RequestPanel request={request} onChange={updateRequest} onRun={handleRun} />
            <OutputPanel output={output} />
        </>
    );
}
