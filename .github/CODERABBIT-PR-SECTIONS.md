# CodeRabbit: split PR plan (≤120 files per review)

Counts are for **this repository** with **`node_modules/` not included** (never commit it). **`.git/`** and **`.cursor/`** are also excluded from these sections—they should not be part of review payloads.

| Section | Scope | File count (current tree) |
|--------|--------|----------------|
| **PR A — Core** | Server, libraries, CMS JSON, scripts, tests, root metadata, `.github/` docs | **40** |
| **PR B — Site surface** | All EJS templates + everything under `public/` (CSS, JS, prerendered HTML, images, uploads) | **115** |

**Total ~155** project files (excluding `node_modules/`, `.git/`, `.cursor/`). Both sections stay **under the 120-file cap**. If the tree grows, split **PR B** further (see below).

---

## PR A — Core application & content data

**Purpose:** Express app, flat-file CMS `data/`, build/prerender scripts, shared libs, automated tests.

**Paths to include:**

```text
.github/
.gitignore
README.md
package.json
package-lock.json
server.js
data/
lib/
scripts/
tests/
```

**One-shot `git add` (from repo root):**

```bash
git add .github .gitignore README.md package.json package-lock.json server.js data lib scripts tests
```

---

## PR B — Views & public build

**Purpose:** Templates, styles, client JS, prerendered static mirror, bundled media (team photos, logos).

**Paths to include:**

```text
views/
public/
```

**One-shot `git add`:**

```bash
git add views public
```

---

## Suggested GitHub workflow

1. From `main`, create **`cr/core`** (or similar), add only **PR A** paths, commit, open **PR #1**.
2. From `main`, create **`cr/site-surface`**, add only **PR B** paths, commit, open **PR #2**.
3. If **PR B** later exceeds 120 files, split it, for example:
   - **PR B1:** `views/` + `public/css/` + `public/js/` + `public/images/` + `public/llms.txt` + `public/sw.js`
   - **PR B2:** `public/**/index.html` (prerender output) — can use `git add public/about public/community ...` or regenerate after merge
   - **PR B3:** `public/uploads/` (binary uploads)

Regenerate exact counts anytime (PowerShell, repo root):

```powershell
$exclude = '[\\/]\.git[\\/]|[\\/]\.cursor[\\/]|[\\/]node_modules[\\/]'
(Get-ChildItem -Recurse -File -Force | Where-Object { $_.FullName -notmatch $exclude }).Count
```

---

## CodeRabbit note

CodeRabbit reviews **the diff in each PR**; keeping each PR under ~120 **changed** files avoids oversized reviews. If a PR only touches a subset of paths above, you still stay within limits. For **very large binary-only** changes under `public/uploads/`, consider a separate PR so CodeRabbit can focus on code in the other.
