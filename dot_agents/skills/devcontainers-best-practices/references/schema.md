# devcontainer.json: JSON reference vs schema and validation

This file summarizes when to use the Dev Container metadata reference vs the JSON schema, their canonical URLs, and how to validate `devcontainer.json`. For full property lists and schema definitions, use the canonical sources linked below.

## When to use the JSON reference vs the JSON schema

| Use case | Use this |
|----------|----------|
| **Property-by-property documentation** (name, type, description, defaults) | [Dev Container metadata reference](https://containers.dev/implementors/json_reference/) (JSON reference) |
| **Lifecycle scripts** (order, string vs array vs object, which run on host vs in container) | [Dev Container metadata reference – Lifecycle scripts](https://containers.dev/implementors/json_reference/#lifecycle-scripts) |
| **Which properties can go in image labels** (🏷️ in the reference) | [Dev Container metadata reference](https://containers.dev/implementors/json_reference/) |
| **Machine validation, types, allowed values** | [devcontainer.json schema](https://containers.dev/implementors/json_schema/) (JSON schema) |
| **IDE support** (autocomplete, validation, hover) | JSON schema (see [How to validate](#how-to-validate) below) |

The [devcontainer.json schema](https://containers.dev/implementors/json_schema/) page states that the base schema describes all base properties “as documented in the [devcontainer.json reference](https://containers.dev/implementors/json_reference)”. So: use the **reference** for human-readable docs and intent; use the **schema** for validation and tooling.

## Canonical URLs

| Resource | Canonical URL |
|----------|----------------|
| **Dev Container metadata reference** (property reference) | [https://containers.dev/implementors/json_reference/](https://containers.dev/implementors/json_reference/) |
| **devcontainer.json schema** (schema docs and structure) | [https://containers.dev/implementors/json_schema/](https://containers.dev/implementors/json_schema/) |
| **Base schema** (spec repo; base properties only) | [https://github.com/devcontainers/spec/blob/main/schemas/devContainer.base.schema.json](https://github.com/devcontainers/spec/blob/main/schemas/devContainer.base.schema.json) |
| **Main schema** (spec repo; base + tool-specific) | [https://github.com/devcontainers/spec/blob/main/schemas/devContainer.schema.json](https://github.com/devcontainers/spec/blob/main/schemas/devContainer.schema.json) |

The schema page notes that the main schema references the base schema plus tool-specific schemas (e.g. VS Code, Codespaces) from the [VSCode repo](https://github.com/microsoft/vscode).

## How to validate

Validation of `devcontainer.json` is supported by the JSON schema and by the reference implementation CLI. The following is taken from [containers.dev/implementors/json_schema](https://containers.dev/implementors/json_schema/) and [containers.dev/implementors/reference](https://containers.dev/implementors/reference/).

### Using the JSON schema (IDE / editor)

- **VS Code and other editors** that support JSON Schema can validate `devcontainer.json` when the file (or the workspace) is associated with the devcontainer schema. The [devcontainer.json schema](https://containers.dev/implementors/json_schema/) page describes the base and main schemas in the [devcontainers/spec](https://github.com/devcontainers/spec) repo; the main schema combines the base schema with tool-specific schemas (e.g. `devContainer.vscode.schema.json`, `devContainer.codespaces.schema.json`).
- Adding a `$schema` property to `devcontainer.json` that points to the canonical schema URL (e.g. the main schema in the spec repo) ensures the editor uses the correct schema for validation and IntelliSense. The [Dev Container metadata reference](https://containers.dev/implementors/json_reference/) also links to the schema under [Schema](https://containers.dev/implementors/json_reference/#schema).

### Using the Dev Container CLI (reference implementation)

The [reference implementation](https://containers.dev/implementors/reference/) is the [Dev Container CLI](https://github.com/devcontainers/cli). It reads `devcontainer.json` and creates/configures a dev container from it. Validation is implicit when the CLI uses the configuration:

- **`devcontainer read-configuration`** — Reads and outputs the resolved configuration for a workspace. Invalid or unsupported structure may produce errors or unexpected output.
- **`devcontainer build`** / **`devcontainer up`** — Build or start a dev container from `devcontainer.json`; invalid configuration typically surfaces as failures or errors when the CLI parses or applies the config.

Install the CLI globally with:

```bash
npm install -g @devcontainers/cli
```

Then run from a folder that contains `.devcontainer/devcontainer.json` (or pass `--workspace-folder`). The CLI repo README and the [Reference Implementation](https://containers.dev/implementors/reference/) page describe usage and options.

## Related pages

| Topic | URL |
|-------|-----|
| Dev Container metadata reference | [containers.dev/implementors/json_reference](https://containers.dev/implementors/json_reference/) |
| devcontainer.json schema | [containers.dev/implementors/json_schema](https://containers.dev/implementors/json_schema/) |
| Reference implementation (CLI) | [containers.dev/implementors/reference](https://containers.dev/implementors/reference/) |
| Spec repo (schemas, spec) | [github.com/devcontainers/spec](https://github.com/devcontainers/spec) |
| Dev Container CLI | [github.com/devcontainers/cli](https://github.com/devcontainers/cli) |
