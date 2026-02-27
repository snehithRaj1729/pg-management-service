#!/bin/bash
# Quick test script for PG Management email feature
# Usage: bash test_email_feature.sh

echo "================================"
echo "PG Management - Email Test Setup"
echo "================================"
echo ""

# Check if Flask is running
if ! curl -s http://localhost:8000/api > /dev/null 2>&1; then
    echo "❌ Flask app not running on port 8000"
    echo ""
    echo "Start the app first:"
    echo "  cd app"
    echo "  export SMTP_EMAIL='your-email@gmail.com'"
    echo "  export SMTP_PASSWORD='your-app-password'"
    echo "  python3 app.py"
    echo ""
    exit 1
fi

echo "✅ Flask app is running on http://localhost:8000"
echo ""

# Test the API
echo "Testing API endpoints..."
echo ""

echo "1️⃣  Testing /api endpoint:"
curl -s http://localhost:8000/api | python3 -m json.tool | head -10
echo ""

echo "2️⃣  Testing /rooms endpoint (no auth required):"
curl -s http://localhost:8000/rooms | python3 -m json.tool | head -20
echo ""

echo "3️⃣  Testing /tenants endpoint (requires login):"
echo "   → To view tenants and their due dates, login first at http://localhost:8000"
echo ""

echo "================================"
echo "To test email sending:"
echo "================================"
echo ""
echo "1. Open http://localhost:8000 in your browser"
echo "2. Log in as admin (use an existing admin or register one)"
echo "3. Look in the sidebar for:"
echo "   - 'Send Test Email' button"
echo "   - 'Trigger Reminders' button"
echo "4. Click either button and follow the prompts"
echo ""

echo "✨ Done! The app is ready to test."
echo ""
