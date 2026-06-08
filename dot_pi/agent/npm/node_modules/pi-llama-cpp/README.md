# pi-llama-cpp

A [Pi Coding Agent](https://pi.dev/) extension that integrates with a running [llama.cpp server](https://github.com/ggml-org/llama.cpp) to provide live model browsing, loading, and switching directly from Pi.

## Features

- **Auto-detect models** — discovers all models available on your running llama.cpp server
- **Live status indicators** — see which models are loaded, loading, failed, sleeping, or unloaded with color-coded icons
- **Load / unload / switch** — manage models directly from the Pi command palette
- **Multi-model router support** — works with both single-model and multi-model llama.cpp server configurations
- **Image capabilities detection** — detects multimodal models automatically
- **Flexible URL resolution** — configures the server URL via project config, environment variable, or global settings

### Status Indicators

| Icon | Status | Description |
|------|--------|-------------|
| 🟢 | Loaded | Model is active and ready to use |
| 🟡 | Loading | Model is currently being loaded |
| 🔴 | Failed | Model failed to load |
| 🔵 | Sleeping | Model is available, but inactive |
| ⚪ | Unloaded | Model is not loaded on the server |

> **Note**: The `Sleeping` status only shows when you start your server with `llama-server --sleep-idle-seconds <n> ...`.
This is a **llama.cpp server flag** that tells the server to put idle models to sleep after `n` seconds.
The model awakens automatically when you send a message.

## Installation

This package is a Pi extension. Install it with

```bash
pi install npm:pi-llama-cpp
```

or

```bash
pi install https://github.com/gsanhueza/pi-llama-cpp
```

## Configuration

The extension resolves the llama.cpp server URL using the following priority order:

1. **Per-project config** — `.pi/llama-server.json` in your project root:

   ```json
   {
     "url": "http://127.0.0.1:8080"
   }
   ```

2. **Environment variable** — `LLAMA_SERVER_URL`

3. **Global settings** — `~/.pi/agent/settings.json`:

   ```json
   {
     "llamaServerUrl": "http://127.0.0.1:8080"
   }
   ```

4. **Default** — `http://127.0.0.1:8080`

### API Key

If your llama.cpp server requires authentication, use `/login` in Pi, select the "API key" option, and choose the `Llama.cpp` provider from the list.

Alternatively, configure the API key in `~/.pi/agent/auth.json` using the provider ID `llama-server`:

> **Note**: The provider is displayed as **Llama.cpp** in the Pi UI, but its internal identifier is `llama-server` — use this ID when configuring `auth.json` or other programmatic access.

```json
{
  "llama-server": {
    "type": "api_key",
    "key": "<your-api-key-here>"
  }
}
```

## Usage

### Prerequisites

Make sure your llama.cpp server is running with the appropriate flags.

- For multi-model support (model router), start the server with:

```bash
llama-server --models-preset path/to/presets.ini ...
```

- For single-model mode, start the server with:

```bash
llama-server --model path/to/model.gguf ...
```

The extension determines the context size as follows:
- **Router mode**
  - When loaded, reads `meta.n_ctx` from the `/models` endpoint
  - When not loaded, reads `--ctx-size` and/or `--fit-ctx` from the server arguments, or `ctx-size` and/or `fit-ctx` keys from the **presets.ini** file.
- **Single mode** — reads `meta.n_ctx` from the `/models` endpoint
- Falls back to `128000` if not available

### Commands

| Command          | Description                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `/models`        | Browse your models with live status. Select a model to load, switch, or unload it.         |
| `/models info`   | Show detailed information for all available models at once.                                |
| `/models unload` | Unload all loaded models at once (Note: this only makes sense in router mode).             |

> **Note:** When the llama.cpp server is unreachable, `/models` displays an error notification with the configured server URL.

### Model Actions

When browsing models via the `/models` command, you can:

- **Load & switch** — Load an unloaded model and switch to it
- **Switch model** — Switch to a model that is already loaded
- **Unload** — Unload a loaded model to free memory
- **Retry** — Retry loading a failed model
- **Info** — View model details (ID, capabilities, context size)
- **Cancel** — Cancel the current operation

> **Note:** In single-model mode, only **Info** and **Cancel** are available, since there is only one model loaded on the server.

### Model Selection Event

When you switch models via Pi's model picker (instead of using the `/models` command), the extension listens for the `model_select` event, which also loads the requested model before the conversation begins.

This keeps the server in sync with the active model in Pi, regardless of how the switch was initiated — you don't need to manually load models before using them.

### Loading Models

When you trigger a load, switch, or retry action, the extension polls the server to track progress. If a model takes longer than **60 seconds** to load, the polling times out with an error.
> **Note:** The timeout is only for the polling. The model might still be loading.

### Model Configuration

Each model exposed to Pi includes the following defaults:

- **`maxTokens`** — dynamically set to the model's context window (detected from llama-server)
- **`reasoning`** — `true` (assumed, as llama.cpp's `/models` endpoint does not expose it)
- **`cost`** — all zero (local models)

## Dependencies

| Dependency                        | Purpose                               |
| --------------------------------- | ------------------------------------- |
| `@earendil-works/pi-coding-agent` | Pi Coding Agent SDK (peer dependency) |
