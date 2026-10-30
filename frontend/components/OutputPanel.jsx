export function OutputPanel({output}) {
    return (
        <section className="terminal-panel">
            <div className="terminal-heading">
                <span className="terminal-dot" aria-hidden="true" />
                <h2>Terminal output</h2>
            </div>
            <pre id="output">{output}</pre>
        </section>
    );
}
