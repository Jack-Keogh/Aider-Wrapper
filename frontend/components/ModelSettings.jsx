export function ModelSettings({
    baseUrl,
    model,
    models,
    apiKey,
    editFormat,
    onChange,
    onLoadModels,
}) {
    return (
        <section>
            <h2>LM Studio</h2>
            <label htmlFor="base-url">OpenAI-compatible base URL</label>
            <div className="inline">
                <input
                    id="base-url"
                    value={baseUrl}
                    onChange={(event) => onChange('baseUrl', event.target.value)}
                />
                <button type="button" onClick={onLoadModels}>Load models</button>
            </div>
            <label htmlFor="model">Model</label>
            <input
                id="model"
                list="model-options"
                value={model}
                placeholder="Select or enter a model"
                onChange={(event) => onChange('model', event.target.value)}
            />
            <datalist id="model-options">
                {models.map((availableModel) => <option key={availableModel} value={availableModel} />)}
            </datalist>
            <label htmlFor="api-key">API key</label>
            <input
                id="api-key"
                value={apiKey}
                onChange={(event) => onChange('apiKey', event.target.value)}
            />
            <label htmlFor="edit-format">Edit format</label>
            <select
                id="edit-format"
                value={editFormat}
                onChange={(event) => onChange('editFormat', event.target.value)}
            >
                <option value="">Aider default</option>
                <option value="diff">diff</option>
                <option value="whole">whole</option>
                <option value="udiff">udiff</option>
                <option value="ask">ask</option>
            </select>
        </section>
    );
}
