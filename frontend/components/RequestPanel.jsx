const flags = [
    ['yes_always', 'Auto-confirm changes'],
    ['no_auto_commits', 'Disable auto commits'],
    ['dirty_commits', 'Allow dirty commits'],
    ['attribute_author', 'Attribute author'],
    ['attribute_committer', 'Attribute committer'],
    ['no_stream', 'Disable streaming'],
    ['watch_files', 'Watch files'],
];

export function RequestPanel({request, onChange, isOpen, onToggle}) {
    return (
        <>
            <AccordionSection
                id="request"
                title="Request"
                summary="Configure Aider options"
                isOpen={isOpen}
                onToggle={onToggle}
            >
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
            </AccordionSection>
        </>
    );
}
import {AccordionSection} from './AccordionSection.jsx';
