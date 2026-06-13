# Dev Containers Tips and Tricks

This file summarizes the VS Code “Dev Containers Tips and Tricks” page: OS-specific setup, Git, performance, cleanup, troubleshooting, profile persistence, and reporting issues. For the full content, use the canonical source below.

## Canonical source

- **Dev Containers Tips and Tricks:** [https://code.visualstudio.com/docs/devcontainers/tips-and-tricks](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks)

---

## Customize AI / Copilot in the container

You can add custom instructions so Copilot (or compatible AI assistants) know more about your dev container (e.g. languages and tools installed):

- **In devcontainer.json:** Use `customizations.vscode.settings` with `github.copilot.chat.codeGeneration.instructions` (or the equivalent key for your editor).
- **File-based:** Use a `copilot-instructions.md` file in the project; same as for local development.

See [Tips and Tricks – Customize AI Chat Responses](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#customize-ai-chat-responses).

---

## Docker Desktop (Windows / macOS)

- **Windows:** Prefer Docker Desktop’s WSL 2 back-end when possible; avoid LCOW for dev containers (extension supports Linux containers only). Ensure file sharing includes drives where your code lives; firewall may need to allow Docker.
- **macOS:** Under **Preferences → Resources → File Sharing**, ensure the folder containing your source code is included. WSL 2 is not required on macOS.

See [Tips and Tricks – Docker Desktop](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#docker-desktop-for-windows-tips) and [Enabling file sharing](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#enabling-file-sharing-in-docker-desktop).

---

## Git: line endings, credentials, Compose, SSH

- **Line endings:** Windows and Linux differ; Git may report many “modified” files. Use a `.gitattributes` file (e.g. `* text=auto eol=lf`) or `git config core.autocrlf` so behavior is consistent when working both locally and in the container. See [Tips and Tricks – Resolving Git line ending issues](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#resolving-git-line-ending-issues-in-containers-resulting-in-many-modified-files).
- **Credentials:** If you use a Git credential manager, the container can use it. For SSH, you can share keys. See the main [Containers doc – Sharing Git credentials](https://code.visualstudio.com/docs/devcontainers/containers) and Advanced container configuration.
- **Docker Compose:** To avoid setting up Git repeatedly in the container, see [Sharing Git credentials with your container](https://code.visualstudio.com/docs/remote/advancedcontainers/overview#sharing-git-credentials-with-your-container).
- **SSH key with passphrase:** VS Code pull/sync may hang. Use an SSH key without a passphrase, use HTTPS, or run `git push` from the terminal. See [Tips and Tricks – Resolving hangs when doing a Git push or sync](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#resolving-hangs-when-doing-a-git-push-or-sync-from-a-container).

---

## Performance: speeding up containers and disk

- **Resource allocation:** Increase Docker Desktop CPU, memory, or disk (e.g. **Settings → Advanced**). Stop unused containers first.
- **Resource Monitor:** The Resource Monitor extension (e.g. `mutantdino.resourcemonitor`) can show container resource use in the status bar. Add to `dev.containers.defaultExtensions` in user settings if you want it in every container.
- **Disk performance:** On Windows/macOS, bind mounts can be slow. See [Improving container disk performance](https://code.visualstudio.com/remote/advancedcontainers/overview#improve-performance) (e.g. cached volumes, excluding `node_modules` from sync).

See [Tips and Tricks – Speeding up containers in Docker Desktop](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#speeding-up-containers-in-docker-desktop).

---

## Cleaning unused containers and images

- **Remote Explorer:** Right-click a container → **Remove Container** (does not remove images).
- **Container Tools extension:** In a local window, use Container Explorer to remove containers or images.
- **Docker CLI:** `docker ps -a`, `docker rm <id>`, `docker image prune`. To list dev containers:  
  `docker ps -a --filter="label=vsch.quality" --format "table {{.ID}}\t{{.Status}}\t{{.Image}}\t..."`
- **Docker Compose:** From the project directory, `docker-compose down`.
- **Full cleanup:** `docker system prune --all` (removes all unused containers and images).

See [Tips and Tricks – Cleaning out unused containers and images](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#cleaning-out-unused-containers-and-images).

---

## Troubleshooting

- **Missing Linux dependencies:** Some extensions need libraries not in the image. See [Containers doc](https://code.visualstudio.com/docs/devcontainers/containers) and [Tips and Tricks – Resolving errors about missing Linux dependencies](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#resolving-errors-about-missing-linux-dependencies).
- **Debian 8 (Jessie) images:** Archive changes can break `apt`. Use a newer base image or add archived sources in the Dockerfile; see [Tips and Tricks – Resolving Dockerfile build failures for images using Debian 8](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#resolving-dockerfile-build-failures-for-images-using-debian-8).
- **Docker Hub sign-in:** Use your Docker ID, not your email. See [Tips and Tricks – Resolving Docker Hub sign in errors](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#resolving-docker-hub-sign-in-errors-when-an-email-is-used).
- **High CPU (macOS):** `com.docker.hyperkit` can spike when watching files or building. See [Tips and Tricks – High CPU utilization of Hyperkit on macOS](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#high-cpu-utilization-of-hyperkit-on-macos).
- **Remote Docker host:** If direct SSH/tcp to Docker does not work, you can use an SSH tunnel and set `DOCKER_HOST=tcp://localhost:<port>` (and `containers.environment` in settings). See [Tips and Tricks – Using an SSH tunnel to connect to a remote Docker host](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#using-an-ssh-tunnel-to-connect-to-a-remote-docker-host).

---

## Persisting user profile (e.g. bash history)

Use the `mounts` property so a volume survives rebuilds while letting VS Code reinstall extensions and dotfiles:

```json
"mounts": [
    "source=profile,target=/root,type=volume",
    "target=/root/.vscode-server,type=volume"
]
```

Adjust paths if you use a non-root `remoteUser`. See [Tips and Tricks – Persisting user profile](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#persisting-user-profile).

---

## Reporting issues

- **Dev Containers extension:** **Dev Containers: Show Container Log** from the Command Palette.
- **Other extensions in container:** **Output: Focus on Output View** → select **Log (Remote Extension Host)**.

See [Tips and Tricks – Reporting issues](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks#reporting-issues).

---

## Related pages

| Topic | URL |
|-------|-----|
| Dev Containers Tips and Tricks | [code.visualstudio.com/docs/devcontainers/tips-and-tricks](https://code.visualstudio.com/docs/devcontainers/tips-and-tricks) |
| Developing inside a Container | [references/vscode-containers.md](vscode-containers.md) |
| Advanced container configuration | [code.visualstudio.com/remote/advancedcontainers/overview](https://code.visualstudio.com/remote/advancedcontainers/overview) |
