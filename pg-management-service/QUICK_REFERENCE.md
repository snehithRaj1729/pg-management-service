# PG Management API - Quick Reference Guide

**Date:** January 18, 2026  
**Base URL:** `http://localhost:8000`  
**Test Credentials:**
- Admin: `admin@pg.com` / `admin123`
- Tenant: `tenant@pg.com` / `tenant123`

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Start Server
```bash
cd /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app
FLASK_HOST=localhost FLASK_PORT=8000 python app.py
```

### Step 2: Initialize Database
```bash
curl http://localhost:8000/init-db
```

### Step 3: Run Complete Test
```bash
bash complete_flow.sh
```

---

## 📚 API Endpoints Summary

### Authentication (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login (creates session) |
| GET | `/logout` | Logout (requires login) |

### Rooms (Admin Only - POST, Everyone - GET)
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/rooms` | ADMIN | Add new room |
| GET | `/rooms` | Any* | View all rooms |

### Tenants (Admin Only - POST, Everyone - GET)
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/tenants` | ADMIN | Add new tenant |
| GET | `/tenants` | Any* | View all tenants |

### Payments (Admin Only - POST, Everyone - GET)
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/payments` | ADMIN | Record payment |
| GET | `/payments` | Any* | View all payments |

### Complaints (Tenant Only - POST, Everyone - GET)
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/complaints` | TENANT | Submit complaint |
| GET | `/complaints` | Any* | View all complaints |

**\*Any = Requires login** (use `-b cookies.txt` in curl)

---

## 🔐 Complete cURL Examples

### 1. Initialize (First Time Only)
```bash
curl http://localhost:8000/init-db
```

### 2. Register New Admin
```bash
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@pg.com",
    "password": "pass123",
    "role": "ADMIN"
  }'
```

### 3. Login (Save Cookies)
```bash
# Admin login
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c admin_cookies.txt \
  -d '{
    "email": "admin@pg.com",
    "password": "admin123"
  }'

# Tenant login
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c tenant_cookies.txt \
  -d '{
    "email": "tenant@pg.com",
    "password": "tenant123"
  }'
```

### 4. Add Room (Admin)
```bash
curl -X POST http://localhost:8000/rooms \
  -H "Content-Type: application/json" \
  -b admin_cookies.txt \
  -d '{
    "room_no": "105",
    "room_type": "Double",
    "rent": 9000,
    "status": "Available"
  }'
```

### 5. View Rooms
```bash
curl -X GET http://localhost:8000/rooms \
  -b admin_cookies.txt | python3 -m json.tool
```

### 6. Add Tenant (Admin)
```bash
curl -X POST http://localhost:8000/tenants \
  -H "Content-Type: application/json" \
  -b admin_cookies.txt \
  -d '{
    "user_id": 2,
    "name": "Jane Smith",
    "phone": "9876543211",
    "room_id": 2
  }'
```

### 7. View Tenants
```bash
curl -X GET http://localhost:8000/tenants \
  -b admin_cookies.txt | python3 -m json.tool
```

### 8. Record Payment (Admin)
```bash
curl -X POST http://localhost:8000/payments \
  -H "Content-Type: application/json" \
  -b admin_cookies.txt \
  -d '{
    "tenant_id": 1,
    "month": "April 2026",
    "amount": 5000,
    "paid": true
  }'
```

### 9. View Payments
```bash
curl -X GET http://localhost:8000/payments \
  -b admin_cookies.txt | python3 -m json.tool
```

### 10. Submit Complaint (Tenant)
```bash
curl -X POST http://localhost:8000/complaints \
  -H "Content-Type: application/json" \
  -b tenant_cookies.txt \
  -d '{
    "tenant_id": 1,
    "category": "Plumbing",
    "description": "Water leakage in bathroom"
  }'
```

### 11. View Complaints
```bash
curl -X GET http://localhost:8000/complaints \
  -b tenant_cookies.txt | python3 -m json.tool
```

### 12. Logout
```bash
curl -X GET http://localhost:8000/logout \
  -b admin_cookies.txt
```

---

## 📋 Sample Data Included

### Users (Created on Init)
```
┌─────────┬──────────────────┬─────────┐
│ Role    │ Email            │Password │
├─────────┼──────────────────┼─────────┤
│ ADMIN   │ admin@pg.com     │admin123 │
│ TENANT  │ tenant@pg.com    │tenant123│
└─────────┴──────────────────┴─────────┘
```

### Rooms (4 Pre-created)
```
101 - Single  - ₹5000/month  - Available
102 - Double  - ₹8000/month  - Available
103 - Single  - ₹5000/month  - Occupied
104 - Triple  - ₹12000/month - Available
```

### Tenants (1 Pre-created)
```
John Doe - Phone: 9876543210 - Room: 103 - Joined: 2026-01-18
```

### Payments (2 Pre-created)
```
January 2026  - ₹5000 - PAID ✓
February 2026 - ₹5000 - PENDING ✗
```

### Complaints (1 Pre-created)
```
Plumbing - Water leakage in bathroom - Status: PENDING
```

---

## 🎯 Common Tasks

### Task 1: Get List of All Available Rooms
```bash
# Login first
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@pg.com","password":"admin123"}'

# Get rooms
curl http://localhost:8000/rooms -b cookies.txt | python3 -m json.tool

# Response:
# [
#   {"room_no": "101", "rent": 5000, "status": "Available"},
#   {"room_no": "102", "rent": 8000, "status": "Available"},
#   ...
# ]
```

### Task 2: Check Payment Status for Specific Month
```bash
curl http://localhost:8000/payments \
  -b cookies.txt | python3 -m json.tool

# Find entries for "January 2026", "February 2026", etc.
```

### Task 3: Report Maintenance Issue
```bash
# As tenant
curl -X POST http://localhost:8000/complaints \
  -H "Content-Type: application/json" \
  -b tenant_cookies.txt \
  -d '{
    "tenant_id": 1,
    "category": "Maintenance",
    "description": "AC is making noise"
  }'
```

### Task 4: Record Multiple Payments
```bash
for month in "March 2026" "April 2026" "May 2026"; do
  curl -X POST http://localhost:8000/payments \
    -H "Content-Type: application/json" \
    -b admin_cookies.txt \
    -d "{
      \"tenant_id\": 1,
      \"month\": \"$month\",
      \"amount\": 5000,
      \"paid\": true
    }"
done
```

---

## ❌ Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `{"error": "Unauthorized"}` 403 | Tenant trying admin action | Use admin account or ask admin |
| `{"error": "Unauthorized - Please login first"}` 401 | No session/login required | Add `-b cookies.txt` with valid session |
| `Connection refused` | Server not running | Run `python app.py` first |
| `Address already in use` port 8000 | Port occupied | Kill process or use different port |
| `Invalid credentials` 401 | Wrong password | Check email/password combination |

---

## 🔄 Workflow Examples

### Example 1: Admin Daily Tasks
```bash
#!/bin/bash

# 1. Login
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c admin.txt \
  -d '{"email":"admin@pg.com","password":"admin123"}'

# 2. Check rooms
curl http://localhost:8000/rooms -b admin.txt

# 3. Check tenants
curl http://localhost:8000/tenants -b admin.txt

# 4. Check payments received
curl http://localhost:8000/payments -b admin.txt

# 5. Check complaints
curl http://localhost:8000/complaints -b admin.txt

# 6. Add new room if needed
curl -X POST http://localhost:8000/rooms \
  -H "Content-Type: application/json" \
  -b admin.txt \
  -d '{"room_no":"106","room_type":"Studio","rent":"4000","status":"Available"}'

# 7. Logout
curl http://localhost:8000/logout -b admin.txt
```

### Example 2: Tenant Workflow
```bash
#!/bin/bash

# 1. Login
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c tenant.txt \
  -d '{"email":"tenant@pg.com","password":"tenant123"}'

# 2. Check available rooms
curl http://localhost:8000/rooms -b tenant.txt

# 3. Check payment status
curl http://localhost:8000/payments -b tenant.txt

# 4. Report issue
curl -X POST http://localhost:8000/complaints \
  -H "Content-Type: application/json" \
  -b tenant.txt \
  -d '{
    "tenant_id":1,
    "category":"Maintenance",
    "description":"Bathroom tap leaking"
  }'

# 5. Check complaint status
curl http://localhost:8000/complaints -b tenant.txt

# 6. Logout
curl http://localhost:8000/logout -b tenant.txt
```

---

## 🧪 Testing with Postman

### Import Instructions:
1. Open Postman
2. **File → Import**
3. Select: `PG_Management_API.postman_collection.json`
4. Set variable: `base_url = http://localhost:8000`
5. Run requests in order

### Collections Included:
- ✓ Setup & Initialization
- ✓ User Authentication
- ✓ Room Management
- ✓ Tenant Management
- ✓ Payment Management
- ✓ Complaint Management
- ✓ Authorization Tests

---

## 📂 Files Created

| File | Purpose |
|------|---------|
| `API_FLOW_EXAMPLE.md` | Detailed flow examples with all endpoints |
| `API_FLOW_DIAGRAMS.md` | Visual diagrams of flows and relationships |
| `complete_flow.sh` | Bash script testing all endpoints |
| `PG_Management_API.postman_collection.json` | Postman collection for testing |
| `QUICK_REFERENCE.md` | This file |

---

## 🛠️ Useful Commands

### Format JSON Response
```bash
curl http://localhost:8000/rooms -b cookies.txt | python3 -m json.tool
```

### Save Response to File
```bash
curl http://localhost:8000/rooms -b cookies.txt > rooms.json
```

### Check Running Processes
```bash
ps aux | grep "python app.py"
```

### Kill Flask Server
```bash
pkill -f "python app.py"
```

### View Database Contents
```bash
sqlite3 app/database.db "SELECT * FROM room;"
```

### Create Fresh Database
```bash
rm app/database.db
python app.py  # Recreates on startup
```

---

## 📊 Database Statistics

After initialization, you have:

```
┌──────────────┬─────────┐
│ Table        │ Records │
├──────────────┼─────────┤
│ users        │    2    │
│ rooms        │    4    │
│ tenants      │    1    │
│ payments     │    2    │
│ complaints   │    1    │
└──────────────┴─────────┘
```

---

## 🔑 Key Concepts

### Sessions & Cookies
- Login creates a **session** (stored in memory)
- Session ID stored in **cookies**
- Use `-c` flag to save cookies (first request)
- Use `-b` flag to send cookies (subsequent requests)
- Session lost if server restarts

### Authentication vs Authorization
- **Authentication**: Verifying who you are (login)
- **Authorization**: Verifying what you can do (role-based)

### Roles
- **ADMIN**: Can manage rooms, tenants, payments
- **TENANT**: Can view rooms/payments, submit complaints

### Status Codes
- **200**: Success
- **401**: Not authenticated (no login)
- **403**: Not authorized (wrong role)
- **500**: Server error

---

## 📝 Notes

1. **No Update/Delete**: Only Create and Read operations
2. **In-Memory Sessions**: Lost on server restart
3. **Auto-Hashing**: Passwords hashed with werkzeug
4. **Sample Data**: Re-created on each `/init-db` call
5. **Date Auto-Generation**: `join_date` uses current date

---

## 🚀 Next Steps

1. ✅ Start server
2. ✅ Initialize database
3. ✅ Test admin endpoints
4. ✅ Test tenant endpoints
5. ⭐ Add Update/Delete operations
6. ⭐ Add input validation
7. ⭐ Deploy to production (0.0.0.0)

---

## 📞 Support

If something doesn't work:
1. Check if Flask is running: `ps aux | grep python`
2. Check logs: Run `python app.py` without `&` to see errors
3. Verify port: `lsof -i :8000`
4. Restart: `pkill -f "python app.py"` then `python app.py`
5. Reset database: Delete `database.db` and run app again

---

**Last Updated:** January 18, 2026  
**Status:** Ready for Testing ✓
