#!/usr/bin/env bash
# bump-css.sh — bump the ?v= cache-buster on shared assets across every HTML page.
#
# Learners' browsers cache assets by URL, so a CSS/JS change only reaches them
# if the URL changes. This rewrites the ?v= query on every including page in one
# shot (replacing whatever version is already there, or adding one if missing).
#
# Usage:
#   ./bump-css.sh                 # bump style.css to today's date (YYYYMMDD)
#   ./bump-css.sh 20260703        # bump style.css to an explicit version
#   ./bump-css.sh --all           # also bump quiz.js / day-summary.js / progress.js
#   ./bump-css.sh --all 20260703-2  # explicit version, all assets (suffix ok for same-day)
set -euo pipefail
cd "$(dirname "$0")"

ASSETS=(style.css)
VERSION=""
for arg in "$@"; do
  case "$arg" in
    --all) ASSETS=(style.css quiz.js day-summary.js progress.js) ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) VERSION="$arg" ;;
  esac
done
[ -z "$VERSION" ] && VERSION="$(date +%Y%m%d)"

for asset in "${ASSETS[@]}"; do
  name="${asset%.*}"; ext="${asset##*.}"   # e.g. style / css
  count=0
  # -l: only names of files that reference the asset. Filenames here have no
  # spaces/newlines, so plain newline-delimited iteration is safe.
  while IFS= read -r f; do
    # Anchor on the assets/ path prefix so bare mentions of the filename in
    # comments/strings (e.g. "via progress.js") are never rewritten — only the
    # real src=/href= references under assets/ get a version.
    perl -0777 -pi -e "s{(assets/[\\w./-]*${name}\\.${ext})(\\?v=[^\"']*)?}{\$1?v=${VERSION}}g" "$f"
    count=$((count + 1))
  done < <(grep -rl "${name}\.${ext}" --include='*.html' .)
  echo "  ${asset}  →  ?v=${VERSION}   (${count} pages)"
done

echo "Done. Review with:  git diff --stat   then commit + push."
