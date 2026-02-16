# Atherforge

Atherforge is a VS Code extension that hosts a multi-model vibe coding workspace with independent sessions per model, file tools, and a pipeline-style flow builder.

## Features

- CSV logging for errors/fix times and GitHub commit history in the logs folder.

## Requirements

- Error fix timing is inferred from the next successful operation.

## Extension Settings

- `atherforge.models.frontendCodeLlama.baseUrl`
- `atherforge.models.frontendCodeLlama.apiKey`
- `atherforge.models.frontendCodeLlama.apiKeyHeader`
- `atherforge.models.frontendCodeLlama.model`
- `atherforge.models.backendClaude.baseUrl`
- `atherforge.models.backendClaude.apiKey`
- `atherforge.models.backendClaude.apiKeyHeader`
- `atherforge.models.backendClaude.model`
- `atherforge.models.reasoningLlama.baseUrl`
- `atherforge.models.reasoningLlama.apiKey`
- `atherforge.models.reasoningLlama.apiKeyHeader`
- `atherforge.models.reasoningLlama.model`
- `atherforge.github.apiBaseUrl`
- `atherforge.github.token`

## Usage

1. Press F5 to launch the extension host.
2. Open the Atherforge view from the activity bar.
3. Set model endpoints and API keys in settings.
4. Use the chat, file tools, and pipeline builder inside the sidebar.

## Known Issues

- Model endpoints are called with a generic JSON payload containing `model` and `messages`.
- Pipeline execution runs nodes sequentially with the previous output as context.

## Release Notes

### 0.0.1

Initial preview of Atherforge.
