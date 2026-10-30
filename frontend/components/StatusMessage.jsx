export function StatusMessage({message, tone = ''}) {
    let colorClass = '';
    switch (tone) {
        case 'success':
            colorClass = 'text-success';
            break;
        case 'danger':
            colorClass = 'text-danger';
            break;
        case 'warning':
            colorClass = 'text-warning';
            break;
        case 'info':
            colorClass = 'text-info';
            break;
        default:
            colorClass = 'text-dark';
    }

    return (
        <div id="status" className={colorClass}>
            {message}
        </div>
    );
}
