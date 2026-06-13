# Supporting tools and services

This file summarizes tools and services that support the Development Container Specification and `devcontainer.json`, including tool-specific properties and documented limitations. The single authoritative source is the supporting tools page linked below. Content here is derived from that page and from other official tool documentation.

## Canonical source

- **Supporting tools and services:** [https://devcontainers.github.io/supporting](https://devcontainers.github.io/supporting)

Most [dev container properties](https://containers.dev/implementors/json_reference) apply to any supporting tool or service. Some properties are specific to certain tools and are outlined in the sections below.

---

## Editors

### Visual Studio Code

VS Code–specific properties go under `vscode` inside `customizations`. Editors that use the same extension and configuration (e.g. **Cursor**, **Antigravity**) also support these properties.

```json
"customizations": {
  "vscode": {
    "settings": {},
    "extensions": []
  }
}
```

| Property     | Type   | Description |
| ------------ | ------ | ----------- |
| `extensions` | array  | Extension IDs to install inside the container when it is created. Defaults to `[]`. |
| `settings`   | object | Default `settings.json` values added to a container/machine-specific settings file. Defaults to `{}`. |

The Dev Containers extension (and editors that use it, such as Cursor and Antigravity) and GitHub Codespaces support these VS Code properties.

### Visual Studio

Visual Studio added dev container support in Visual Studio 2022 17.4 for C++ projects using CMake Presets. It is part of the Linux and embedded development with C++ workload. Visual Studio manages the lifecycle of dev containers and treats them as remote targets (similar to other Linux or WSL targets). See the [announcement blog post](https://devblogs.microsoft.com/cppblog/dev-containers-for-c-in-visual-studio/).

### IntelliJ IDEA

IntelliJ IDEA has early support for dev containers that can be run remotely via SSH or locally using Docker. See the [announcement blog post](https://blog.jetbrains.com/idea/2023/06/intellij-idea-2023-2-eap-6/#SupportforDevContainers).

### Zed

[Zed](https://zed.dev/) supports dev containers with its own native implementation (it does not use the VS Code Dev Containers extension). Open a project that contains `.devcontainer/devcontainer.json` (Zed will prompt to open in the container) or use **Project: Open Remote** / Remote Projects (Ctrl-Cmd-Shift-O / Alt-Ctrl-Shift-O). See [Zed Dev Containers docs](https://zed.dev/docs/dev-containers).

Zed follows the core Dev Container Specification, but does not manage extensions separately for container environments—the host’s extensions are used as-is.

**Product-specific limitations** (from [Zed documentation](https://zed.dev/docs/dev-containers)):

| Property or variable   | Type   | Description |
| ---------------------- | ------ | ----------- |
| `forwardPorts`          | array  | Not yet supported; only `appPort` is supported for port forwarding. |
| `portsAttributes`      | object | Not yet implemented. |

Configuration changes to `devcontainer.json` do not trigger automatic rebuilds; manually reopen or restart the container to pick up changes.

---

## Tools

### Dev Container CLI

The [Dev Container CLI](https://github.com/devcontainers/cli) is the reference implementation for the Dev Container Spec. It can take a `devcontainer.json` and create/configure a dev container, prebuild configurations (e.g. via GitHub Actions), detect and apply dev container features, and run [lifecycle scripts](https://devcontainers.github.io/implementors/json_reference/#lifecycle-scripts) such as `postCreateCommand`.

**VS Code extension CLI:** The [VS Code Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) includes a variation of the Dev Container CLI that can open a dev container from the command line. The same CLI can be used from editors that install the Dev Containers extension (e.g. Cursor). Install via Command Palette: **Dev Containers: Install devcontainer CLI**.

### Cachix devenv

[Cachix devenv](https://devenv.sh/) can automatically generate a `.devcontainer.json` file, allowing use of [Nix](https://nixos.org/) with any Dev Container Spec–supporting tool or service. See [devenv documentation](https://devenv.sh/integrations/codespaces-devcontainer/).

### Jetify Devbox

[Jetify](https://jetify.com/) (formerly jetpack.io) offers [DevBox](https://www.jetify.com/devbox/), which uses [Nix](https://nixos.org/) to generate a development environment. The [Jetify VS Code extension](https://marketplace.visualstudio.com/items?itemName=jetpack-io.devbox) can generate Dev Container files for use with any supporting tool or service. Command Palette: **Generate Dev Container files**.

### VS Code Dev Containers extension

The [Visual Studio Code Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) lets you use a Docker container as a full-featured development environment. It implements the VS Code–specific properties under `customizations.vscode`. The extension is also used by VS Code–based editors (e.g. Cursor, Antigravity).

**Product-specific limitations** (from the supporting page):

| Property or variable           | Type | Description |
| ------------------------------ | ---- | ----------- |
| `workspaceMount`               | string | Not yet supported when using Clone Repository in Container Volume. |
| `workspaceFolder`              | string | Not yet supported when using Clone Repository in Container Volume. |
| `${localWorkspaceFolder}`      | Any  | Not yet supported when using Clone Repository in Container Volume. |
| `${localWorkspaceFolderBasename}` | Any  | Not yet supported when using Clone Repository in Container Volume. |

After changing the dev container, run **Dev Containers: Rebuild Container** from the Command Palette to pick up changes.

---

## Services

### GitHub Codespaces

[GitHub Codespaces](https://docs.github.com/en/codespaces/overview) are cloud-hosted development environments. You can connect from the browser, from VS Code, or from other editors that use the Dev Containers extension (e.g. Cursor, Antigravity). Codespaces supports VS Code properties when using the web editor or VS Code.

**Product-specific properties:** Codespaces-specific configuration is under `customizations.codespaces`. Examples from the supporting page:

- **Repository access:** Use `repositories` and `permissions` to grant a codespace access to other repositories. See [Codespaces documentation – managing repository access](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-repository-access-for-your-codespaces).

- **Open files on create:** Use `openFiles` (array of paths relative to the repo root) to specify which files are opened when the codespace is created; they open in order, first file activated.

Codespaces currently reads these properties from `devcontainer.json`, not image metadata.

**Product-specific limitations** (from the supporting page):

| Property or variable       | Type   | Description |
| -------------------------- | ------ | ----------- |
| `mounts`                   | array  | Codespaces ignores "bind" mounts except the Docker socket. Volume mounts are still allowed. |
| `forwardPorts`             | array  | Codespaces does not yet support the `"host:port"` variation. |
| `portsAttributes`          | object | Codespaces does not yet support the `"host:port"` variation. |
| `shutdownAction`           | enum   | Does not apply to Codespaces. |
| `${localEnv:VARIABLE_NAME}`| Any    | For Codespaces, the host is in the cloud rather than your local machine. |
| `customizations.codespaces`| object | Codespaces reads this from devcontainer.json, not image metadata. |
| `hostRequirements`        | object | Codespaces reads this from devcontainer.json, not image metadata. |

After changing the dev container, run **Codespaces: Rebuild Container** from the Command Palette to pick up changes.

### CodeSandbox

[CodeSandbox](https://codesandbox.io/) provides cloud development environments on a microVM architecture. It can provision a dedicated environment per branch and supports the CodeSandbox web editor, VS Code, other editors that use the Dev Containers extension (e.g. Cursor), and the CodeSandbox iOS app. CodeSandbox uses rootless Podman and [devcontainers/cli](https://github.com/devcontainers/cli); limitations of rootless Podman and the Dev Container CLI apply.

**Product-specific properties:** CodeSandbox-specific configuration lives in a `.codesandbox` folder at repo root (e.g. `tasks.json` for startup/click-to-run commands). See [CodeSandbox documentation – task](https://codesandbox.io/docs/learn/repositories/task). CodeSandbox supports Debian- and Ubuntu-based images and has built-in support for many programming languages.

**Product-specific limitations** (from the supporting page):

| Property or variable       | Type   | Description |
| -------------------------- | ------ | ----------- |
| `forwardPorts`             | array  | CodeSandbox does not need this; ports opened in dev containers are mapped to a public URL automatically. |
| `portsAttributes`          | object | CodeSandbox does not yet support this; ports are attributed to tasks in `.codesandbox/tasks.json`. |
| `otherPortsAttributes`     | object | CodeSandbox does not yet support this. |
| `remoteUser`               | string | CodeSandbox currently ignores this and overrides as `root`; rootless Podman is used. Support for non-root is planned. |
| `shutdownAction`           | string | Does not apply to CodeSandbox. |
| `capAdd`                   | array  | CodeSandbox does not support adding Docker capabilities; containers run as non-root. |
| `features`                 | object | CodeSandbox adds docker-cli and connects to the host socket; features like `docker-in-docker` and `docker-outside-of-docker` behave differently; most use cases work via host socket. |
| `${localEnv:VARIABLE_NAME}`| Any    | For CodeSandbox, the host is in the cloud. |
| `hostRequirements`        | object | CodeSandbox does not yet support this. |

### DevPod

[DevPod](https://github.com/loft-sh/devpod) is a client-only tool that creates reproducible developer environments from a `devcontainer.json` on any backend. Environments run in a container and can be created on the local machine, a Kubernetes cluster, a remote machine, or a cloud VM via DevPod providers.

### Ona (formerly Gitpod)

[Ona](https://ona.com/) (formerly Gitpod) provides ephemeral development environments in their cloud or your VPC, with support for the Dev Container Specification and `devcontainer.json`. For constraints, customization, and automation, see [Ona Dev Container docs](https://ona.com/docs/ona/configuration/devcontainer/overview).

---

## Docker vs Podman and runArgs

`runArgs` in `devcontainer.json` is applied regardless of whether the runtime is Docker or Podman. There is no way to make `runArgs` conditional on the runtime in the config file itself. **Podman rootless** often requires extra arguments (e.g. `--userns=keep-id`, `--security-opt=label=disable`) that **Docker does not support**; using those in `runArgs` will break Docker and services like GitHub Codespaces.

**Workaround:** Use a **shim script** that invokes Podman and adds the extra args only when the command is `run`. Set the script path in user settings as **`dev.containers.dockerPath`**. The script can check for `podman run` and prepend options like `--userns=keep-id` before forwarding all arguments. Then one `devcontainer.json` works with Docker (and Codespaces) and with local Podman. For an example `podman-rootless` script and discussion, see [GitHub devcontainers discussion #149](https://github.com/orgs/devcontainers/discussions/149).

---

## Cross-platform (Windows + Linux host)

To have a single dev container setup work on both Windows and Linux hosts:

- Use **multi-platform base images** when possible so the same image works on different host architectures.
- **Volume paths** differ between Windows and Linux; prefer relative paths or paths that are consistent inside the container.
- **Scripts** run inside the container (Linux), so `uname` and similar reflect the container OS, not the host. If you need host-specific logic in lifecycle scripts, document it or use environment variables set by the tool/host where supported.
- **Test on both platforms** (and in CI if applicable) to catch host-specific issues. See [GitHub devcontainers discussion #149](https://github.com/orgs/devcontainers/discussions/149) for community practices.

---

## Multiple containers / multi-project

VS Code allows **one container per window**. To work with multiple services or projects that share a single Compose stack:

- **Docker Compose:** Define multiple services in one `docker-compose.yml`. Create **one `devcontainer.json` per service**, each referencing the same Compose file and setting **`service`** to the desired service name. Use **`workspaceFolder`** so each config opens the right subfolder (e.g. `/workspaces/project-b-node-js` when the repo root is mounted at `/workspaces`).
- **Layout:** A common pattern is `.devcontainer/<project>/devcontainer.json` with a shared `.devcontainer/docker-compose.yml`. Open the repo root; when you run **Dev Containers: Reopen in Container**, pick the project; use **Dev Containers: Switch Container** to change projects without restarting the stack.
- **Shutdown behavior:** Set **`shutdownAction`: `"none"`** in each `devcontainer.json` so closing one window does not stop the other services.
- **GitHub Codespaces** lists all `devcontainer.json` files under `.devcontainer/` (including in subfolders) in the configuration dropdown when creating a codespace.

See [Developing inside a Container](https://code.visualstudio.com/docs/devcontainers/containers) and [Chris Ayers – Multiple dev containers](https://chris-ayers.com/posts/stir-trek-and-multiple-dev-containers/) for full layout examples and troubleshooting (e.g. port forwarding, volume performance).

---

## Related pages

| Topic                    | URL |
| ------------------------ | --- |
| Supporting tools (source)| [devcontainers.github.io/supporting](https://devcontainers.github.io/supporting) |
| Dev Container metadata reference | [containers.dev/implementors/json_reference](https://containers.dev/implementors/json_reference/) |
| devcontainer.json schema | [containers.dev/implementors/json_schema](https://containers.dev/implementors/json_schema/) |
