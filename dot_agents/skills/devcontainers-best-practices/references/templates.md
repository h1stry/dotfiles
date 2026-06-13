# Dev Container Templates

This file summarizes official Templates, how they are structured and distributed, and how they relate to Features and custom Dockerfiles. For the authoritative Templates specification and distribution rules, use the canonical sources linked below.

## When to use this reference

Use this reference when you need to:

- Find or reference an official or community Dev Container Template.
- Understand what a Template is (structure, options, versioning) and how it differs from a Feature or a custom Dockerfile.
- Look up where Templates are specified (Templates spec, distribution spec, official repo) and how they are discovered (index, OCI refs).
- Create or publish a Template (template-starter, devcontainer-template.json, distribution).

For the full Templates specification and distribution (options schema, versioning, OCI publishing), use [containers.dev/implementors/templates](https://containers.dev/implementors/templates/) and [containers.dev/implementors/templates-distribution](https://containers.dev/implementors/templates-distribution/).

## Canonical URLs and official set

| Resource | URL |
|----------|-----|
| **Templates specification** | [https://containers.dev/implementors/templates/](https://containers.dev/implementors/templates/) |
| **Templates distribution** (publishing, namespace, versioning) | [https://containers.dev/implementors/templates-distribution/](https://containers.dev/implementors/templates-distribution/) |
| **Official Templates repo** | [github.com/devcontainers/templates](https://github.com/devcontainers/templates) |
| **Available Templates index** (official + community) | [https://containers.dev/templates](https://containers.dev/templates) |
| **Template quick start / create your own** | [github.com/devcontainers/template-starter](https://github.com/devcontainers/template-starter) |

The [Available Templates](https://containers.dev/templates) page lists all official and community-supported Templates known from [registered collections](https://containers.dev/collections); each row shows the Template name, maintainer, reference (OCI ID), and latest version. Supporting tools surface these Templates in their Dev Container creation UI (see [containers.dev/supporting](https://containers.dev/supporting)). The official set maintained by Dev Container spec maintainers lives in [devcontainers/templates](https://github.com/devcontainers/templates); its sources are under `src/<template-name>/` with at least `devcontainer-template.json` and `.devcontainer/devcontainer.json` per Template.

## What a Template is

From the [template-starter README](https://github.com/devcontainers/template-starter): *"Templates are source files packaged together that encode configuration for a complete development environment."* A Template provides a **complete starter configuration**: a full `devcontainer.json` (and optionally a Dockerfile) that an implementing tool can apply when creating a new dev container. When a user selects a Template (e.g. from the VS Code, Cursor, or Codespaces “Add Dev Container” flow), the tool resolves the Template’s OCI artifact, applies the user’s chosen **options**, and produces the `.devcontainer/devcontainer.json` (and any other files) for the project.

## Template structure (official repo and template-starter)

From the [template-starter README](https://github.com/devcontainers/template-starter) and the [Templates spec](https://containers.dev/implementors/templates/):

- Each Template lives in its own subfolder under `src/<template-id>/`.
- **Required:** `devcontainer-template.json` (Template metadata and options) and `.devcontainer/devcontainer.json` (the dev container configuration that will be generated or applied).
- **Optional:** `.devcontainer/Dockerfile` or other files under `.devcontainer/` as needed.
- A `test/` folder may mirror `src/` with at least a `test.sh` per Template for validation (e.g. in [devcontainers/templates](https://github.com/devcontainers/templates) and template-starter).

The [Templates spec](https://containers.dev/implementors/templates/) states that **the `options` must be unique for every `devcontainer-template.json`**. All available options for a Template are declared in `devcontainer-template.json`; the syntax is documented in the [devcontainer Template json properties reference](https://containers.dev/implementors/templates#devcontainer-templatejson-properties). Implementing tools use these options to customize the Template (see [option resolution example](https://containers.dev/implementors/templates#option-resolution-example) on the Templates spec page).

## Versioning and distribution

- **Versioning:** Templates are individually versioned by the `version` attribute in each Template’s `devcontainer-template.json`. The [Templates distribution spec](https://containers.dev/implementors/templates-distribution/#versioning) states that Templates are versioned according to the semver specification.
- **Publishing:** Templates are distributed as OCI artifacts. The [Templates distribution](https://containers.dev/implementors/templates-distribution/) spec describes publishing and discovery. Any registry implementing the OCI Distribution spec can be used; the template-starter uses GitHub Container Registry (GHCR). Each Template is referenced by an OCI identifier (e.g. `ghcr.io/devcontainers/templates/python:6.0.0`). A “metadata” package with just the namespace (e.g. `ghcr.io/devcontainers/templates`) is used for discovery.
- **Namespace:** The distribution spec states that the **`namespace`** is a unique identifier for the collection of Templates and **must be different than the collection of Features**. There are no strict rules for the namespace; one common pattern is to set it equal to the source repository’s `owner/repo`. **Templates and Features should be placed in different git repositories** (per [Templates distribution](https://containers.dev/implementors/templates-distribution/)).
- **Adding to the index:** To have a Template collection appear on [containers.dev/templates](https://containers.dev/templates) and in supporting tools’ UIs, maintainers add the collection to the [public index](https://github.com/devcontainers/devcontainers.github.io/blob/gh-pages/_data/collection-index.yml) via a PR to [devcontainers/devcontainers.github.io](https://github.com/devcontainers/devcontainers.github.io).

## Referencing a Template

Users typically select a Template through a supporting tool’s UI (e.g. “Add Dev Container” in VS Code, Cursor, or Codespaces), which reads from the [Available Templates](https://containers.dev/templates) index and resolves the OCI reference. Official Templates from [devcontainers/templates](https://github.com/devcontainers/templates) are published to GHCR and follow the pattern:

- Format: `ghcr.io/devcontainers/templates/<template-name>:<version>`
- Examples: `ghcr.io/devcontainers/templates/python:6.0.0`, `ghcr.io/devcontainers/templates/docker-in-docker:1.3.2`

Community and other collections use the same OCI ref pattern with their own registry path; the [Available Templates](https://containers.dev/templates) table lists the exact reference per Template.

## Template vs Feature vs custom Dockerfile

The spec does not prescribe when to choose a Template vs a Feature vs a custom Dockerfile. The following describes what each provides; use the linked specs and references for details.

| Approach | What it is | Canonical reference |
|----------|------------|---------------------|
| **Template** | A packaged set of source files that encode a **complete** dev container configuration (full `devcontainer.json`, optional Dockerfile). Selected via supporting tools’ “Add Dev Container” / Template picker; options are applied to generate the project’s `.devcontainer/` contents. | [Templates spec](https://containers.dev/implementors/templates/), [Templates distribution](https://containers.dev/implementors/templates-distribution/), [template-starter](https://github.com/devcontainers/template-starter) |
| **Feature** | A modular, reusable component that adds specific tools or capabilities to an existing base image. Added via the `features` property in `devcontainer.json`; one or more Features can be composed on top of a base image or Template-generated config. | [references/features.md](features.md), [Features spec](https://containers.dev/implementors/features/) |
| **Custom Dockerfile** | A Dockerfile you maintain and reference from `devcontainer.json` (e.g. `"build": { "dockerfile": "Dockerfile" }`). Used when you need full control over the image build and layers; can be combined with Features. | [Dev Container metadata reference](https://containers.dev/implementors/json_reference/) (e.g. `build`, `dockerfile`), [Specification](https://containers.dev/implementors/spec/) |

Templates and Features are stored in **separate** git repositories and use **different** OCI namespaces (per the [Templates distribution](https://containers.dev/implementors/templates-distribution/) spec). A single `devcontainer.json` can combine a base image (or image built from a Dockerfile) with multiple Features; a Template is one way to produce that `devcontainer.json` and optional Dockerfile in the first place. For a walkthrough of using images, Dockerfiles, and Docker Compose with the spec, see the [containers.dev guides](https://containers.dev/guides) (e.g. “Using Images, Dockerfiles, and Docker Compose”).

## Related pages

| Topic | URL |
|-------|-----|
| Templates specification | [containers.dev/implementors/templates](https://containers.dev/implementors/templates/) |
| Templates distribution | [containers.dev/implementors/templates-distribution](https://containers.dev/implementors/templates-distribution/) |
| Available Templates (index) | [containers.dev/templates](https://containers.dev/templates) |
| Official Templates repo | [github.com/devcontainers/templates](https://github.com/devcontainers/templates) |
| Template quick start (create your own) | [github.com/devcontainers/template-starter](https://github.com/devcontainers/template-starter) |
| Supporting tools (surface Templates in UX) | [containers.dev/supporting](https://containers.dev/supporting) |
| Features (compare with Templates) | [references/features.md](features.md) |
| Dev Container metadata reference (`build`, Dockerfile) | [containers.dev/implementors/json_reference](https://containers.dev/implementors/json_reference/) |
| Dev Container guides (prebuilds, Dockerfile/Compose, etc.) | [containers.dev/guides](https://containers.dev/guides) |
