import { useState } from 'react';

export function PromptEditor({ value, onChange, onRun, sessionActive }) {
    const [promptSent, setPromptSent] = useState(false);

    const handleInputChange = (event) => {
        if (promptSent && event.target.value !== '') {
            setPromptSent(false);
        }
        onChange(event.target.value);
    };

    return (
        <div className="prompt-editor">
            <label htmlFor="prompt">Prompt</label>
            <textarea
                id="prompt"
                value={value}
                placeholder="Describe the change or task for Aider"
                onChange={handleInputChange}
                style={{ opacity: promptSent ? 0.5 : 1 }}
            />
            <div className="prompt-actions">
                <button type="button" onClick={() => {
                    onRun();
                    setPromptSent(true);
                }}>
                    {sessionActive ? 'Send prompt' : 'Start session'}
                </button>
            </div>
        </div>
    );
}
