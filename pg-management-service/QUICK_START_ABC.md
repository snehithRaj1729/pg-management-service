# Quick Start: Implementing Features A, B, C

This guide gets you up and running with all three enhancements in under 10 minutes.

## Prerequisites

- Flask app is already running or can be started
- Database file exists at `app/database.db`
- SMTP email credentials (optional, but recommended for testing)

## Step-by-Step Setup

### Step 1: Migrate Database Schema (2 minutes)

**Why:** Add new database columns for tenant personal info and payment due dates.

```bash
cd /path/to/pg-management-service/app

# Run the migration script
python3 migrate_schema.py
```

**Expected output:**
```
✅ All migrations completed successfully!
```

If you see column already exists messages, that's fine — it means columns were added previously.

### Step 2: Set Up Email (Optional but Recommended) (3 minutes)

**Why:** Enable digest emails and payment reminders.

**For Gmail:**

1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Copy the 16-character password

**Set environment variables:**

```bash
# On macOS/Linux (in the same terminal where you'll run Flask)
export SMTP_EMAIL="your.email@gmail.com"
export SMTP_PASSWORD="your-16-char-app-password"
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"

# Optional: For faster testing, reduce check intervals
export REMINDER_INTERVAL_SECONDS="60"        # Check every 1 minute instead of 24 hours
export REMINDER_UPCOMING_DAYS="30"           # Show payments/tenants up to 30 days ahead
```

**Verify setup:**
```bash
# Check variables are set
echo $SMTP_EMAIL
# Should print your email
```

### Step 3: Start Flask App (1 minute)

```bash
cd /path/to/pg-management-service/app
python3 app.py
```

**Expected:**
```
* Running on http://localhost:8000
* Due date scheduler thread started
```

### Step 4: Test Feature A - Admin Payment Panel (2 minutes)

1. Open browser: http://localhost:8000
2. Login as admin (default: admin@pg.com / admin123)
3. Click Dashboard in sidebar
4. Scroll down to "Pending Payments Summary" card
5. You should see:
   - "Due today: 0" (or some number if payments exist)
   - "Due soon (next 30 days): 0" (or some number)

**If no card appears:**
- Make sure you're logged in as an admin
- Open browser console (F12 → Console)
- Check for JavaScript errors

### Step 5: Test Feature B - Daily Digest Email (2 minutes)

**Step A: Create test data**

```bash
# First, create a tenant and payment if you don't have one
# Use the web UI: Register as tenant → Create payment with today's date

# Or use curl:
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c /tmp/admin_cookies.txt \
  -d '{"email":"admin@pg.com","password":"admin123"}'

# Send digest email
curl -X POST http://localhost:8000/admin/send-digest-email \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt
```

**Step B: Check response**

```json
{
  "message": "Digest email sent",
  "total_admins": 1,
  "sent": 1,
  "date": "2026-02-28"
}
```

- If `sent: 1` and SMTP is configured, check your email inbox
- If `sent: 0` and SMTP is configured, check Flask logs for errors
- If SMTP not configured, you'll see console log: "SMTP not configured"

**Expected email:**
```
============================================================
PG MANAGEMENT - DAILY DIGEST
Date: 2026-02-28
============================================================

TENANT STATUS SUMMARY
...tenants leaving today/soon...

PAYMENT STATUS SUMMARY
...payments due today/soon...
```

### Step 6: Test Feature C - Payment Due Dates (1 minute)

**Create a payment with a due date:**

```bash
# Login as admin (cookies saved above)

# Create a payment with due_date = today
TODAY=$(python3 -c "from datetime import date; print(date.today().isoformat())")

curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt \
  -d "{
    \"tenant_id\": 1,
    \"month\": \"March 2026\",
    \"amount\": 5000,
    \"paid\": false,
    \"due_date\": \"$TODAY\"
  }"
```

**Verify:**
- Check admin dashboard → "Pending Payments Summary"
- Should show "Due today: 1"
- Refresh the page — number should stay the same

## Troubleshooting

### "No Pending Payments Summary card appears"

**Solution:**
1. Log out and log back in
2. Press F5 to hard-refresh browser cache
3. Check browser console for JavaScript errors
4. Verify `currentUser.role === 'ADMIN'` in console:
   ```javascript
   // In browser console (F12)
   JSON.parse(localStorage.getItem('currentUser'))
   ```

### "Email not received"

**Check:**
1. Is SMTP configured? Run: `echo $SMTP_EMAIL`
2. Did the endpoint return `"sent": 1`?
3. Check Flask logs for errors
4. Check Gmail spam folder
5. Try the test email first:
   ```bash
   curl -X POST http://localhost:8000/admin/send-test-email \
     -H "Content-Type: application/json" \
     -b /tmp/admin_cookies.txt \
     -d '{"to_email":"your.email@gmail.com","subject":"Test","body":"Test body"}'
   ```

### "Migration script fails"

**Check:**
1. Database file exists: `ls -la app/database.db`
2. Run from correct directory: `cd app` first
3. Verify permissions: `chmod 644 database.db`
4. Try again: `python3 migrate_schema.py`

### "Flask won't start"

**Check:**
1. Port 8000 is free: `lsof -i :8000`
2. If not, kill process: `kill -9 <PID>`
3. Or use different port: `FLASK_PORT=8001 python3 app.py`

## What Each Feature Does

| Feature | What | Where | Test |
|---------|------|-------|------|
| **A** | Dashboard payment widget | Admin dashboard | Scroll down, see card |
| **B** | Daily digest email | Email inbox | POST /admin/send-digest-email |
| **C** | Schema migration | Database columns | python3 migrate_schema.py |

## Next Steps

After setup completes:

1. **Explore the UI:**
   - Admin dashboard shows payment summaries
   - Click on payment IDs to view details
   - Request QR codes for payments

2. **Automate digest emails (optional):**
   - Add cron job to send daily: `0 8 * * * curl -X POST http://localhost:8000/admin/send-digest-email ...`
   - Or use APScheduler for automatic daily sends

3. **Configure for production:**
   - Set environment variables in `.env` file
   - Use proper SMTP credentials
   - Store credentials securely

## Quick Command Reference

```bash
# Migrate database
python3 app/migrate_schema.py

# Set SMTP for Gmail
export SMTP_EMAIL="your.email@gmail.com"
export SMTP_PASSWORD="your-app-password"

# Start Flask
cd app && python3 app.py

# Test payment summary endpoint
curl http://localhost:8000/admin/payment-summary \
  -b /tmp/admin_cookies.txt

# Send digest email
curl -X POST http://localhost:8000/admin/send-digest-email \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt

# Create payment with due date
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt \
  -d '{"tenant_id":1,"month":"March","amount":5000,"due_date":"2026-03-01"}'
```

## Support

See `FEATURES_GUIDE.md` for detailed documentation on each feature.

---

**Done!** All three features are now active. Explore the dashboard and test email functionality.
