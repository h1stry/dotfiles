# Dev Container Features

This file summarizes official Features, how to reference them (OCI refs), versioning, options, and dependency/install order. For authoritative definitions and the full dependency algorithm, use the canonical sources linked below.

## When to use this reference

Use this reference when you need to:

- Find or reference an official or community Dev Container Feature.
- Understand how to specify a Feature in `devcontainer.json` (OCI reference format, version tag).
- Look up how Feature options work and where they are defined.
- Understand dependency and installation order (`dependsOn`, `installsAfter`, `overrideFeatureInstallOrder`).

For the full Features specification (definitions, dependency algorithm, equality rules), use [containers.dev/implementors/features](https://containers.dev/implementors/features/).

## Canonical URLs and official set

| Resource | URL |
|----------|-----|
| **Features specification** | [https://containers.dev/implementors/features/](https://containers.dev/implementors/features/) |
| **Features distribution** (publishing, namespace) | [https://containers.dev/implementors/features-distribution/](https://containers.dev/implementors/features-distribution/) |
| **Official Features repo** | [github.com/devcontainers/features](https://github.com/devcontainers/features) |
| **Available Features index** (official + community) | [https://containers.dev/features](https://containers.dev/features) |
| **Feature metadata schema** (`devcontainer-feature.json`) | [github.com/devcontainers/spec – devContainerFeature.schema.json](https://github.com/devcontainers/spec/blob/main/schemas/devContainerFeature.schema.json) |

The [Available Features](https://containers.dev/features) page lists all official and community-supported Features known from [registered collections](https://containers.dev/collections); each row shows the Feature name, maintainer, reference (OCI ID), and latest version. The official set maintained by Dev Container spec maintainers lives in [devcontainers/features](https://github.com/devcontainers/features); its sources are under `src/<feature-name>/` with a `devcontainer-feature.json` and `install.sh` per Feature.

## Referencing a Feature (OCI refs)

Features are added in the `features` property of `devcontainer.json`. The value is an object mapping **Feature IDs** (and optional version tags) to **options**. As per the [Dev Container metadata reference](https://containers.dev/implementors/json_reference/#general-properties): *"An object of [Dev Container Feature IDs](https://containers.dev/features) and related options to be added into your primary container. The specific options that are available varies by feature, so see its documentation for additional details."*

**Official Features** from [devcontainers/features](https://github.com/devcontainers/features) are published to the GitHub Container Registry. Reference them with the OCI identifier:

- Format: `ghcr.io/devcontainers/features/<feature-name>:<version>`  
- Example: `ghcr.io/devcontainers/features/go:1`, `ghcr.io/devcontainers/features/docker-in-docker:1`

From the [Features spec](https://containers.dev/implementors/features/) and the [official Features README](https://github.com/devcontainers/features): the **`:latest` version annotation is added implicitly if omitted**. To pin to a specific package version, append it to the end of the Feature (e.g. [go versions](https://github.com/devcontainers/features/pkgs/container/features/go/versions)).

Example from the [devcontainers/features README](https://github.com/devcontainers/features):

```jsonc
"features": {
    "ghcr.io/devcontainers/features/go:1": {
        "version": "1.18"
    },
    "ghcr.io/devcontainers/features/docker-in-docker:1": {
        "version": "latest",
        "moby": true
    }
}
```

Community and other collections use the same OCI ref pattern with their own registry path (e.g. `ghcr.io/iterative/features/dvc:1`); the [Available Features](https://containers.dev/features) table lists the exact reference per Feature.

## Versioning

From the [official Features README](https://github.com/devcontainers/features): *"Features follow semantic versioning conventions, so you can pin to a major version `:1`, minor version `:1.0`, or patch version `:1.0.0` by specifying the appropriate label."*

The [Feature metadata schema](https://github.com/devcontainers/spec/blob/main/schemas/devContainerFeature.schema.json) requires a `version` property and states it *"Follows the semantic versioning (semver) specification."*

## Options

Feature options are user-configurable and are passed as environment variables when the Feature is installed. From the [devContainerFeature schema](https://github.com/devcontainers/spec/blob/main/schemas/devContainerFeature.schema.json):

- **`options`**: *"Possible user-configurable options for this Feature. The selected options will be passed as environment variables when installing the Feature into the container."*
- Each option is a **FeatureOption** with:
  - **`type`**: `boolean` or `string`.
  - **`default`**: value when the user omits the option.
  - For `string`: **`enum`** (allowed values only) or **`proposals`** (suggested values; *"the installation script can handle arbitrary values provided by the user"*).

Which options exist and their meaning are defined per Feature; see the Feature’s documentation (e.g. each Feature’s README in [devcontainers/features](https://github.com/devcontainers/features) or the [Available Features](https://containers.dev/features) links).

## Dependency and installation order

The implementing tool is responsible for computing the Feature installation order (or failing if no valid order exists). The following is taken from the [Features specification – Dependency installation order algorithm](https://containers.dev/implementors/features/).

### Set of Features to install

The set is the **union** of user-defined Features (listed in `devcontainer.json`) and their dependencies (from `dependsOn` or `installsAfter`), taking into account the dev container’s **`overrideFeatureInstallOrder`** property.

### Algorithm (summary)

1. **Build a dependency graph**  
   From user-defined Features, the tool builds a graph by following each Feature’s `dependsOn` and `installsAfter`. For `dependsOn`, dependencies are recursively resolved. The graph has two edge types: **`dependsOn`** (hard dependencies) and **`installsAfter`** (soft dependencies). If the same Feature (by [Feature Equality](https://containers.dev/implementors/features/)) is already in the set, it is not added again.

2. **Round priority**  
   Each node has a default `roundPriority` of 0. It can be changed when `overrideFeatureInstallOrder` is used or when sorting by canonical name (e.g. for OCI Features, the Feature ID resolved to the digest).

3. **Round-based sorting**  
   The tool processes the graph in rounds. In each round, it considers Features whose dependencies are already in the installation order; among those, it commits only nodes with the **maximum** `roundPriority`, and defers the rest to later rounds. Ties within a round are broken by the spec’s **Round Stable Sort** (option values lexicographically, then option keys, then number of user-defined options). If a round adds no nodes to the installation order, the tool must **fail** (e.g. circular dependency).

If **`overrideFeatureInstallOrder`** is inconsistent with the dependency graph, the implementing tool **should fail** the dependency resolution step (per the [Features spec](https://containers.dev/implementors/features/) and the [Feature schema](https://github.com/devcontainers/spec/blob/main/schemas/devContainerFeature.schema.json) description of this property).

### dependsOn vs installsAfter

From the [devContainerFeature schema](https://github.com/devcontainers/spec/blob/main/schemas/devContainerFeature.schema.json):

- **`dependsOn`**: *"An object of Feature dependencies that must be satisfied before this Feature is installed. Elements follow the same semantics of the features object in devcontainer.json."*
- **`installsAfter`**: *"Array of ID's of Features that should execute before this one. Allows control for feature authors on soft dependencies between different Features."*

The spec notes that before round-based installation, tools should remove any `installsAfter` edge that does not correspond to a Feature in the set to be installed. A circular dependency or inconsistent use of `installsAfter` must cause the dependency resolution step to fail.

## devcontainer-feature.json (feature metadata)

Each Feature is described by a **`devcontainer-feature.json`** file. The [devContainerFeature schema](https://github.com/devcontainers/spec/blob/main/schemas/devContainerFeature.schema.json) defines the structure. Required properties:

- **`id`**: *"The id should be unique in the context of the repository/published package where the feature exists and must match the name of the directory where the devcontainer-feature.json resides."*
- **`version`**: semver string.

Other defined properties include `name`, `description`, `options`, `dependsOn`, `installsAfter`, `documentationURL`, `containerEnv`, `customizations`, `mounts`, lifecycle commands (`onCreateCommand`, `updateContentCommand`, `postCreateCommand`, etc.), and container options (`privileged`, `init`, `capAdd`, `securityOpt`). See the schema and [Features spec](https://containers.dev/implementors/features/) for details.

## Official repo structure

From the [devcontainers/features README](https://github.com/devcontainers/features):

- **`src/`** — One subfolder per Feature; each contains at least `devcontainer-feature.json` and `install.sh`.
- **`test/`** — Mirrors `src/` with at least a `test.sh` per Feature; the [Dev Container CLI](https://github.com/devcontainers/cli) runs these in CI.

## Features distribution (namespace, publishing)

The [Features distribution](https://containers.dev/implementors/features-distribution/) spec states that **`namespace`** is a unique identifier for the collection of Features; there are no strict rules, but one pattern is to set it equal to the source repository’s `/`. Supporting tools are expected to implement the required OCI artifact distribution behavior rather than relying on external tools for production use.

## Authoring Features

This section is for **authoring** or **publishing** Dev Container Features (writing `devcontainer-feature.json` and `install.sh`), not for using Features in `devcontainer.json`. For using Features, see the sections above.

**Canonical guide:** [Best Practices: Authoring a Dev Container Feature](https://containers.dev/guide/feature-authoring-best-practices)  
**Starter repo:** [github.com/devcontainers/feature-starter](https://github.com/devcontainers/feature-starter)

### Testing

- Use **`devcontainer features test`** (from the [Dev Container CLI](https://github.com/devcontainers/cli)) to test your Feature before publishing. Use the `--base-image` flag or [scenarios](https://github.com/devcontainers/cli/blob/main/docs/features/test.md#scenarios) to validate against multiple base images. The feature-starter and [devcontainers/features](https://github.com/devcontainers/features) repos show example workflows.

### Idempotency and multi-version installs

- Design Features to be **idempotent**: they may be installed multiple times with different options (e.g. when other Features depend on them). For versioned tools (e.g. Go, Ruby), support installing multiple versions—use a version manager (SDKMAN, rvm) when available, or install each version to a known location and symlink the active one. Expose the tool on PATH via **`containerEnv`** in `devcontainer-feature.json`, e.g. `"PATH": "/usr/local/myTool/bin:${PATH}"`.

### Install script practices

- **Detect OS/distro:** Many Features target a subset of base images (e.g. Debian/Ubuntu). Source `/etc/os-release`, check the distro/codename, and **exit with a clear error** if the OS is not supported so users know which base image to use.
- **Non-root user:** Installation runs as root; the container may use a non-root `remoteUser`. Use the injected env vars **`_REMOTE_USER`** and **`_REMOTE_USER_HOME`** (see [Features spec – user env var](https://containers.dev/implementors/features/#user-env-var)) when installing into the user’s home or setting ownership.
- **Redundant install paths:** Upstream URLs or package sources can change. Prefer multiple install strategies (e.g. package manager first, then GitHub release fallback) and add scenario tests that exercise different paths.

See the [containers.dev authoring guide](https://containers.dev/guide/feature-authoring-best-practices) for full detail and examples.

## Related pages

| Topic | URL |
|-------|-----|
| Features specification | [containers.dev/implementors/features](https://containers.dev/implementors/features/) |
| Features distribution | [containers.dev/implementors/features-distribution](https://containers.dev/implementors/features-distribution/) |
| Available Features (index) | [containers.dev/features](https://containers.dev/features) |
| Official Features repo | [github.com/devcontainers/features](https://github.com/devcontainers/features) |
| Feature metadata schema | [devcontainers/spec – devContainerFeature.schema.json](https://github.com/devcontainers/spec/blob/main/schemas/devContainerFeature.schema.json) |
| Dev Container metadata reference (`features` property) | [containers.dev/implementors/json_reference](https://containers.dev/implementors/json_reference/) |
| Feature quick start / create your own | [github.com/devcontainers/feature-starter](https://github.com/devcontainers/feature-starter) |
| Feature authoring best practices | [containers.dev/guide/feature-authoring-best-practices](https://containers.dev/guide/feature-authoring-best-practices) |
