-- DRAFT --

# TBD

- finish the SECURITY-AUDIT before publishing this
- carefully review devDependency versus dependency
- update the docs to say the audit must be repeated whenever the lockfile is changed
- include a monitoring section

  > - **Continuous Monitoring:** GitHub Dependabot alerts are enabled on `package-lock.json` to detect newly disclosed vulnerabilities. Alerts are reviewed and triaged based on whether they affect the shipped runtime bundle or only local development tools.
  > - **Lockfile Integrity:** A committed `package-lock.json` ensures reproducible builds and prevents unreviewed upstream version changes until updates are explicitly tested and merged.

- investigate `--ommit` attribute i.e. `npm audit --omit=dev --audit-level=high` e.g. on PRs and when building a release

- > - **Electron Runtime:** Although Electron Forge requires `electron` to be listed under `devDependencies` for packaging purposes, it forms the core runtime binary of the shipped application and is triaged with the same priority as runtime `dependencies`.

- And this [HARDENING_ELECTRON](./HARDENING_ELECTRON.md)

# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please **do not** open a public GitHub issue.

Instead, report it privately via [GitHub Private Vulnerability Reporting](../../security/advisories/new) _(or replace with your preferred contact email)_. Please include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce the issue or a proof-of-concept.
- Whether the issue affects the packaged release (`.vsix` / Electron binary) or the local development environment.

You can expect an initial acknowledgment within 7 days.

---

## Application Architecture & Attack Surface

This project is designed as a **strictly offline, local-only tool** (distributed as a standalone Electron application and/or VS Code extension):

- **No Remote Content:** The application loads exclusively local, bundled HTML, CSS, JavaScript, and static assets. It never loads remote URLs (`http://` or `https://`) or untrusted third-party web scripts.
- **Zero Network Usage:** The application makes no outbound network requests and operates identically in an air-gapped environment.
- **Local Storage Only:** All data reads and writes are confined to local files and a local SQLite database.

_(For implementation details on how runtime isolation, Content Security Policy, and network blocking are enforced, see the `HARDENING ELECTRON` design document.)_

---

## Vulnerability Management & Triage

Because this project is distributed as a compiled, bundled artifact rather than an unbundled npm library, `npm audit` reports frequently include build-time tools and unreachable code paths that do not affect the shipped product.

Rather than chasing zero `npm audit` warnings through breaking updates, this repository practices **risk-based triage** across two distinct security postures: **End Users** and **Contributors/Developers**.

### 1. End-User Posture (Packaged Releases)

End users install the pre-built release artifact (`.vsix` or executable), which bundles only the required runtime code and strips out development tools.

**Maintainer Commitments:**

- **Dependency Separation:** Runtime dependencies (`dependencies`) and build/test tools (`devDependencies`) are strictly separated.
- **Electron Runtime Priority:** Although Electron Forge requires `electron` to be listed under `devDependencies` for packaging purposes, it forms the core runtime binary of the shipped application and is triaged alongside runtime `dependencies`.
- **Exploitability Triage:** Any CVE reported in bundled runtime code or the Electron runtime is evaluated for actual reachability given the offline, local-only architecture:
  - **Exploitable High/Critical issues:** Patched promptly or mitigated via `overrides`.
  - **Unreachable code paths / remote-only Chromium CVEs:** Documented and monitored for non-breaking upstream updates rather than forcing disruptive major upgrades.

**Recommendations for End Users (Including Enterprise Environments):**

- **Install Official Releases:** Obtain the extension or application exclusively from official release channels rather than building from source on corporate-managed laptops.
- **Scan the Artifact, Not the Source Tree:** Enterprise security teams evaluating this tool should scan the packaged `.vsix` or binary directly (e.g., using Trivy or Grype) rather than running `npm audit` against the source repository.

---

### 2. Developer Posture (Building from Source)

Developers cloning this repository install the full dependency tree (`dependencies` + `devDependencies`) to build, lint, and test the project.

**Maintainer Commitments:**

- **Continuous Monitoring:** GitHub Dependabot alerts are enabled on `package-lock.json` to detect newly disclosed vulnerabilities. Alerts are reviewed and triaged based on whether they affect the shipped runtime bundle or only local development tools.
- **Lockfile Integrity:** A verified `package-lock.json` is committed to ensure deterministic builds and prevent unreviewed upstream version drift.
- **Build-Tool Triage:** Known CVEs in `devDependencies` (such as ReDoS or prototype pollution in linters, bundlers, or test runners) are evaluated for realistic local impact—such as arbitrary code execution when processing local files—and updated during routine maintenance.

**Recommendations for Contributors:**

- **Use `npm ci`:** Always run `npm ci` instead of `npm install` when setting up the repository so you install the exact dependency versions verified in `package-lock.json`.
- **Limit Lifecycle Scripts:** When evaluating or adding new packages, consider using `npm install --ignore-scripts` to prevent untrusted `postinstall` scripts from executing automatically.
- **Isolate Your Development Environment:** Avoid cloning or building open-source repositories on corporate-managed laptops, or develop inside an isolated environment (such as a VS Code Dev Container or dedicated OS user account) to keep personal credentials and SSH keys separated.
