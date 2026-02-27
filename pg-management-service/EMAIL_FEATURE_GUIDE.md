# PG Management - Email Reminder Feature Guide

## ✅ What Has Been Implemented

### Backend Changes (`app/app.py`)
1. **Tenant Due Date Calculation**
   - Every tenant now has a computed `end_date` = `join_date` + `LEASE_LENGTH_DAYS` (configurable, default 30 days)
   - Due date is returned in the `/tenants` API response (JSON field: `"end_date"`)

2. **Email Sending Function** (`send_email_smtp()`)
   - Sends emails via SMTP (Gmail recommended)
   - Uses environment variables: `SMTP_EMAIL`, `SMTP_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`
   - Gracefully fails if SMTP not configured (no app crash)

3. **Reminder Logic** (`due_date_check_once()`)
   - Checks all tenants and compares their end_date with today
   - Sends reminder email when: `days_left == REMINDER_DAYS_BEFORE` (default 7 days)
   - Logs all actions and attempts

4. **Background Worker** (`due_date_reminder_worker()`, `start_due_date_scheduler()`)
   - Runs in a daemon thread, started when Flask app starts
   - Checks periodically (configurable via `REMINDER_INTERVAL_SECONDS`, default 24 hours)
   - Reuses the one-shot reminder logic for consistency

5. **Admin Debug Endpoints**
   - **POST `/admin/send-test-email`** — admin-only; sends a single test email
     - Request: `{"to_email":"recipient@example.com","subject":"...","body":"..."}`
     - Response: `{"to_email":"...","sent":true/false}`
   - **POST `/admin/trigger-reminders`** — admin-only; runs reminder check once and returns results
     - Request: POST (no body needed)
     - Response: `[{"tenant_id":1,"email":"...","sent":true/false,"days_left":0},...]`

### Frontend Changes
1. **Template** (`app/templates/index.html`)
   - Added "Due Date" column to the Tenants table (displays `end_date`)
   - Added two admin-only sidebar buttons: "Send Test Email" and "Trigger Reminders"

2. **JavaScript** (`app/static/js/app.js`)
   - Added `sendTestEmail()` — prompts for recipient and calls `/admin/send-test-email`
   - Added `triggerReminders()` — calls `/admin/trigger-reminders` and shows results
   - Exported both to `window` so HTML onclick handlers work

---

## 🚀 How to Test Email Sending

### Step 1: Set Up Gmail (Recommended)
1. Go to https://myaccount.google.com → Security → App passwords
2. Select "Mail" and "Other (custom name: PG App)"
3. Google will generate a 16-character App Password — copy it

### Step 2: Export Environment Variables (zsh)
Replace `YOUR_EMAIL` and `YOUR_APP_PASSWORD` with real values:

```bash
export SMTP_EMAIL="YOUR_EMAIL@gmail.com"
export SMTP_PASSWORD="YOUR_APP_PASSWORD"   # Google App Password (16 chars)
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"

# Optional: For faster testing (default is 24h)
export REMINDER_INTERVAL_SECONDS="60"      # check every 60 seconds
export REMINDER_DAYS_BEFORE="0"            # trigger when end_date == today
export LEASE_LENGTH_DAYS="0"               # end_date == join_date (for immediate test)
```

### Step 3: Start the Flask App
```bash
cd app
python3 app.py
```

You should see console output:
```
Using database: /path/to/database.db
Due date reminder worker started: checking every 60 seconds
Due date scheduler thread started
 * Running on http://localhost:8000
```

### Step 4: Test via the Web UI
1. Open http://localhost:8000 in your browser
2. Log in as admin (or register a new admin account if needed)
3. In the sidebar (admin area), you'll see:
   - **Send Test Email** — click, enter a recipient email, and it will send a test message
   - **Trigger Reminders** — click to run the reminder check immediately and see results

Expected outcome:
- ✅ An alert appears showing "Test email sent to recipient@example.com"
- ✅ The message appears in the recipient's inbox (or Gmail Spam folder)
- ✅ Server console logs: "Reminder email sent to recipient@example.com"

### Step 5: Test via curl (Command Line)

Login and get a session (you'll need to do this in the browser UI first to establish a session, OR modify the code to support API-only auth):

```bash
# Via browser: Log in to http://localhost:8000, then use the UI buttons

# Or test via direct Python if SMTP is configured but you want to skip Flask:
python3 << 'EOF'
import os, smtplib
from email.message import EmailMessage

SMTP_EMAIL = os.environ.get('SMTP_EMAIL', 'YOUR_EMAIL@gmail.com')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', 'YOUR_APP_PASSWORD')
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))

msg = EmailMessage()
msg['Subject'] = 'Test from PG Management'
msg['From'] = SMTP_EMAIL
msg['To'] = 'recipient@example.com'
msg.set_content('This is a test email from the PG Management app.')

try:
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.starttls()
        s.login(SMTP_EMAIL, SMTP_PASSWORD)
        s.send_message(msg)
    print("✅ Test email sent successfully!")
except Exception as e:
    print(f"❌ Test email failed: {e}")
EOF
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SMTP_EMAIL` | (none) | Gmail address to send from |
| `SMTP_PASSWORD` | (none) | Gmail App Password |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP server port (STARTTLS) |
| `LEASE_LENGTH_DAYS` | `30` | Days from join_date to compute end_date |
| `REMINDER_DAYS_BEFORE` | `7` | Days before end_date to send reminder |
| `REMINDER_INTERVAL_SECONDS` | `86400` | How often background worker checks (24h default) |

### Example: Quick Test Configuration
```bash
export SMTP_EMAIL="your.email@gmail.com"
export SMTP_PASSWORD="your-app-password"
export REMINDER_INTERVAL_SECONDS="30"     # check every 30 seconds
export REMINDER_DAYS_BEFORE="0"           # trigger immediately for end_date == today
export LEASE_LENGTH_DAYS="0"              # set end_date == join_date for sample tenants
```

---

## 📊 What Happens When an Email is Sent

### Success Flow
1. Admin clicks "Send Test Email" or "Trigger Reminders" in the web UI
2. Frontend calls `/admin/send-test-email` or `/admin/trigger-reminders` 
3. Backend calls `send_email_smtp()` with recipient, subject, body
4. SMTP connection opens to smtp.gmail.com:587 (STARTTLS)
5. Login with `SMTP_EMAIL` and `SMTP_PASSWORD`
6. Message is sent
7. Server logs: `"Reminder email sent to recipient@example.com"`
8. Frontend shows: `"Test email sent to recipient@example.com"` (green alert)

### Failure Flow (SMTP not configured)
1. If `SMTP_EMAIL` or `SMTP_PASSWORD` are missing
2. Server logs: `"SMTP not configured (SMTP_EMAIL/SMTP_PASSWORD missing). Skipping email to: ..."`
3. Endpoint returns: `{"to_email":"...","sent":false}`
4. Frontend shows: `"Test email failed to recipient@example.com"` (red alert)
5. **App continues working normally** — no crash

### Gmail Auth Error Flow
1. If app password is incorrect or account has no 2FA
2. Server logs: `"Failed to send email to recipient@example.com: [SMTPAuthenticationError]"`
3. Check Gmail security notification and follow instructions to allow the sign-in
4. Create a new App Password and update the env var

---

## 🧪 Testing Reminders (Not Just Test Emails)

To trigger the actual reminder logic for a tenant:

1. Ensure a sample tenant exists (seeded as "John Doe" with tenant@pg.com)
2. Set environment variables:
   ```bash
   export REMINDER_DAYS_BEFORE="0"      # trigger when end_date == today
   export LEASE_LENGTH_DAYS="0"         # end_date = join_date
   ```
3. Click "Trigger Reminders" in the web UI
4. If the sample tenant has join_date == today, an email will be sent
5. Server logs will show: `"Reminder email sent to tenant@pg.com"`
6. Response will include: `[{"tenant_id":1,"email":"tenant@pg.com","sent":true,"days_left":0}]`

---

## 🐛 Troubleshooting

### "SMTP not configured" message
- **Cause:** `SMTP_EMAIL` or `SMTP_PASSWORD` not set in the shell where Flask runs
- **Fix:** Export the env vars in the same terminal before running `python3 app.py`
  ```bash
  export SMTP_EMAIL="..."
  export SMTP_PASSWORD="..."
  python3 app.py  # in the same terminal
  ```

### "Failed to send email: SMTPAuthenticationError"
- **Cause:** App Password is incorrect or account doesn't have 2FA enabled
- **Fix:** 
  1. Enable 2-Step Verification on your Google account
  2. Create a new App Password
  3. Use the new password in the `SMTP_PASSWORD` env var

### "Failed to send email: SMTPServerDisconnected"
- **Cause:** Network issue or firewall blocking port 587
- **Fix:** Check that outbound SMTP (port 587) is allowed on your network; try `telnet smtp.gmail.com 587`

### Buttons not showing in the UI
- **Cause:** Not logged in as admin, or admin-only class isn't applied
- **Fix:** 
  1. Log in with an admin account (role="ADMIN")
  2. Sidebar will show "Send Test Email" and "Trigger Reminders" buttons
  3. If not visible, check browser console (F12) for errors

### Session cookie not working for API tests
- **Cause:** Flask-Login requires proper session management
- **Fix:** Use the web UI buttons (they handle session automatically) rather than manual curl

---

## 📝 Summary of All Changes

### Files Modified
1. **app/app.py** (615 lines)
   - Added SMTP imports (smtplib, EmailMessage)
   - Added `send_email_smtp()` function
   - Added `due_date_check_once()` function
   - Added `due_date_reminder_worker()` and `start_due_date_scheduler()` functions
   - Added POST `/admin/send-test-email` endpoint
   - Added POST `/admin/trigger-reminders` endpoint
   - Modified `/tenants` GET response to include `"end_date"` for each tenant
   - Started scheduler thread in `__main__`

2. **app/templates/index.html** (427 lines)
   - Added "Due Date" column header in Tenants table
   - Added two admin-only sidebar buttons: "Send Test Email" and "Trigger Reminders"

3. **app/static/js/app.js** (761 lines)
   - Added `sendTestEmail()` function (prompts for recipient, calls `/admin/send-test-email`)
   - Added `triggerReminders()` function (calls `/admin/trigger-reminders`, shows results)
   - Modified `loadTenants()` to display `tenant.end_date` in the table
   - Exported both functions to window

### No Changes To
- Database schema (no migrations needed)
- Existing routes (all routes preserved)
- User authentication flow (same login/register)
- Tenant model (no fields added; end_date is computed on-the-fly)

---

## ✨ Next Steps (Optional Enhancements)

If you want to further extend the feature:

1. **Persistent Logs** — Add a `RemainderLog` model to track all send attempts (useful for auditing)
2. **Custom End Dates** — Allow admins to set custom end_dates per tenant (requires DB schema change)
3. **Email Templates** — Create HTML email templates instead of plain text
4. **Unsubscribe Link** — Add an unsubscribe mechanism for tenants
5. **Slack Integration** — Send notifications to a Slack channel instead of (or in addition to) email

---

## Questions?

Review the code:
- Email logic: `send_email_smtp()` and `due_date_check_once()` in `app/app.py`
- UI buttons: Search for "Send Test Email" and "Trigger Reminders" in `app/templates/index.html` and `app/static/js/app.js`
- Due date calculation: `/tenants` endpoint in `app/app.py`

