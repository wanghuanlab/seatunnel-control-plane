#!/usr/bin/env sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"

if [ ! -d node_modules ]; then
  npm run setup
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

npm run dev
