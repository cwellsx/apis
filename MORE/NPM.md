# npm security warnings

How to review and fix the security warnings npm reports for this repository, and how to stop new
ones accumulating.

Two sources report them — the npm CLI and GitHub — and both draw on the same data, the GitHub
Advisory Database, so they agree with each other. GitHub is the better place to _review_ an
advisory: one page each, with a dismissal reason. The CLI is the better place to _fix_ one, because
the dependency tree lives there.

## Ground rules

- **All npm commands run at the repository root**, never inside a package. The packages are npm
  workspaces with a single lockfile, so `audit`, `outdated` and `install` operate on the whole tree
  at once.
- **One step, one commit.** Every step below is then reversible with `git revert`, which is the
  only safety net that matters.
- **Check the npm version first.** The lockfile records the npm major that wrote it
  (`lockfileVersion` 3 means npm 7 or later). A different npm rewrites the lockfile wholesale, which
  buries the real changes in churn.
- **Verify after any step that changes dependencies** — type-check, both test suites, and a start:

  ```
  npm run type-check -w apis
  npm test -w backend-test
  npm test -w electron-app-test
  npm start -w apis
  ```

## Step 1 — list the advisories

Read-only, changes nothing:

```
npm audit --json | ConvertFrom-Json | ForEach-Object { $_.vulnerabilities.PSObject.Properties.Value } | Format-Table name, severity, isDirect, range -AutoSize
```

One row per advisory: name, severity, whether it is a direct dependency, and the affected range.
Counts by severity come from:

```
npm audit --json | ConvertFrom-Json | ForEach-Object { $_.metadata.vulnerabilities | Format-List }
```

Triage the rows by asking, in this order:

1. **Does it ship?** A package that never reaches the packaged application is not a user-facing
   risk, however high its severity. See the repository constraints below for the trap in this tree.
2. **Is the vulnerable code reachable?** A parser used only at build time is not exercised by the
   application.
3. **Is there a fix?** The `fixed in` field of the advisory, or the `range` that is unaffected.
4. **Direct or transitive?** A direct dependency is bumped; a transitive one may need an override.

## Step 2 — the semver-safe fix

```
npm audit fix --dry-run
npm audit fix
```

`--dry-run` prints what would change without changing it. This command respects semver, so it
cannot move a major version — which is why it is safe against the deliberately down-level tooling in
this repository. Electron Forge, Electron and webpack cannot move as a result of it.

Expect the lockfile to change; check `git diff --stat package-lock.json` and skim the `package.json`
diff before committing. Then verify, re-run Step 1's counts, and commit.

To undo before committing: `git checkout -- package.json package-lock.json`.

## Step 3 — direct dependencies that are behind

```
npm outdated
```

The columns are current, wanted and latest. Bump only the security-relevant ones, **one per
commit**, verifying after each. Do not batch majors together: when one of them breaks the build, the
commit that caused it has to be identifiable.

Electron is the one to schedule separately — see the repository constraints below.

## Step 4 — overrides for transitive holes

When a direct dependency is current but still pulls a vulnerable transitive, pin the transitive in
the **root** `package.json`:

```json
"overrides": {
  "some-package": "^1.2.3"
}
```

Then `npm install` — overrides only take effect on install — and `npm audit` to confirm the advisory
has gone.

Record the reason in the commit message: which advisory, and which package depends on the vulnerable
version. `package.json` cannot carry a comment, so the commit is the only place the reasoning can
live.

## Step 5 — Dependabot

Two parts, one a file and one a repository setting.

The file is `.github/dependabot.yml`, which currently covers only the `bundler` ecosystem for the
documentation site. An npm entry belongs beside it, **grouped** — without groups, sixty advisories
become sixty pull requests:

```yaml
- package-ecosystem: npm
  directory: /
  schedule:
    interval: weekly
  groups:
    production:
      dependency-type: production
    development:
      dependency-type: development
  open-pull-requests-limit: 5
```

Note that the existing bundler entry restricts itself to `allow: dependency-type: direct`. Most npm
advisories are transitive, so that restriction should not be copied here.

The setting is in the repository on GitHub: **Settings → Code security and analysis**. Enable
**Dependabot alerts** and **Dependabot security updates**. The second is what acts on advisories
between scheduled runs, and being a setting rather than a file, it cannot be committed.

## Step 6 — a gate for new advisories

Add `dependency-review-action` on `pull_request`. It fails a pull request that _introduces_ a
vulnerable dependency, which is the right scope: it stops new ones without requiring the backlog to
be empty first.

Do not gate CI on `npm audit` itself until the backlog is small. With many existing findings it is
red from its first run, which makes it noise rather than a signal.

## Recording decisions

For each advisory, or group of them, record whether it ships, what was done, and the reason for
anything accepted as a risk. This is what stops the same list being re-triaged later, and it is the
same habit as the architecture notes — the reasoning belongs in the repository, not in a
conversation.

## Repository constraints

- **Electron is a `devDependency` and is also the product.** `npm audit --omit=dev` therefore
  understates the risk, because it omits the runtime the application ships. Triage by whether a
  package ends up in the packaged application, not by how it is listed in `package.json`.
- **`better-sqlite3` is a native module** (through `sqlio`) and must be rebuilt to match Electron's
  ABI. `electron-app` and `vscode-ext` must use the same Electron version. An Electron upgrade is
  therefore a coordinated change across packages, not an audit fix.
- **Electron Forge is deliberately down-level.** The semver-safe fix cannot move it; a major upgrade
  is a deliberate step of its own, with a run of the application afterwards.
- **Never run `npm audit fix --force`** without reading what it intends to do. It takes major
  versions on the caller's behalf, which is the usual way a build breaks while appearing to have
  been repaired.
