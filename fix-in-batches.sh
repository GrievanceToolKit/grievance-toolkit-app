#!/bin/bash
echo "🔧 Starting targeted ESLint cleanup with 8GB memory..."

FOLDERS=("app" "components" "lib" "pages" "src")

for folder in "${FOLDERS[@]}"; do
  echo "🔍 Fixing unused variables in $folder"
  NODE_OPTIONS="--max-old-space-size=8192" npx eslint "$folder" --rule "@typescript-eslint/no-unused-vars: error" --fix

  echo "🔧 Fixing 'any' types in $folder"
  NODE_OPTIONS="--max-old-space-size=8192" npx eslint "$folder" --rule "@typescript-eslint/no-explicit-any: error" --fix

  echo "🧹 Cleaning empty interfaces in $folder"
  NODE_OPTIONS="--max-old-space-size=8192" npx eslint "$folder" --rule "@typescript-eslint/no-empty-interface: error" --fix
done

echo "✅ Batch ESLint cleanup complete."
