#!/usr/bin/env bash

# ============================================================================
# QUICKSTART SETUP SCRIPT
# Universal Base64 Image Solution untuk CMS
# ============================================================================
#
# Gunakan: bash setup.sh
#
# Script ini akan:
# 1. Install multer di backend
# 2. Create uploads directory
# 3. Show next steps
#

set -e

echo "🚀 Universal Base64 Image Solution - Setup"
echo "==========================================="
echo ""

# Step 1: Backend setup
echo "📦 Step 1: Installing backend dependencies..."
cd cms
npm install multer
cd ..
echo "✅ Backend dependencies installed"
echo ""

# Step 2: Create uploads directory
echo "📁 Step 2: Creating uploads directory..."
mkdir -p cms/public/uploads
echo "✅ Uploads directory created at: cms/public/uploads/"
echo ""

# Step 3: Check environment
echo "📝 Step 3: Checking environment..."
if [ ! -f "cms/.env" ]; then
  echo "⚠️  File not found: cms/.env"
  echo "   Create it with:"
  echo "   MONGODB_URI=mongodb://localhost:27017"
  echo "   ADMIN_USERNAME=admin"
  echo "   ADMIN_PASSWORD=your_secure_password"
  echo "   PUBLIC_URL=http://localhost:5000"
else
  echo "✅ Found: cms/.env"
fi
echo ""

# Step 4: Summary
echo "🎉 Setup Complete!"
echo "==========================================="
echo ""
echo "Next steps:"
echo ""
echo "1️⃣  Backend:"
echo "   cd cms && npm start"
echo ""
echo "2️⃣  Frontend (in another terminal):"
echo "   npm run dev"
echo ""
echo "3️⃣  Integration:"
echo "   Open: INTEGRATION_GUIDE.md"
echo "   Follow pattern for each section"
echo ""
echo "4️⃣  Testing:"
echo "   - Go to /admin/writings"
echo "   - Paste/drag image to editor"
echo "   - Verify URL in content (not base64)"
echo ""
echo "📖 Documentation:"
echo "   - IMPLEMENTATION_DOCS.md - Complete API reference"
echo "   - INTEGRATION_GUIDE.md    - Step-by-step examples"
echo ""
echo "🔗 Files Created:"
echo "   ✅ src/utils/media.ts"
echo "   ✅ src/lib/mediaUploader.ts"
echo "   ✅ cms/server/routes/media.js"
echo "   ✅ cms/server/index.js (updated)"
echo "   ✅ cms/package.json (updated)"
echo ""
