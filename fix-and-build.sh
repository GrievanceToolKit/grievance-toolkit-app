#!/bin/bash

echo "🔧 Cleaning up corrupted build and resetting environment..."

# 1. Remove stale and conflicting files
rm -rf .next node_modules package-lock.json yarn.lock pnpm-lock.yaml

# 2. Remove problematic route and error pages
rm -rf app/[id] app/_error.tsx app/404.tsx pages/

# 3. Make sure there's only one next.config
echo "🧠 Checking for multiple next.config files..."
CONFIG_COUNT=$(find . -name "next.config.*" | wc -l)
if [ "$CONFIG_COUNT" -gt 1 ]; then
  echo "⚠️ Multiple next.config files detected. Please keep only one."
  find . -name "next.config.*"
  exit 1
fi

# 4. Reinstall clean dependencies
echo "📦 Installing clean dependencies..."
npm install

# 5. Verify versions of React and Next.js
echo "🔍 Verifying version alignment..."
REACT_VERSION=$(npm list react | grep react@ | awk -F@ '{print $2}')
REACT_DOM_VERSION=$(npm list react-dom | grep react-dom@ | awk -F@ '{print $2}')
NEXT_VERSION=$(npm list next | grep next@ | awk -F@ '{print $2}')

echo "✅ React: $REACT_VERSION"
echo "✅ ReactDOM: $REACT_DOM_VERSION"
echo "✅ Next.js: $NEXT_VERSION"

if [[ "$REACT_VERSION" != "$REACT_DOM_VERSION" ]]; then
  echo "❌ React and ReactDOM versions mismatch!"
  exit 1
fi

# 6. TypeScript check
echo "🔍 Running TypeScript check..."
npx tsc --noEmit

if [ $? -ne 0 ]; then
  echo "❌ TypeScript check failed."
  exit 1
fi

# 7. Build
echo "🏗 Running Next.js production build..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed."
  exit 1
fi

echo "✅ Build completed successfully. You can now push to Vercel with:"
echo ""
echo "   vercel --prod"
