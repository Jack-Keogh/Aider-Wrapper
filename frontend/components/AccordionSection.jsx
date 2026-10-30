export function AccordionSection({id, title, summary, isOpen, onToggle, children}) {
    return (
        <section className={`accordion-section ${isOpen ? 'is-open' : ''}`}>
            <button
                type="button"
                className="accordion-trigger"
                aria-controls={`${id}-content`}
                aria-expanded={isOpen}
                onClick={onToggle}
            >
                <span>
                    <span className="accordion-title">{title}</span>
                    {summary && <span className="accordion-summary">{summary}</span>}
                </span>
                <span className="accordion-chevron" aria-hidden="true">⌄</span>
            </button>
            <div id={`${id}-content`} className="accordion-content">
                <div className="accordion-content-inner">{children}</div>
            </div>
        </section>
    );
}
