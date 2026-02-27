# Quick Test Cheat Sheet: QR Code & Payment Reminders

Copy-paste commands for rapid testing. Run in sequence.

---

## 🚀 Setup (Run Once)

### 1. Start Flask
```bash
cd /path/to/pg-management-service/app
python3 app.py
```

### 2. Set Test Variables
```bash
# In another terminal:
TODAY=$(python3 -c "from datetime import date; print(date.today().isoformat())")
TENANT_ID=1
ADMIN_EMAIL="admin@pg.com"
ADMIN_PASS="admin123"
TENANT_EMAIL="tenant@pg.com"
TENANT_PASS="tenant123"
PAYMENT_AMOUNT=5000
PAYMENT_MONTH="March 2026"

echo "Today: $TODAY"
echo "Setup ready for testing"
```

### 3. Login as Admin (Save Cookies)
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c /tmp/admin_cookies.txt \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}"
```

### 4. Login as Tenant (Save Cookies)
```bash
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c /tmp/tenant_cookies.txt \
  -d "{\"email\":\"$TENANT_EMAIL\",\"password\":\"$TENANT_PASS\"}"
```

---

## ✅ Test 1: Create Payment with Due Date

```bash
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt \
  -d "{
    \"tenant_id\": $TENANT_ID,
    \"month\": \"$PAYMENT_MONTH\",
    \"amount\": $PAYMENT_AMOUNT,
    \"paid\": false,
    \"due_date\": \"$TODAY\"
  }" | python3 -m json.tool
```

**Expected:** Returns payment_id (e.g., 42)

**Save it:**
```bash
PAYMENT_ID=42  # Replace with actual ID from response
```

---

## ✅ Test 2: Tenant Gets QR Code

```bash
curl -X GET http://localhost:8000/payments/$PAYMENT_ID/qr \
  -b /tmp/tenant_cookies.txt | python3 -m json.tool
```

**Expected:**
```json
{
  "payment_url": "http://localhost:8000/pay?payment_id=42",
  "qr_url": "https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=..."
}
```

**Save the URLs:**
```bash
PAYMENT_URL="http://localhost:8000/pay?payment_id=$PAYMENT_ID"
QR_URL="https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=http%3A%2F%2Flocalhost%3A8000%2Fpay%3Fpayment_id%3D$PAYMENT_ID"
```

---

## ✅ Test 3: View QR Code in Browser

```bash
# Copy and open QR_URL in browser
# You should see a QR code image
echo "Open in browser: $QR_URL"
```

---

## ✅ Test 4: Admin Gets QR Code (Same Payment)

```bash
curl -X GET http://localhost:8000/payments/$PAYMENT_ID/qr \
  -b /tmp/admin_cookies.txt | python3 -m json.tool
```

**Expected:** Same QR code as tenant (payment_id is the same)

---

## ✅ Test 5: Admin Views Payment Summary

```bash
curl -X GET http://localhost:8000/admin/payment-summary \
  -b /tmp/admin_cookies.txt | python3 -m json.tool
```

**Expected:**
```json
{
  "due_today": 1,
  "total_upcoming": 0,
  "upcoming": []
}
```

- `due_today` should be ≥ 1
- Should include today's payment

---

## ✅ Test 6: Dashboard Visual Check

1. Open browser: http://localhost:8000
2. Login as admin (admin@pg.com / admin123)
3. Click "Dashboard"
4. Scroll down to "Pending Payments Summary" card
5. Should show:
   - "Due today: 1"
   - "Due soon: 0"

**Note:** May need to refresh (F5) to see updated counts

---

## ✅ Test 7: Send Test Email

```bash
curl -X POST http://localhost:8000/admin/send-test-email \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt \
  -d '{
    "to_email":"your.email@gmail.com",
    "subject":"Test Email",
    "body":"This is a test"
  }' | python3 -m json.tool
```

**Expected:**
```json
{"to_email":"your.email@gmail.com","sent":true}
```

- Check email inbox
- If not received, SMTP not configured (see FEATURES_GUIDE.md)

---

## ✅ Test 8: Send Digest Email with Payments

**Setup SMTP first (if not done):**
```bash
export SMTP_EMAIL="your.email@gmail.com"
export SMTP_PASSWORD="your-16-char-app-password"
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
```

**Send digest:**
```bash
curl -X POST http://localhost:8000/admin/send-digest-email \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt | python3 -m json.tool
```

**Expected:**
```json
{
  "message": "Digest email sent",
  "total_admins": 1,
  "sent": 1,
  "date": "2026-02-28"
}
```

**Check email:**
- Subject: `PG Management - Daily Digest (2026-02-28)`
- Contains PAYMENT STATUS SUMMARY section
- Lists payment details (amount, date, tenant name)

---

## ✅ Test 9: Trigger Payment Reminders

```bash
curl -X POST http://localhost:8000/admin/trigger-reminders \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt | python3 -m json.tool
```

**Expected:** JSON array of triggered reminders

---

## ✅ Test 10: Create Multiple Payments (Different Dates)

```bash
# Payment in 3 days
FUTURE=$(python3 -c "from datetime import date, timedelta; print((date.today() + timedelta(days=3)).isoformat())")

curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt \
  -d "{
    \"tenant_id\": 1,
    \"month\": \"Future Payment\",
    \"amount\": 6000,
    \"paid\": false,
    \"due_date\": \"$FUTURE\"
  }" | python3 -m json.tool
```

**Then check summary again:**
```bash
curl -X GET http://localhost:8000/admin/payment-summary \
  -b /tmp/admin_cookies.txt | python3 -m json.tool
```

**Expected:**
```json
{
  "due_today": 1,
  "total_upcoming": 1,
  "upcoming": [
    {"date": "2026-03-03", "count": 1}
  ]
}
```

---

## 🔐 Test 11: Security - Tenant Can't Access Other's QR

```bash
# Create another tenant's payment
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -b /tmp/admin_cookies.txt \
  -d '{
    "tenant_id": 2,
    "month": "Other Tenant",
    "amount": 5000,
    "paid": false
  }' | python3 -m json.tool
# Note the payment_id (e.g., 44)

# As Tenant 1, try to access Tenant 2's payment
OTHER_PAYMENT_ID=44
curl -X GET http://localhost:8000/payments/$OTHER_PAYMENT_ID/qr \
  -b /tmp/tenant_cookies.txt | python3 -m json.tool
```

**Expected:**
```json
{"error":"Unauthorized"}
```

HTTP Status: 403 Forbidden

---

## 📋 Quick Test Summary

| Test | Command | Expected |
|------|---------|----------|
| 1. Create payment | `POST /payments` | Returns payment_id |
| 2. Get QR (tenant) | `GET /payments/<id>/qr` | Returns qr_url |
| 3. Get QR (admin) | `GET /payments/<id>/qr` | Same qr_url |
| 4. Security | `GET /payments/<other>/qr` | 403 Unauthorized |
| 5. Payment summary | `GET /admin/payment-summary` | Shows counts |
| 6. Dashboard | Browser view | Card visible |
| 7. Digest email | `POST /admin/send-digest-email` | Email received |
| 8. Multiple payments | Create 2+ payments | Counts update |

---

## 🛠️ Troubleshooting Quick Fixes

### "Invalid QR URL"
- Paste the `qr_url` into browser URL bar
- Should display QR code image from Google Charts

### "Payment summary shows 0"
- Verify payment exists: `curl http://localhost:8000/payments -b /tmp/admin_cookies.txt`
- Check payment has `due_date` set (not NULL)
- Verify date format is YYYY-MM-DD

### "No email received"
- Set SMTP env vars first
- Try test email: `/admin/send-test-email`
- Check spam folder
- Verify Gmail App Password (16 chars)

### "QR returns Unauthorized"
- Verify tenant owns payment (check tenant_id)
- Admin can access any payment
- Tenant can only access own payments

---

## 📊 All API Calls Used

```bash
# Authentication
POST /login
POST /register

# Payments
POST /payments                          # Create payment
GET /payments/<id>/qr                   # Get QR code

# Reminders
GET /admin/payment-summary              # Payment counts
POST /admin/send-digest-email           # Send email summary
POST /admin/send-test-email             # Test email
POST /admin/trigger-reminders           # Trigger reminders

# View Payments
GET /tenants/<id>/payments              # List payments for tenant
GET /payments                           # List all payments (admin)
```

---

## ⏱️ Expected Test Duration

- Setup: 2 minutes
- Test 1-5: 3 minutes
- Test 6-11: 5 minutes
- **Total: ~10 minutes**

---

## ✅ All Tests Passing?

If all tests return expected results:

✅ QR Code feature: **WORKING**
✅ Payment reminders: **WORKING**
✅ Security controls: **WORKING**
✅ Email integration: **WORKING** (if SMTP configured)

**Ready for production!** 🚀

---

**For detailed docs, see:** TESTING_QR_AND_REMINDERS.md
