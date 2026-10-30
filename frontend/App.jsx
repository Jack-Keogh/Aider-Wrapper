import {useCallback, useEffect, useState} from 'react';
import {
    browseDirectory,
    loadModels,
    sendPrompt,
    startSession,
    stopSession,
    subscribeToSession,
} from './api.js';
import {DirectoryBrowser} from './components/DirectoryBrowser.jsx';
import {ModelSettings} from './components/ModelSettings.jsx';
import {OutputPanel} from './components/OutputPanel.jsx';
import {PromptEditor} from './components/PromptEditor.jsx';
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
    const [tokens, setTokens] = useState({sent: 0, received: 0, total: 0});
    const [sessionActive, setSessionActive] = useState(false);
    const [sessionStarting, setSessionStarting] = useState(false);
    const [activePanel, setActivePanel] = useState('request');

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
        return subscribeToSession((event) => {
            if (event.event === 'session_state') setSessionActive(event.active);
            if (event.event === 'session_started') {
                setSessionActive(true);
                setSessionStarting(false);
                setOutput('');
                setTokens({sent: 0, received: 0, total: 0});
            }
            if (event.event === 'session_ended') {
                setSessionActive(false);
                setSessionStarting(false);
            }
            if (event.event === 'output') setOutput((current) => current + event.text);
            if (event.event === 'tokens') setTokens(event);
        }, () => setStatus({message: 'Session stream disconnected', tone: 'error'}));
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
        try {
            const config = {
                directory,
                model: settings.model,
                base_url: settings.baseUrl,
                api_key: settings.apiKey,
                edit_format: settings.editFormat,
                prompt: request.prompt,
                raw_args: request.rawArgs,
                files: files.split(/\r?\n/).map((file) => file.trim()).filter(Boolean),
                ...request.flags,
            };
            if (!sessionActive) {
                setSessionStarting(true);
                await startSession(config);
                setStatus({message: 'Warming up Aider session...', tone: ''});
                return false;
            }
            await sendPrompt(request.prompt);
            setRequest((current) => ({...current, prompt: ''}));
            setStatus({message: 'Prompt sent to Aider session', tone: 'success'});
            return true;
        } catch (error) {
            setSessionStarting(false);
            setStatus({message: error.message, tone: 'error'});
            return false;
        }
    }

    async function handleStop() {
        try {
            await stopSession();
            setSessionActive(false);
            setSessionStarting(false);
            setStatus({message: 'Aider session stopped', tone: 'success'});
        } catch (error) {
            setStatus({message: error.message, tone: 'error'});
        }
    }

    return (
        <>
            <h1>Aider Launcher</h1>
            <StatusMessage {...status} />
            <div className="accordion-stack">
                <DirectoryBrowser
                    directory={directory}
                    parent={parent}
                    entries={entries}
                    onDirectoryChange={setDirectory}
                    onBrowse={browse}
                    files={files}
                    onFilesChange={(value) => setFiles(Array.isArray(value) ? value.join('\n') : value)}
                    isOpen={activePanel === 'target'}
                    onToggle={() => setActivePanel(activePanel === 'target' ? '' : 'target')}
                />
                <ModelSettings
                    {...settings}
                    models={models}
                    onChange={updateSetting}
                    onLoadModels={refreshModels}
                    isOpen={activePanel === 'lm-studio'}
                    onToggle={() => setActivePanel(activePanel === 'lm-studio' ? '' : 'lm-studio')}
                />
                <RequestPanel
                    request={request}
                    onChange={updateRequest}
                    isOpen={activePanel === 'request'}
                    onToggle={() => setActivePanel(activePanel === 'request' ? '' : 'request')}
                />
                <PromptEditor
                    value={request.prompt}
                    onChange={(value) => updateRequest('prompt', value)}
                    onRun={handleRun}
                    sessionActive={sessionActive}
                    sessionStarting={sessionStarting}
                />
            </div>
            <OutputPanel
                output={output}
                tokens={tokens}
                sessionActive={sessionActive}
                onStop={handleStop}
            />
        </>
    );
}
