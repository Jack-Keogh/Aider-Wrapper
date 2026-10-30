function formatTokens(value) {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

export function OutputPanel({output, tokens, sessionActive, onStop}) {
    return (
        <section className="terminal-panel">
            <div className="terminal-heading">
                <span className="terminal-dot" aria-hidden="true" />
                <h2>Terminal output</h2>
                <div className="terminal-actions">
                    {sessionActive && (
                        <button className="secondary-button" type="button" onClick={onStop}>
                            Stop session
                        </button>
                    )}
                    <span className={`session-state ${sessionActive ? 'active' : ''}`}>
                        {sessionActive ? 'Session live' : 'No session'}
                    </span>
                </div>
            </div>
            <div className="terminal-layout">
                <pre id="output">{output}</pre>
                <aside className="token-rail">
                    <span className="token-label">Session tokens</span>
                    <strong>{formatTokens(tokens.total)}</strong>
                    <span>total</span>
                    <div className="token-breakdown">
                        <span>↑ {formatTokens(tokens.sent)}</span>
                        <span>↓ {formatTokens(tokens.received)}</span>
                    </div>
                </aside>
            </div>
        </section>
    );
}
