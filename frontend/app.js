async function runAider() {
    const input = document.getElementById('input').value;
    const output = document.getElementById('output');
    output.textContent = 'Running Aider...';

    try {
        const response = await fetch('/run_aider', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command: input })
        });

        if (response.ok) {
            const result = await response.text();
            output.textContent = result;
        } else {
            output.textContent = `Error: ${response.status} - ${response.statusText}`;
        }
    } catch (error) {
        output.textContent = `Error: ${error.message}`;
    }
}
