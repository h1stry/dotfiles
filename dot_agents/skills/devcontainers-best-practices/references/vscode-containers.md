# VS Code Dev Containers: workflows, requirements, and behavior

This file summarizes the main VS Code “Developing inside a Container” documentation: system requirements, workflows, pre-building, ports, extensions, limitations, and container management. For the full doc, use the canonical source below. Content here is derived from official VS Code documentation.

## Canonical source

- **Developing inside a Container:** [https://code.visualstudio.com/docs/devcontainers/containers](https://code.visualstudio.com/docs/devcontainers/containers)

Editors that use the same Dev Containers extension (e.g. Cursor, Antigravity) follow the same behavior; see [references/tools.md](tools.md) for tool-specific properties and limitations.

---

## System requirements

**Host (from VS Code docs):**

- **Windows:** Docker Desktop 2.0+ (Windows 10 Pro/Enterprise). Windows 10 Home (2004+) needs Docker Desktop 2.3+ with WSL 2 back-end. Docker Toolbox and Windows container images are not supported.
- **macOS:** Docker Desktop 2.0+.
- **Linux:** Docker CE/EE 18.06+ and Docker Compose 1.21+. The Ubuntu snap package is not supported.
- **Remote hosts:** At least 2 GB RAM and 2-core CPU recommended.

**Containers:** x86_64 / ARM Debian 9+, Ubuntu 16.04+, CentOS/RHEL 7+, or Alpine 3.9+. Other glibc-based Linux containers may work if they have the needed prerequisites. **Note:** Alpine images can cause issues with some extensions due to `glibc` dependencies in native code.

---

## Quick-start workflows

VS Code documents three main ways to get started (see the [Containers doc](https://code.visualstudio.com/docs/devcontainers/containers)):

1. **Try a development container** — Use a sample repo to try dev containers without changing an existing project.
2. **Open an existing folder in a container** — Use **Dev Containers: Open Folder in Container...** (or **Add Dev Container Configuration Files...** to add config first). The folder is bind-mounted into the container. Best when you already have the project locally.
3. **Clone a Git repo or GitHub PR in a container volume** — Use **Dev Containers: Clone Repository in Container Volume...**. The repo is cloned into an isolated Docker volume (no local bind mount). Better performance on Windows/macOS and useful for PR review or trying a branch without affecting local work.

---

## Workspace trust

The Dev Containers extension uses Workspace Trust. You may be prompted to trust:

- The local (or WSL) folder when reopening in container.
- The container when attaching to an existing container.
- The repository when cloning in a container volume.

See [Developing inside a Container – Trusting your Workspace](https://code.visualstudio.com/docs/devcontainers/containers#trusting-your-workspace).

---

## Pre-building and image metadata

Pre-building images (e.g. with the Dev Container CLI or GitHub Actions) is recommended: faster startup, simpler config, and the ability to pin tool versions. Pre-built images can include dev container metadata in image labels; when you reference such an image, settings are merged automatically so a minimal `devcontainer.json` in the repo can suffice.

See [Developing inside a Container – Pre-building dev container images](https://code.visualstudio.com/docs/devcontainers/containers#pre-building-dev-container-images) and [containers.dev/guides](https://containers.dev/guides) (e.g. “Speed Up Your Workflow with Prebuilds”). Merge behavior is defined in the [spec](https://containers.dev/implementors/spec/#merge-logic); summary in [references/spec.md](spec.md).

---

## Ports: forward vs publish

- **Forwarded ports** (`forwardPorts`): VS Code forwards the port so the app sees traffic as localhost. Use this for most cases. You can also temporarily forward a port via the Command Palette (**Forward a Port**).
- **Published ports** (`appPort` in devcontainer.json, or `ports` in Docker Compose): Exposed when the container is created; behave like ports on the host network. Use when you need network-visible ports.

See [Dev Container metadata reference – forwardPorts / appPort](https://containers.dev/implementors/json_reference/) and [Developing inside a Container – Forwarding or publishing a port](https://code.visualstudio.com/docs/devcontainers/containers#forwarding-or-publishing-a-port).

---

## Extensions

- **Install in container:** List extension IDs under `customizations.vscode.extensions` in `devcontainer.json`. Right-click an extension in the Extensions view and **Add to devcontainer.json** to add it.
- **Opt out:** Prefix an extension ID with `-` (e.g. `"-dbaeumer.vscode-eslint"`) to avoid installing an extension that a base image or Feature adds.
- **Always installed (user setting):** `dev.containers.defaultExtensions` in user settings installs those extensions in every dev container.

---

## Dotfiles

You can use a dotfiles repository (e.g. on GitHub) so your shell config and other dotfiles are applied when the container is created. Configure in user settings: `dotfiles.repository`, `dotfiles.targetPath`, `dotfiles.installCommand`. See [Developing inside a Container – Personalizing with dotfile repositories](https://code.visualstudio.com/docs/devcontainers/containers#personalizing-with-dotfile-repositories).

---

## Managing containers

- By default, the extension starts containers when you open the folder and shuts them down when you close VS Code. Set `"shutdownAction": "none"` in `devcontainer.json` to keep containers running when you close the window (useful when sharing a Compose stack across multiple projects).
- Use the **Remote Explorer** (Containers) to stop/start/remove containers, forward ports, and open forwarded ports in the browser.

See [Developing inside a Container – Managing containers](https://code.visualstudio.com/docs/devcontainers/containers#managing-containers).

---

## Advanced configuration

For environment variables, extra mounts, persist bash history, improve disk performance, non-root user, Docker Compose project name, using Docker or Kubernetes from inside the container, multiple containers, remote Docker host, reducing Dockerfile warnings, Docker options, and sharing Git credentials, see:

- **Advanced container configuration:** [https://code.visualstudio.com/remote/advancedcontainers/overview](https://code.visualstudio.com/remote/advancedcontainers/overview)

Topics covered there include: environment variables, start processes, add local file mount, persist bash history, change default mount, improve performance, add non-root user, set Docker Compose project name, use Docker or Kubernetes from inside container, connect to multiple containers, develop on a remote Docker host, reduce Docker warnings, Docker options, sharing Git credentials.

---

## Known limitations (VS Code doc)

From [Developing inside a Container – Known limitations](https://code.visualstudio.com/docs/devcontainers/containers#known-limitations):

- Windows container images are not supported.
- All roots in a multi-root workspace open in the same container.
- Ubuntu Docker snap package (Linux) is not supported.
- Docker Toolbox on Windows is not supported.
- Alpine: some extensions may not work due to `glibc` dependencies.
- Other limitations (e.g. proxy settings, SSH passphrase with Git) are documented in the VS Code Tips and Tricks and Advanced container configuration pages.

For OS-specific tips, troubleshooting, and cleanup, see [references/tips-and-tricks.md](tips-and-tricks.md).

---

## Related pages

| Topic | URL |
|-------|-----|
| Developing inside a Container | [code.visualstudio.com/docs/devcontainers/containers](https://code.visualstudio.com/docs/devcontainers/containers) |
| Advanced container configuration | [code.visualstudio.com/remote/advancedcontainers/overview](https://code.visualstudio.com/remote/advancedcontainers/overview) |
| Dev Containers Tips and Tricks | [code.visualstudio.com/docs/devcontainers/tips-and-tricks](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks) |
| Supporting tools | [devcontainers.github.io/supporting](https://devcontainers.github.io/supporting) |
| Spec, merge logic | [references/spec.md](spec.md) |
