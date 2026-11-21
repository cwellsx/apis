# Audit

The findings at the time of writing are in [`SECURITY-AUDIT.md`](../../SECURITY-AUDIT.md), which is updated as they change.

The policy below is what to do about whatever it says.

## Context

With .NET NuGet packages, when a vulnerability is reported, it is normal to update to a corrected version of the package --
you may aim for, "always fix everything immediately".

This is less possible and so is not expected, with npm packages.

- The npm dependency tree is deep
- There are many authors, updates may be released more slowly, sometimes never

The strategy is more nuanced -- instead of:

- > No vulnerabilities

... the objective is:

- > Every vulnerability has been evaluated.

That sounds weaker but is more practical.

Evaluating a vulnerability includes:

- Does the vulnerability affect what's shipped: the product? Or only the build tools?
- Does the vulnerability affect a feature or code path, that we actually exercise at run-time?

For example a package might have a vulnerability in its network layer,
whereas we don't use its network layer.

So a policy might be:

```
Critical vulnerabilities:
   Must be fixed.

Runtime vulnerabilities:
   Must be fixed or accepted explicitly.

Development-only vulnerabilities:
   Assessed and documented.

Unfixable upstream vulnerabilities:
   Tracked until upstream resolves them.
```

## npm commands

### List vulnerabilities

View npm's audit:

```
npm audit
```

Formatted audit output:

```
npm audit --json | ConvertFrom-Json | ForEach-Object { $_.vulnerabilities.PSObject.Properties.Value } | Format-Table name, severity, isDirect, range -AutoSize
```

### Safe fix

This updates vulnerable packages to a later version where that's safe

```
npm audit fix
```

- "Safe" means an update without changing the major version number
- Calling `npm audit fix --force` might easily cause breakage

### Blame

This explains why a given package is in the dependency tree, i.e. what depends on it:

```
npm explain <package-name>
```

### Understand the vulnerability

The npm audit command explains each vulnerability with a summary and a hyperlink. For example, from a past
audit -- not a current finding:

```
extract-zip  *
Severity: high
extract-zip unvalidated symlink path traversal - https://github.com/advisories/GHSA-jmr9-qjv8-65gv
extract-zip allows arbitrary file writes through symlink archive entries - https://github.com/advisories/GHSA-7pqw-9j4j-h8q3
fix available via `npm audit fix --force`
Will install electron@45.4.1, which is a breaking change
node_modules/extract-zip
```

This is only seen in the full `npm audit`, there is no command option to show the vulnerabilities for a specific package.

### Reset dependencies

Using `npm install <package>` to install or updated one package makes a minimal change to the lock file.

Using `npm install` when a repository is cloned does not edit the lock file.

After updating a package you might want to delete the lock file and recreate it using `npm install` again.

Recreating a fresh lock file may lose updates chosen by a previous `npm audit fix` --
so run `npm audit fix` again after recreating the lock file.

### Clean install

Using `npm ci` after a clone:

- Verifies the package.json and lock file are in sync
- Deletes and recreate the node_modules folder

This command is intended for build machines.

## Documenting investigation

Instead of fixing a vulnerability you might investigate and decide it doesn't apply for some reason.

### Option 1: Security exceptions document

A file such as `docs/security-exceptions.md` or `docs/dependencies.md` containing entries like:

```md
# Security Exceptions

## uuid < 11.1.1 via webpack-dev-server

Date reviewed: 2026-11-18

Dependency path:

electron-forge
└─ webpack-dev-server
   └─ sockjs
      └─ uuid

Assessment:

- Development-only dependency.
- Not included in packaged Electron application.
- npm audit recommends a breaking upgrade path.
- Awaiting upstream Electron Forge dependency update.

Decision:

Accepted temporarily.

Review trigger:

- Next Electron Forge upgrade.
- New CVE affecting runtime code.
```

### Option 2: GitHub issue

Create an issue:

> Security: uuid vulnerability via webpack-dev-server

and document:

- dependency path
- CVE/advisory
- impact assessment
- planned resolution

Then either leave it open,
or close it with a comment explaining the acceptance decision.

Many teams use issues as their risk register.

### Option 3: Dependabot/GitHub Security advisory dismissal

If GitHub Security Alerts is flagging it, GitHub lets you dismiss alerts with reasons such as:

- false positive
- acceptable risk
- vulnerable code not used

The dismissal itself becomes part of the repository's audit trail.
