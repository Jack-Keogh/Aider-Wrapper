export function DirectoryBrowser({
    directory,
    parent,
    entries,
    onDirectoryChange,
    onBrowse,
    files,
    onFilesChange,
}) {
    const selectedFiles = files.split(/\r?\n/).map((file) => file.trim()).filter(Boolean);

    return (
        <section>
            <h2>Target</h2>
            <label htmlFor="directory">Working directory</label>
            <div className="inline">
                <input
                    id="directory"
                    value={directory}
                    placeholder="Choose a project directory"
                    onChange={(event) => onDirectoryChange(event.target.value)}
                />
                <button type="button" onClick={() => onBrowse(directory)}>Browse</button>
            </div>
            <div id="directory-list">
                {directory !== parent && (
                    <button
                        type="button"
                        className="entry directory"
                        onClick={() => onBrowse(parent)}
                    >
                        ..
                    </button>
                )}
                {entries.map((entry) => (
                    <button
                        key={entry.path}
                        type="button"
                        className={`entry ${entry.is_directory ? 'directory' : ''}`}
                        onClick={() => entry.is_directory ? onBrowse(entry.path) : onFilesChange(
                            [...new Set([...files.split(/\r?\n/).filter(Boolean), entry.path])]
                        )}
                    >
                        {entry.is_directory ? `📁 ${entry.name}` : entry.name}
                    </button>
                ))}
            </div>
            <label htmlFor="files">Files to add (one path per line)</label>
            <div className="selected-files">
                {selectedFiles.map((file) => (
                    <div className="selected-file" key={file}>
                        <span title={file}>{file}</span>
                        <button
                            type="button"
                            className="remove-file"
                            aria-label={`Remove ${file}`}
                            onClick={() => onFilesChange(selectedFiles.filter((item) => item !== file))}
                        >
                            X
                        </button>
                    </div>
                ))}
            </div>
            <textarea
                id="files"
                value={files}
                placeholder="Click files above or enter paths relative to the working directory"
                onChange={(event) => onFilesChange(event.target.value)}
            />
        </section>
    );
}
