export function PromptEditor({value, onChange, onRun, sessionActive}) {
    return (
        <div className="prompt-editor">
            <label htmlFor="prompt">Prompt</label>
            <textarea
                id="prompt"
                value={value}
                placeholder="Describe the change or task for Aider"
                onChange={(event) => onChange(event.target.value)}
            />
            <div className="prompt-actions">
                <button type="button" onClick={onRun}>
                    {sessionActive ? 'Send prompt' : 'Start session'}
                </button>
            </div>
        </div>
    );
}
