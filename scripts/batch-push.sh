#!/usr/bin/env bash
# Run with Git Bash on Windows: bash scripts/batch-push.sh [batch_size]
# Usage: bash scripts/batch-push.sh [batch_size]
# Default batch_size is 3 (CodeRabbit free tier limit).
# Staged files are used if any; otherwise falls back to all modified + untracked files.

set -e

BATCH_SIZE=${1:-3}

# ── Guards ────────────────────────────────────────────────────────────────────

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI is not installed."
  echo "Install it from https://cli.github.com, then run: gh auth login"
  exit 1
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: Not inside a git repository."
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: Not authenticated with GitHub CLI."
  echo "Run: gh auth login"
  exit 1
fi

# ── Collect files ─────────────────────────────────────────────────────────────

mapfile -t STAGED < <(git diff --name-only --cached 2>/dev/null)

if [ ${#STAGED[@]} -gt 0 ]; then
  FILES=("${STAGED[@]}")
  echo "Using ${#FILES[@]} staged file(s)."
else
  mapfile -t MODIFIED < <(git diff --name-only HEAD 2>/dev/null)
  mapfile -t UNTRACKED < <(git ls-files --others --exclude-standard 2>/dev/null)
  FILES=("${MODIFIED[@]}" "${UNTRACKED[@]}")
  echo "Nothing staged — using ${#FILES[@]} modified/untracked file(s)."
fi

if [ ${#FILES[@]} -eq 0 ]; then
  echo "No modified or untracked files found. Nothing to push."
  exit 0
fi

TOTAL=${#FILES[@]}
BATCHES=$(( (TOTAL + BATCH_SIZE - 1) / BATCH_SIZE ))
echo "Found $TOTAL file(s). Splitting into $BATCHES batch(es) of up to $BATCH_SIZE."

# ── State ─────────────────────────────────────────────────────────────────────

ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)

cleanup() {
  echo ""
  echo "Returning to $ORIGINAL_BRANCH..."
  git checkout "$ORIGINAL_BRANCH" 2>/dev/null || true
}
trap cleanup EXIT

SUMMARY=()

# ── Batch loop ────────────────────────────────────────────────────────────────

for (( i=0; i<BATCHES; i++ )); do
  BATCH_NUM=$((i + 1))
  START=$((i * BATCH_SIZE))
  BATCH_FILES=("${FILES[@]:$START:$BATCH_SIZE}")
  COUNT=${#BATCH_FILES[@]}

  # Find a free branch name
  BRANCH_BASE="review/batch-$BATCH_NUM"
  BRANCH_NAME="$BRANCH_BASE"
  SUFFIX=1
  while git show-ref --verify --quiet "refs/heads/$BRANCH_NAME" 2>/dev/null || \
        git ls-remote --exit-code --heads origin "$BRANCH_NAME" >/dev/null 2>&1; do
    SUFFIX=$((SUFFIX + 1))
    BRANCH_NAME="${BRANCH_BASE}-v${SUFFIX}"
  done

  echo ""
  echo "── Batch $BATCH_NUM/$BATCHES → $BRANCH_NAME ($COUNT file(s)) ──"
  for f in "${BATCH_FILES[@]}"; do echo "   $f"; done

  # Create branch from original
  git checkout "$ORIGINAL_BRANCH" -q
  git checkout -b "$BRANCH_NAME" -q

  # Stage only batch files
  git add -- "${BATCH_FILES[@]}"

  # Build commit message
  FILE_LIST=$(printf -- "- %s\n" "${BATCH_FILES[@]}")
  COMMIT_MSG="chore: review batch $BATCH_NUM ($COUNT files)

$FILE_LIST"
  git commit -m "$COMMIT_MSG" -q

  git push -u origin "$BRANCH_NAME" -q

  # Build PR body via temp file (avoids shell escaping issues)
  PR_BODY_FILE="/tmp/pr-body-$$.md"
  cat > "$PR_BODY_FILE" <<PREOF
## What changed

<!-- Describe the purpose of this batch -->

## Files in this batch

$FILE_LIST

## Type of change

- [ ] Bug fix
- [ ] New feature / page
- [ ] Content / copy update (views or data/*.json)
- [ ] Refactor / code quality
- [ ] Config or tooling change
- [ ] Static site rebuild (public/*.html only — skip CodeRabbit)

## Testing done

- [ ] Ran \`npm run dev\` and checked the affected page(s) in a browser
- [ ] Checked the Admin panel for regressions
- [ ] Validated any modified \`data/*.json\` is valid JSON

## CodeRabbit focus hints

<!-- Optional: e.g. "Check for XSS in the new admin route" -->

## Notes for reviewer

<!-- Anything else -->
PREOF

  FIRST_FILE=$(basename "${BATCH_FILES[0]}")
  PR_TITLE="Review batch $BATCH_NUM: $FIRST_FILE$([ $COUNT -gt 1 ] && echo " + $((COUNT-1)) more" || echo "")"

  PR_URL=$(gh pr create \
    --base "$ORIGINAL_BRANCH" \
    --head "$BRANCH_NAME" \
    --title "$PR_TITLE" \
    --body-file "$PR_BODY_FILE" 2>&1) || true

  rm -f "$PR_BODY_FILE"

  SUMMARY+=("Batch $BATCH_NUM | $BRANCH_NAME | $PR_URL")
  echo "PR: $PR_URL"
done

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════"
echo " Done. $BATCHES PR(s) created."
echo "═══════════════════════════════════════════════"
for line in "${SUMMARY[@]}"; do
  echo " $line"
done
echo ""
echo "CodeRabbit will review each PR independently."
echo "Merge each PR after review, then run this script again for the next batch."
