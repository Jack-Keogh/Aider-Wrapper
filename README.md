# WBoard

WBoard is a local web launcher for Aider and LM Studio.

## Run

From the repository root:

```powershell
npm start
```

The launcher opens at <http://localhost:8000>. It builds the frontend, discovers
models from LM Studio's OpenAI-compatible `/v1/models` endpoint, lets you browse
to a working directory, and runs Aider in that directory.

For frontend development with hot reload:

```powershell
npm run dev
```

This starts Vite on <http://localhost:5173> and the launcher API on port 8000;
Vite proxies `/api` requests to the launcher automatically.

## Aider options

The launcher exposes common Aider settings (model, edit format, files, prompt,
auto-confirmation, commits, streaming, and file watching). The **Advanced Aider
arguments** field accepts any additional Aider CLI arguments, so new Aider
features do not require a launcher update.

LM Studio model IDs are automatically sent to Aider with the required
`openai/` provider prefix. Models that already include a provider prefix are
left unchanged.

The configured LM Studio base URL should normally be:

```text
http://localhost:1234/v1
```

## Frontend structure

The frontend is a React component tree under `frontend/`:

- `App.jsx` owns shared launcher state and coordinates the API.
- `components/DirectoryBrowser.jsx` handles target directories and files.
- `components/ModelSettings.jsx` handles LM Studio connection and model selection.
- `components/RequestPanel.jsx` handles prompts and Aider flags.
- `components/OutputPanel.jsx` and `components/StatusMessage.jsx` render results.
- `api.js` contains the HTTP client functions.
- `main.jsx` is the React entry point and `styles.css` contains shared styling.
