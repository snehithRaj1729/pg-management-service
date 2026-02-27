# PG Management System - Enhanced Features Guide

## Overview

This document describes three major enhancements added to the PG Management System:

1. **[A] Admin Dashboard Payment Panel** – Visual summary of pending payments
2. **[B] Daily Digest Email** – Comprehensive daily summary for admins
3. **[C] Schema Migration Helper** – Safe database schema updates without data loss

---

## A) Admin Dashboard Payment Panel

### What It Is

An admin-visible widget on the dashboard showing:
- **Payments due today**: Count of unpaid payments due today
- **Payments due soon**: Count due within the next 30 days (configurable)
- **Breakdown by date**: List of upcoming payment dates and counts

### How It Works

**Backend:**
- Endpoint: `GET /admin/payment-summary`
- Returns JSON with counts and upcoming dates
- Only accessible to admins (role-based access control)
- Queries unpaid payments with `due_date` set
- Respects `REMINDER_UPCOMING_DAYS` environment variable (default: 30)

**Frontend:**
- Automatically fetches summary when admin views dashboard
- Displays in a card titled "Pending Payments Summary"
- Updates each time dashboard is reloaded
- Shows scrollable list of dates and payment counts

### UI Location

Dashboard → Pending Payments Summary card (below vacating tenants summary)

### Example Response

```json
{
  "due_today": 2,
  "total_upcoming": 5,
  "upcoming": [
    {"date": "2026-03-01", "count": 2},
    {"date": "2026-03-05", "count": 3}
  ]
}
```

### Testing

```bash
# Admin login
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c /tmp/admin_cookies.txt \
  -d '{"email":"admin@pg.com","password":"admin123"}'

# Fetch payment summary
curl -X GET http://localhost:8000/admin/payment-summary \
  -b /tmp/admin_cookies.txt
```

---

## B) Daily Digest Email

### What It Is

A comprehensive email sent to all admins containing:
- **Tenant Summary**: How many leaving today/soon, with names and dates
- **Payment Summary**: How many payments due today/soon, with details (tenant name, amount, date)
- **Formatted report**: Professional plain-text format

### How It Works

**Backend:**
- Endpoint: `POST /admin/send-digest-email`
- Admin-only endpoint (role-based access control)
- Gathers current tenant and payment status
- Sends formatted email to all admin email addresses
- Returns JSON with send status

**Email Content Structure:**
```
============================================================
PG MANAGEMENT - DAILY DIGEST
Date: 2026-02-28
============================================================

TENANT STATUS SUMMARY
------------------------------------------------------------
Tenants leaving today: 0
Tenants leaving soon (next 30 days): 2

Upcoming departures:
  - Alice (on 2026-03-02, in 2 day(s))
  - Bob (on 2026-03-05, in 5 day(s))

PAYMENT STATUS SUMMARY
------------------------------------------------------------
Payments due today: 1
Payments due soon (next 30 days): 3

Upcoming payments:
  - Alice (₹7000 on 2026-03-01, in 1 day(s))
  - Bob (₹6000 on 2026-03-03, in 3 day(s))
  - Carol (₹5000 on 2026-03-10, in 10 day(s))

============================================================
End of Daily Digest
============================================================
```

### Requirements

SMTP must be configured for email to be sent:
```bash
export SMTP_EMAIL="your.email@gmail.com"
export SMTP_PASSWORD="your-app-password"   # Use Google App Password with 2FA
export SMTP_HOST="smtp.gmail.com"          # Default
export SMTP_PORT="587"                     # Default (STARTTLS)
```

Without SMTP, the endpoint will still work but will return `sent: 0`.

### API Endpoint

**POST /admin/send-digest-email**

Request:
```bash
curl -X POST http://localhost:8000/admin/send-digest-email \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt
```

Response:
```json
{
  "message": "Digest email sent",
  "total_admins": 2,
  "sent": 2,
  "date": "2026-02-28"
}
```

### Automation (Future Enhancement)

To send this digest automatically every day:

**Option 1: Cron Job**
```bash
# Add to crontab (runs daily at 08:00 AM)
0 8 * * * curl -X POST http://localhost:8000/admin/send-digest-email \
  -H "Content-Type: application/json" \
  -b /path/to/admin_cookies.txt
```

**Option 2: APScheduler Integration** (not implemented)
Add to Flask app to schedule the digest email automatically.

### Testing

```bash
# Setup: Configure SMTP env vars first
export SMTP_EMAIL="your.email@gmail.com"
export SMTP_PASSWORD="your-app-password"

# Then login as admin
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c /tmp/admin_cookies.txt \
  -d '{"email":"admin@pg.com","password":"admin123"}'

# Send digest
curl -X POST http://localhost:8000/admin/send-digest-email \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt
```

---

## C) Schema Migration Helper

### What It Is

A Python script (`migrate_schema.py`) that safely adds new database columns to an existing SQLite database without losing any data.

### New Columns Added

1. **tenants.address** (VARCHAR(300), nullable)
   - Tenant's physical address
   - Admin-visible in tenant list
   - Used for tenant personal info storage

2. **tenants.id_info** (VARCHAR(300), nullable)
   - Tenant's ID information (e.g., "Passport: ABC123")
   - Admin-visible in tenant list
   - Used for security/admin records

3. **payments.due_date** (DATE, nullable)
   - Payment due date
   - Used to calculate payment reminders
   - Optional per payment

### Why This Script?

SQLAlchemy's `create_all()` only creates missing tables, not missing columns on existing tables.

**Two approaches:**

**Approach 1: Easy (Dev/Testing Only) – Delete & Recreate**
```bash
rm app/database.db
cd app
python3 app.py  # Creates fresh DB with all columns
```
⚠️ **WARNING**: Loses all existing data!

**Approach 2: Safe (Production) – Use Migration Script**
```bash
cd app
python3 migrate_schema.py
# Adds only missing columns
# Preserves all existing data
```

### How To Use

1. **Prepare:**
   - Ensure your Flask app is not running
   - Ensure `database.db` exists in the `app/` folder
   - If you don't have a database, run the Flask app once to create it

2. **Run the migration:**
   ```bash
   cd /path/to/app
   python3 migrate_schema.py
   ```

3. **Review output:**
   ```
   [1/3] tenants.address
     Description: Tenant address (for admin view)
     ✅ Success: Column added successfully

   [2/3] tenants.id_info
     Description: Tenant ID information (for admin view)
     ✅ Success: Column added successfully

   [3/3] payments.due_date
     Description: Payment due date
     ✅ Success: Column added successfully

   Migration Summary
   Total migrations: 3
   Successful: 3
   Skipped: 0
   Failed: 0

   ✅ All migrations completed successfully!
   ```

4. **Restart Flask app:**
   ```bash
   python3 app.py
   ```

### What The Script Does

- ✅ Checks if database file exists
- ✅ For each column, checks if it already exists
- ✅ Skips columns that already exist (safe to run multiple times)
- ✅ Adds missing columns with correct definitions
- ✅ Reports all results clearly
- ✅ **Does NOT modify or delete any existing data**

### Safety Features

- **Idempotent**: Safe to run multiple times
- **Non-destructive**: Only adds columns, never removes or modifies data
- **Error handling**: Reports errors clearly without stopping midway
- **Backup recommended**: Still recommended to backup DB before running

### Troubleshooting

**"Database file not found"**
- Run Flask app first: `python3 app.py`
- This creates `database.db`

**"Column already exists"**
- Script will skip and continue
- This is normal if columns were already added

**"Permission denied"**
- Check file permissions: `ls -l database.db`
- May need to run as owner user

**Other errors**
- Check database integrity with: `sqlite3 database.db ".tables"`
- Backup and try again
- Contact support if issues persist

---

## Integration Summary

### How These Features Work Together

1. **Admin creates a payment with `due_date`** (via API or admin panel)
   - Uses POST /payments endpoint
   - Includes `due_date` in YYYY-MM-DD format

2. **Payment Summary updates on dashboard**
   - Displays pending payments due today/soon
   - Updated each time dashboard is viewed (via /admin/payment-summary)

3. **Digest email can be sent manually or automatically**
   - Contains payment + tenant summaries
   - Sent via /admin/send-digest-email endpoint
   - Can be scheduled with cron or APScheduler

4. **Background worker also monitors payments**
   - Sends individual payment reminders when due_date hits
   - Emails admins if any payments are due or upcoming

5. **Database schema supports all new fields**
   - Run migrate_schema.py once to add columns
   - Or delete DB and recreate if in development

### Environment Variables

Configure these to enable email functionality:

```bash
export SMTP_EMAIL="your.email@gmail.com"
export SMTP_PASSWORD="your-app-password"
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"

# Optional: Adjust reminder windows
export REMINDER_UPCOMING_DAYS="30"      # Default: 30 days
export REMINDER_DAYS_BEFORE="7"         # Default: 7 days
export REMINDER_INTERVAL_SECONDS="86400" # Default: 24 hours (86400 seconds)
export LEASE_LENGTH_DAYS="30"           # Default: 30 days
```

---

## Testing Checklist

### Feature A: Admin Payment Panel

- [ ] Admin logs in and views dashboard
- [ ] "Pending Payments Summary" card is visible
- [ ] Counts show correct number of due/upcoming payments
- [ ] Upcoming dates list displays correctly
- [ ] Refreshing dashboard updates counts

### Feature B: Daily Digest Email

- [ ] SMTP env vars are set correctly
- [ ] Admin makes request to /admin/send-digest-email
- [ ] Response shows correct `sent` count
- [ ] Check admin email inbox for digest message
- [ ] Email contains both tenant and payment summaries
- [ ] Dates and counts match dashboard

### Feature C: Schema Migration

- [ ] Database file exists in app/ folder
- [ ] Run `python3 migrate_schema.py`
- [ ] All three columns are added successfully
- [ ] Script output shows "✅ All migrations completed successfully!"
- [ ] No error messages
- [ ] Restart Flask app and verify it starts without errors
- [ ] Create a payment with `due_date` and verify it works

---

## Files Modified/Created

### Created
- `/app/migrate_schema.py` – Schema migration helper script
- This guide document

### Modified
- `/app/app.py` – Added digest email endpoint + improved payment/tenant summaries
- `/app/templates/index.html` – Added payment panel card to dashboard
- `/app/static/js/app.js` – Added fetchPaymentSummary() function
- `/app/models.py` – Added new Tenant/Payment columns

### Unchanged
- Core routes and logic remain the same
- No breaking changes to existing APIs
- Backward compatible with existing data

---

## FAQ

**Q: Do I lose data if I run the migration script?**
A: No. The script only adds new columns. Existing data is preserved.

**Q: Can I run the migration script multiple times?**
A: Yes. It's safe to run multiple times. Existing columns are skipped.

**Q: What if I don't set SMTP env vars?**
A: Email features will still work but will log a message and return `sent: false`. No error is thrown.

**Q: Can I delete and recreate the database instead?**
A: Yes, but only in development. This loses all existing data:
   ```bash
   rm app/database.db
   python3 app.py  # Creates fresh DB
   ```

**Q: How often does the background worker check payment due dates?**
A: Every 24 hours by default. Set `REMINDER_INTERVAL_SECONDS` to change.

**Q: Can I schedule digest emails automatically?**
A: Yes. Use cron (`crontab -e`) or add APScheduler to Flask. See section B above.

---

## Support

For issues or questions:

1. Check the troubleshooting sections above
2. Verify SMTP configuration if email doesn't work
3. Run migrate_schema.py if columns are missing
4. Check Flask app logs for error messages
5. Ensure database.db has correct file permissions

---

## Version

Last Updated: 2026-02-28
Features Version: 1.0 (A, B, C complete)
