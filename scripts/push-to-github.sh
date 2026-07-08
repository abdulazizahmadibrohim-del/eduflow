#!/bin/bash
set -e

REPO_URL="https://abdulazizahmadibrohim-del:${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/abdulazizahmadibrohim-del/eduflow.git"

echo "1) Fetching remote..."
git fetch "$REPO_URL" main

echo "2) Merging (keeping our local files on conflict)..."
git merge --allow-unrelated-histories -X ours -m "Merge remote workflow file" FETCH_HEAD

echo "3) Pushing to GitHub..."
git push "$REPO_URL" main

echo "DONE - code pushed to GitHub"
