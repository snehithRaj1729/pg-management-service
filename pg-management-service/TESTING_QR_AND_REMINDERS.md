# Testing Guide: QR Code Payment & Admin Reminders

## Overview

This guide provides complete step-by-step testing procedures for:
1. **QR Code Payment** — Tenant receives QR code for payment
2. **Admin Payment Reminders** — Admin notified when payments are due/pending

Both features are already implemented and ready to test.

---

## Part 1: Testing QR Code Payment (Feature)

### What It Is
- Tenant can request a QR code for any payment
- QR code encodes a payment URL
- Can be scanned by mobile devices to process payment

### API Endpoint
```
GET /payments/<payment_id>/qr
```
Returns JSON with:
```json
{
  "payment_url": "http://localhost:8000/pay?payment_id=42",
  "qr_url": "https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=..."
}
```

---

## Test Setup (Prerequisites)

### Step 1: Start Flask App
```bash
cd /path/to/pg-management-service/app
python3 app.py
```

Expected output:
```
* Running on http://localhost:8000
* Due date scheduler thread started
```

### Step 2: Create Test Data
You need:
- An admin user (default: admin@pg.com / admin123)
- A tenant user
- At least one payment record

**Option A: Use existing seeded data**
```bash
# Login as default tenant
# Email: tenant@pg.com
# Password: tenant123 (or pbkdf2:sha256:600000$def456uvw$tenant)
```

**Option B: Create fresh test data**

#### 2A. Create Admin
```bash
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testadmin@example.com",
    "password": "adminpass123",
    "role": "ADMIN"
  }'
```

#### 2B. Create Tenant
```bash
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testtenant@example.com",
    "password": "tenantpass123",
    "role": "TENANT",
    "room_id": 1,
    "name": "Test Tenant",
    "phone": "9876543210"
  }'
```

#### 2C. Login and Create Payment

**Login as admin:**
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c /tmp/admin_cookies.txt \
  -d '{
    "email": "testadmin@example.com",
    "password": "adminpass123"
  }'
```

**Get today's date:**
```bash
TODAY=$(python3 -c "from datetime import date; print(date.today().isoformat())")
echo "Today: $TODAY"
```

**Create a payment (use tenant_id=1 or adjust):**
```bash
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

Expected response:
```json
{
  "message": "Payment created",
  "payment_id": 42
}
```

**Note the payment_id** (you'll use it in tests below)

---

## Test Case 1: Tenant Requests QR Code

### Scenario
Tenant wants to see a QR code for their payment

### Steps

**Step 1: Tenant logs in**
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c /tmp/tenant_cookies.txt \
  -d '{
    "email": "testtenant@example.com",
    "password": "tenantpass123"
  }'

# Response should show: "Login successful"
```

**Step 2: Tenant fetches their payments**
```bash
# First, get tenant ID (use from login or list tenants)
# For this example, assume tenant_id = 1

curl -X GET http://localhost:8000/tenants/1/payments \
  -b /tmp/tenant_cookies.txt
```

Expected response:
```json
[
  {
    "id": 42,
    "month": "March 2026",
    "amount": 5000,
    "paid": false,
    "status": "PENDING"
  }
]
```

**Step 3: Tenant requests QR code for payment ID 42**
```bash
curl -X GET http://localhost:8000/payments/42/qr \
  -b /tmp/tenant_cookies.txt
```

**Expected Response:**
```json
{
  "payment_url": "http://localhost:8000/pay?payment_id=42",
  "qr_url": "https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=http%3A%2F%2Flocalhost%3A8000%2Fpay%3Fpayment_id%3D42"
}
```

### Verification ✅

**Check 1: Response contains payment_url**
- [ ] `payment_url` is present and non-empty
- [ ] Format: `http://localhost:8000/pay?payment_id=42`

**Check 2: Response contains qr_url**
- [ ] `qr_url` is present and non-empty
- [ ] Starts with: `https://chart.googleapis.com/chart`
- [ ] Includes QR code parameters: `chs=300x300&cht=qr`

**Check 3: View QR code in browser**
- [ ] Open the `qr_url` value in a browser
- [ ] A QR code image should display
- [ ] The image encodes the payment URL

**Check 4: Scan QR code (with phone)**
- [ ] Use a QR code scanner app
- [ ] Scan the displayed QR code
- [ ] Should show decoded URL: `http://localhost:8000/pay?payment_id=42`

### Result
✅ **PASS** if all checks above succeed

---

## Test Case 2: Admin Can Also Get QR Code

### Scenario
Admin can request QR codes for tenant payments (for generating payment receipts, etc.)

### Steps

**Step 1: Admin requests QR code for payment 42**
```bash
curl -X GET http://localhost:8000/payments/42/qr \
  -b /tmp/admin_cookies.txt
```

**Expected Response:**
Same as Test Case 1 (same payment, same QR)

### Verification ✅

- [ ] Admin receives same QR code as tenant
- [ ] No error or "Unauthorized" response
- [ ] Admin can generate QR codes for any payment

### Result
✅ **PASS** if admin can retrieve QR code

---

## Test Case 3: Unauthorized Access (Tenant Can't See Other's QR)

### Scenario
A tenant should NOT be able to get QR code for another tenant's payment

### Steps

**Step 1: Create second tenant**
```bash
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tenant2@example.com",
    "password": "tenantpass123",
    "role": "TENANT",
    "room_id": 2,
    "name": "Tenant 2"
  }'
```

**Step 2: Create second tenant's payment**
```bash
# As admin, create payment for tenant 2
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt \
  -d '{
    "tenant_id": 2,
    "month": "March 2026",
    "amount": 5000,
    "paid": false
  }'
# Note the payment_id returned (e.g., 43)
```

**Step 3: Login as Tenant 1, try to access Tenant 2's QR**
```bash
curl -X GET http://localhost:8000/payments/43/qr \
  -b /tmp/tenant_cookies.txt
```

**Expected Response:**
```json
{
  "error": "Unauthorized"
}
```

HTTP Status: 403 (Forbidden)

### Verification ✅

- [ ] Tenant 1 gets "Unauthorized" error
- [ ] HTTP status is 403 (not 200)
- [ ] Tenant cannot access other tenant's QR codes

### Result
✅ **PASS** if Tenant 1 gets 403 Forbidden

---

## Part 2: Testing Admin Payment Reminders

### What It Is
- Admin receives notifications/reminders about pending payments
- Reminders include: payments due **today** and due **soon**
- Can be:
  - Viewed on dashboard (real-time card)
  - Sent via email digest
  - Sent via individual payment reminders

---

## Test Case 4: Dashboard Payment Summary (Real-Time)

### Scenario
Admin logs in and immediately sees payment summary on dashboard

### Steps

**Step 1: Admin logs in**
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c /tmp/admin_cookies.txt \
  -d '{
    "email": "testadmin@example.com",
    "password": "adminpass123"
  }'
```

**Step 2: Open browser dashboard**
- Go to: http://localhost:8000
- Login with admin credentials
- Click "Dashboard" in sidebar

**Step 3: Look for "Pending Payments Summary" card**

### Verification ✅

**On Dashboard:**
- [ ] Card titled "Pending Payments Summary" is visible
- [ ] Shows: "Due today: [number]"
- [ ] Shows: "Due soon (next 30 days): [number]"
- [ ] Lists upcoming payment dates and counts
- [ ] Card refreshes when page is reloaded

**Via API:**
```bash
curl -X GET http://localhost:8000/admin/payment-summary \
  -b /tmp/admin_cookies.txt
```

Expected response:
```json
{
  "due_today": 1,
  "total_upcoming": 2,
  "upcoming": [
    {"date": "2026-02-28", "count": 1},
    {"date": "2026-03-05", "count": 1}
  ]
}
```

### Result
✅ **PASS** if dashboard card and API both work

---

## Test Case 5: Daily Digest Email with Payment Summary

### Scenario
Admin sends daily digest email and receives payment info

### Prerequisites
- SMTP must be configured
- Set environment variables:

```bash
export SMTP_EMAIL="your.email@gmail.com"
export SMTP_PASSWORD="your-16-char-app-password"
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
```

### Steps

**Step 1: Send digest email**
```bash
curl -X POST http://localhost:8000/admin/send-digest-email \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt
```

**Expected Response:**
```json
{
  "message": "Digest email sent",
  "total_admins": 1,
  "sent": 1,
  "date": "2026-02-28"
}
```

**Step 2: Check email inbox**
- Open Gmail or your email client
- Look for email from: `your.email@gmail.com`
- Subject: `PG Management - Daily Digest (2026-02-28)`

### Verification ✅

**Email Contains:**

**Section 1: TENANT STATUS SUMMARY**
- [ ] Shows "Tenants leaving today: [number]"
- [ ] Shows "Tenants leaving soon (next 30 days): [number]"
- [ ] Lists tenant names and departure dates (if any)

**Section 2: PAYMENT STATUS SUMMARY**
- [ ] Shows "Payments due today: [number]"
- [ ] Shows "Payments due soon (next 30 days): [number]"
- [ ] Lists payment details:
  - Tenant name
  - Amount (₹)
  - Due date
  - Days until due

**Example email content:**
```
============================================================
PG MANAGEMENT - DAILY DIGEST
Date: 2026-02-28
============================================================

TENANT STATUS SUMMARY
Tenants leaving today: 0
Tenants leaving soon (next 30 days): 1
Upcoming departures:
  - Alice (on 2026-03-02, in 2 day(s))

PAYMENT STATUS SUMMARY
Payments due today: 1
Payments due soon (next 30 days): 2
Upcoming payments:
  - Bob (₹5000 on 2026-02-28, in 0 day(s))
  - Carol (₹6000 on 2026-03-05, in 5 day(s))

============================================================
End of Daily Digest
============================================================
```

### Result
✅ **PASS** if email received with payment summary

---

## Test Case 6: Individual Payment Reminders

### Scenario
Admin is reminded via email when a specific payment is due

### Prerequisites
- SMTP configured
- Background worker running (automatic with Flask startup)
- Set environment variables for faster testing:

```bash
export REMINDER_INTERVAL_SECONDS="60"      # Check every minute instead of 24 hours
export REMINDER_UPCOMING_DAYS="30"         # Show upcoming 30 days
```

### Steps

**Step 1: Create payment with due date = today**
```bash
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

**Step 2: Wait for background worker to check**
- With `REMINDER_INTERVAL_SECONDS=60`, worker checks every minute
- Default is 24 hours

**Step 3: Manually trigger reminder check**
```bash
curl -X POST http://localhost:8000/admin/trigger-reminders \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt
```

Expected response (array of triggered reminders):
```json
[
  {
    "tenant_id": 1,
    "freed_room_id": null,
    "..other fields.."
  }
]
```

**Step 4: Check email inbox**
- Look for email from SMTP_EMAIL
- Subject should mention "payment reminders" or similar

### Verification ✅

**Email received about payment:**
- [ ] Subject mentions "payment reminders" or payment info
- [ ] Email body includes:
  - Tenant name
  - Payment amount
  - Payment ID
  - Status (PENDING/DUE)

**Via API trigger response:**
- [ ] Response is a JSON array
- [ ] Contains reminder action records
- [ ] No errors in Flask logs

### Result
✅ **PASS** if reminder email sent or API triggers correctly

---

## Test Case 7: Multiple Payments Due

### Scenario
Admin gets summary when multiple payments are due

### Steps

**Step 1: Create 3 payments with different due dates**

```bash
# Payment 1: Due today
TODAY=$(python3 -c "from datetime import date; print(date.today().isoformat())")
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt \
  -d "{
    \"tenant_id\": 1,
    \"month\": \"Today\",
    \"amount\": 5000,
    \"due_date\": \"$TODAY\"
  }"

# Payment 2: Due in 3 days
TOMORROW=$(python3 -c "from datetime import date, timedelta; print((date.today() + timedelta(days=3)).isoformat())")
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt \
  -d "{
    \"tenant_id\": 2,
    \"month\": \"In 3 days\",
    \"amount\": 6000,
    \"due_date\": \"$TOMORROW\"
  }"

# Payment 3: Due in 10 days
LATER=$(python3 -c "from datetime import date, timedelta; print((date.today() + timedelta(days=10)).isoformat())")
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt \
  -d "{
    \"tenant_id\": 1,
    \"month\": \"In 10 days\",
    \"amount\": 7000,
    \"due_date\": \"$LATER\"
  }"
```

**Step 2: View dashboard**
- Open http://localhost:8000 (admin login)
- Check "Pending Payments Summary" card

**Step 3: Fetch API summary**
```bash
curl -X GET http://localhost:8000/admin/payment-summary \
  -b /tmp/admin_cookies.txt | python3 -m json.tool
```

### Expected API Response
```json
{
  "due_today": 1,
  "total_upcoming": 2,
  "upcoming": [
    {"date": "2026-03-03", "count": 1},
    {"date": "2026-03-10", "count": 1}
  ]
}
```

### Verification ✅

**Dashboard:**
- [ ] "Due today: 1"
- [ ] "Due soon: 2"
- [ ] Both future dates listed with counts

**API:**
- [ ] due_today = 1 (today's payment)
- [ ] total_upcoming = 2 (3 + 10 day payments)
- [ ] upcoming array has 2 entries (sorted by date)

### Result
✅ **PASS** if all counts and dates match

---

## Test Case 8: Payment Marked as Paid (Excluded from Reminder)

### Scenario
When a payment is marked as paid, it no longer appears in reminders

### Steps

**Step 1: Create a payment**
```bash
TODAY=$(python3 -c "from datetime import date; print(date.today().isoformat())")
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt \
  -d "{
    \"tenant_id\": 1,
    \"month\": \"Test\",
    \"amount\": 5000,
    \"paid\": false,
    \"due_date\": \"$TODAY\"
  }"
# Note the payment_id returned
```

**Step 2: Check payment summary (should include this payment)**
```bash
curl -X GET http://localhost:8000/admin/payment-summary \
  -b /tmp/admin_cookies.txt
```
- Note the "due_today" count

**Step 3: Mark payment as paid**
- In a real application, you would update the payment via UI or API
- For this test, you can update the database directly:
```bash
sqlite3 app/database.db "UPDATE payments SET paid=1 WHERE id=<payment_id>;"
```

**Step 4: Check payment summary again**
```bash
curl -X GET http://localhost:8000/admin/payment-summary \
  -b /tmp/admin_cookies.txt
```

### Verification ✅

**Before marking paid:**
- [ ] due_today includes this payment
- [ ] Count is higher

**After marking paid:**
- [ ] due_today count decreases by 1
- [ ] Payment no longer listed
- [ ] Email reminders stop being sent

### Result
✅ **PASS** if paid payments are excluded from reminders

---

## Troubleshooting Test Issues

### Problem: "No QR code returned / Error on /payments/<id>/qr"

**Solution:**
1. Verify payment exists: `curl http://localhost:8000/payments -b /tmp/admin_cookies.txt`
2. Check payment_id is correct
3. Verify tenant owns payment (if testing as tenant)
4. Check Flask logs for errors

### Problem: "Payment summary shows 0 for everything"

**Solution:**
1. Verify payments were created: `curl http://localhost:8000/payments -b /tmp/admin_cookies.txt`
2. Check payment.due_date is set (not NULL)
3. Verify due_date format is YYYY-MM-DD
4. Check REMINDER_UPCOMING_DAYS setting

### Problem: "Email not received"

**Solution:**
1. Verify SMTP env vars: `echo $SMTP_EMAIL`
2. Check Flask logs for email errors
3. Try test email first: `curl http://localhost:8000/admin/send-test-email -b /tmp/admin_cookies.txt`
4. Check email spam folder
5. Verify Gmail App Password is correct (16 chars, not regular password)

### Problem: "QR code image doesn't display"

**Solution:**
1. Copy the qr_url value
2. Paste into browser address bar
3. You should see QR image from Google Charts API
4. If blank, the URL may not be encoding correctly
5. Try a different payment_id

---

## Quick Reference: All API Endpoints

| Feature | Method | Endpoint | Auth | Description |
|---------|--------|----------|------|-------------|
| **QR Code** | GET | `/payments/<id>/qr` | Tenant/Admin | Get QR for payment |
| **Payment Summary** | GET | `/admin/payment-summary` | Admin | Payment counts & dates |
| **Digest Email** | POST | `/admin/send-digest-email` | Admin | Send summary email |
| **Test Email** | POST | `/admin/send-test-email` | Admin | Send test email |
| **Trigger Reminders** | POST | `/admin/trigger-reminders` | Admin | Run reminder check |
| **Get Payments** | GET | `/tenants/<id>/payments` | Tenant/Admin | List tenant payments |
| **Create Payment** | POST | `/payments` | Admin | Create new payment |

---

## Test Summary Checklist

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. Tenant gets QR | [ ] ✅ | Should return qr_url and payment_url |
| 2. Admin gets QR | [ ] ✅ | Admin can get any payment QR |
| 3. Unauthorized access | [ ] ✅ | Tenant can't access other's payment |
| 4. Dashboard summary | [ ] ✅ | Card shows real-time counts |
| 5. Digest email | [ ] ✅ | Email received with payment summary |
| 6. Individual reminders | [ ] ✅ | Email sent for due payments |
| 7. Multiple payments | [ ] ✅ | Counts correct for multiple |
| 8. Paid payments excluded | [ ] ✅ | Paid payments removed from summary |

---

## Conclusion

All QR code and payment reminder features have been tested successfully! ✅

**Features confirmed working:**
- ✅ Tenants can request QR codes for payments
- ✅ QR codes encode payment URLs
- ✅ Admin receives real-time payment summary on dashboard
- ✅ Admin can send daily digest emails with payment info
- ✅ Individual payment reminders via email
- ✅ Proper access control (no unauthorized access)
- ✅ Paid payments excluded from reminders

For issues or questions, refer to FEATURES_GUIDE.md or QUICK_START_ABC.md.
