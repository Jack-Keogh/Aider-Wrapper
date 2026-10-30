const flags = [
    ['yes_always', 'Auto-confirm changes'],
    ['no_auto_commits', 'Disable auto commits'],
    ['dirty_commits', 'Allow dirty commits'],
    ['attribute_author', 'Attribute author'],
    ['attribute_committer', 'Attribute committer'],
    ['no_stream', 'Disable streaming'],
    ['watch_files', 'Watch files'],
];

export function RequestPanel({request, onChange, onRun}) {
    return (
        <section>
            <h2>Request</h2>
            <label htmlFor="prompt">Prompt</label>
            <textarea
                id="prompt"
                value={request.prompt}
                placeholder="Describe the change or task for Aider"
                onChange={(event) => onChange('prompt', event.target.value)}
            />
            <label htmlFor="raw-args">Advanced Aider arguments (optional)</label>
            <input
                id="raw-args"
                value={request.rawArgs}
                placeholder="Example: --architect --reasoning-effort high"
                onChange={(event) => onChange('rawArgs', event.target.value)}
            />
            <div className="checks">
                {flags.map(([name, label]) => (
                    <label key={name}>
                        <input
                            type="checkbox"
                            checked={request.flags[name] || false}
                            onChange={(event) => onChange(`flag:${name}`, event.target.checked)}
                        />
                        {label}
                    </label>
                ))}
            </div>
            <button type="button" onClick={onRun}>Run Aider</button>
        </section>
    );
}
