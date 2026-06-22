#!/usr/bin/env bash
set -euo pipefail

BRANCH="${PAGES_BRANCH:-gh-pages}"
BUILD_DIR="docs/.vitepress/dist"
REMOTE="${PAGES_REMOTE:-origin}"

rm -rf "$BUILD_DIR"
pnpm build

if [[ ! -d "$BUILD_DIR" ]]; then
  echo "Build output not found: $BUILD_DIR" >&2
  exit 1
fi

TMP_ROOT="$(mktemp -d)"
WORKTREE="$TMP_ROOT/worktree"
TEMP_BRANCH="deploy-gh-pages-$(date +%Y%m%d%H%M%S)-$$"

cleanup() {
  git worktree remove --force "$WORKTREE" >/dev/null 2>&1 || true
  git branch -D "$TEMP_BRANCH" >/dev/null 2>&1 || true
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

if git ls-remote --exit-code --heads "$REMOTE" "$BRANCH" >/dev/null 2>&1; then
  git fetch "$REMOTE" "$BRANCH"
  git worktree add --detach "$WORKTREE" FETCH_HEAD
else
  git worktree add --orphan -b "$TEMP_BRANCH" "$WORKTREE"
fi

find "$WORKTREE" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$BUILD_DIR"/. "$WORKTREE"/
touch "$WORKTREE/.nojekyll"

git -C "$WORKTREE" add --all

if git -C "$WORKTREE" diff --cached --quiet; then
  echo "No changes to deploy."
  exit 0
fi

git -C "$WORKTREE" commit -m "deploy: update GitHub Pages"
git -C "$WORKTREE" push "$REMOTE" HEAD:"$BRANCH"
