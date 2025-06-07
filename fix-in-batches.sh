#!/bin/bash
echo "🧠 Running ESLint fixes in safe-memory batches..."
for dir in app components pages lib public; do
  if [ -d "$dir" ]; then
    echo "🔧 Fixing $dir..."
    NODE_OPTIONS='--max-old-space-size=8192' npx eslint $dir --fix || true
  fi
done
echo "✅ ESLint batch cleanup complete."
