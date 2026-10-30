export function StatusMessage({message, tone = ''}) {
    return <div id="status" className={tone}>{message}</div>;
}
