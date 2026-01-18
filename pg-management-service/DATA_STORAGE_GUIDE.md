# 🗄️ Data Storage Guide - Where Everything Is Stored

**Date:** January 18, 2026

---

## 📍 Location: SQLite Database File

### File Path
```
/Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db
```

This is a **SQLite database file** - a single file containing all your data.

---

## 📊 5 Tables in the Database

### 1️⃣ **USERS Table** - Passwords & Login Info

**Table Name:** `users`  
**Location:** `database.db` file  
**Contains:** User credentials and roles

**Columns:**
```
┌────┬─────────────────┬──────────────────────────┬──────────┐
│ id │ email           │ password                 │ role     │
├────┼─────────────────┼──────────────────────────┼──────────┤
│ 1  │ admin@pg.com    │ [HASHED PASSWORD]        │ ADMIN    │
│ 2  │ tenant@pg.com   │ [HASHED PASSWORD]        │ TENANT   │
└────┴─────────────────┴──────────────────────────┴──────────┘
```

**Important:** Passwords are HASHED (encrypted), not plain text!

### Password Security
```python
# In app.py line 5:
from werkzeug.security import generate_password_hash, check_password_hash

# When registering (hashes the password):
user = User(
    email=data["email"],
    password=generate_password_hash(data["password"]),  # ← HASHED HERE
    role=data["role"]
)

# When logging in (compares hashed password):
if not check_password_hash(user.password, data["password"]):  # ← VERIFIED HERE
    return {"error": "Invalid credentials"}
```

**Real Example:**
- Plain password entered: `tenant123`
- Stored in database: `pbkdf2:sha256:600000$aBc...xYz` (encrypted)
- Never stored as plain text!

---

### 2️⃣ **TENANTS Table** - Tenant Information

**Table Name:** `tenants`  
**Stores:** Tenant details and their room assignment

**Columns:**
```
┌────┬─────────┬──────────────┬────────────┬────────────┬─────────┐
│ id │user_id  │    name      │   phone    │ join_date  │room_id  │
├────┼─────────┼──────────────┼────────────┼────────────┼─────────┤
│ 1  │ 2       │ John Doe     │9876543210  │ 2026-01-18 │ 3       │
│ 2  │ 2       │ Jane Smith   │9876543211  │ 2026-01-18 │ 2       │
└────┴─────────┴──────────────┴────────────┴────────────┴─────────┘
```

**What's Stored:**
- `user_id` - Links to USER table (connects to login account)
- `name` - Tenant's full name
- `phone` - Contact number
- `join_date` - When they joined
- `room_id` - Which room they occupy

---

### 3️⃣ **ROOMS Table** - Room Details

**Table Name:** `rooms`  
**Stores:** Room information and status

**Columns:**
```
┌────┬────────┬───────────┬──────┬───────────┐
│ id │room_no │room_type  │rent  │ status    │
├────┼────────┼───────────┼──────┼───────────┤
│ 1  │ 101    │ Single    │ 5000 │ Available │
│ 2  │ 102    │ Double    │ 8000 │ Available │
│ 3  │ 103    │ Single    │ 5000 │ Occupied  │
│ 4  │ 104    │ Triple    │12000 │ Available │
└────┴────────┴───────────┴──────┴───────────┘
```

---

### 4️⃣ **PAYMENTS Table** - Rent Payments

**Table Name:** `payments`  
**Stores:** Monthly payment records

**Columns:**
```
┌────┬───────────┬──────────────────┬────────┬──────┐
│ id │ tenant_id │     month        │ amount │ paid │
├────┼───────────┼──────────────────┼────────┼──────┤
│ 1  │ 1         │ January 2026     │ 5000   │ 1    │
│ 2  │ 1         │ February 2026    │ 5000   │ 0    │
│ 3  │ 1         │ March 2026       │ 5000   │ 1    │
└────┴───────────┴──────────────────┴────────┴──────┘
```

**What's Stored:**
- `tenant_id` - Which tenant made the payment
- `month` - Payment period
- `amount` - Rent amount
- `paid` - Boolean (1 = paid, 0 = unpaid)

---

### 5️⃣ **COMPLAINTS Table** - Maintenance Issues

**Table Name:** `complaints`  
**Stores:** Tenant complaints/maintenance requests

**Columns:**
```
┌────┬───────────┬──────────┬────────────────────────┬─────────┐
│ id │ tenant_id │ category │    description         │ status  │
├────┼───────────┼──────────┼────────────────────────┼─────────┤
│ 1  │ 1         │ Plumbing │ Water leaking bathroom │ Pending │
│ 2  │ 1         │Electrical│ Light switch broken    │ Pending │
└────┴───────────┴──────────┴────────────────────────┴─────────┘
```

---

## 🔗 Data Relationships

```
┌──────────────┐
│     USER     │  (Login Credentials + Role)
│ (id, email   │
│  password)   │
└────────┬─────┘
         │ user_id (Foreign Key)
         │
    ┌────▼──────────────┐
    │     TENANT        │  (Tenant Details)
    │ (id, name,        │
    │  phone,           │
    │  join_date)       │
    └────┬──────────────┘
         │ room_id (Foreign Key)
         │
    ┌────▼──────────────┐
    │      ROOM         │  (Room Details)
    │ (id, room_no,     │
    │  room_type,       │
    │  rent, status)    │
    └───────────────────┘

    └──┬─────────────────┐
       │ tenant_id       │
       │ (Foreign Keys)  │
       │                 │
    ┌──▼──────────┐  ┌──▼──────────────┐
    │  PAYMENTS   │  │  COMPLAINTS     │
    │ (month,     │  │ (category,      │
    │  amount,    │  │  description,   │
    │  paid)      │  │  status)        │
    └─────────────┘  └─────────────────┘
```

---

## 📝 How to View the Data

### Method 1: Using SQLite Command Line
```bash
# Connect to database
sqlite3 /Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app/database.db

# View all users (passwords are hashed)
sqlite> SELECT * FROM users;

# View all tenants
sqlite> SELECT * FROM tenants;

# View all rooms
sqlite> SELECT * FROM rooms;

# View all payments
sqlite> SELECT * FROM payments;

# View all complaints
sqlite> SELECT * FROM complaints;

# Exit
sqlite> .quit
```

### Method 2: Using Python
```python
from app import app, db
from models import User, Tenant, Room, Payment, Complaint

with app.app_context():
    # View all users
    users = User.query.all()
    for user in users:
        print(f"Email: {user.email}, Role: {user.role}")
    
    # View all tenants with their rooms
    tenants = Tenant.query.all()
    for tenant in tenants:
        room = Room.query.get(tenant.room_id)
        print(f"Tenant: {tenant.name}, Room: {room.room_no}")
    
    # View payments for a tenant
    payments = Payment.query.filter_by(tenant_id=1).all()
    for payment in payments:
        print(f"Month: {payment.month}, Paid: {payment.paid}")
```

### Method 3: Using Flask Routes (API)
```bash
# Login first
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@pg.com","password":"admin123"}'

# View all tenants
curl http://localhost:8000/tenants -b cookies.txt

# View all rooms
curl http://localhost:8000/rooms -b cookies.txt

# View all payments
curl http://localhost:8000/payments -b cookies.txt

# View all complaints
curl http://localhost:8000/complaints -b cookies.txt
```

---

## 🔐 How Passwords Are Protected

### Storage Security
```python
# models.py - Password stored as hashed string
password = db.Column(db.String(200), nullable=False)

# Example password hash (NOT plain text):
pbkdf2:sha256:600000$abc123$def456xyz...
```

### How It Works
1. **Registration:** Plain password → Hashed → Stored in DB
2. **Login:** Plain password input → Hash it → Compare with stored hash
3. **Never visible:** Original password never displayed or retrievable

### Werkzeug Hashing (Used in app.py)
```python
from werkzeug.security import generate_password_hash, check_password_hash

# Hashing during registration
password_hash = generate_password_hash("tenant123")
# Result: pbkdf2:sha256:600000$aBc...xYz (different each time)

# Verification during login
if check_password_hash(stored_hash, "tenant123"):
    print("Password correct!")
else:
    print("Wrong password!")
```

---

## 📂 Complete Data Structure Example

### User: tenant@pg.com

**In USER table:**
```
id: 2
email: tenant@pg.com
password: pbkdf2:sha256:600000$aBc...xYz (hashed)
role: TENANT
```

**In TENANT table (linked via user_id=2):**
```
id: 1
user_id: 2 (← Links to USER table)
name: John Doe
phone: 9876543210
join_date: 2026-01-18
room_id: 3 (← Links to ROOM table)
```

**In ROOM table (linked via room_id=3):**
```
id: 3
room_no: 103
room_type: Single
rent: 5000
status: Occupied
```

**In PAYMENT table (tenant_id=1):**
```
id: 1 | tenant_id: 1 | month: January 2026    | amount: 5000 | paid: 1
id: 2 | tenant_id: 1 | month: February 2026   | amount: 5000 | paid: 0
id: 3 | tenant_id: 1 | month: March 2026      | amount: 5000 | paid: 1
```

**In COMPLAINT table (tenant_id=1):**
```
id: 1 | tenant_id: 1 | category: Plumbing | description: Water leakage | status: Pending
```

---

## 🗂️ File Locations Summary

| Data | Location | Format |
|------|----------|--------|
| **All database** | `app/database.db` | SQLite file |
| **Users & Passwords** | `database.db` → `users` table | Hashed strings |
| **Tenant Info** | `database.db` → `tenants` table | Text/Numbers |
| **Rooms** | `database.db` → `rooms` table | Text/Numbers |
| **Payments** | `database.db` → `payments` table | Text/Boolean |
| **Complaints** | `database.db` → `complaints` table | Text |
| **Database Definition** | `models.py` | Python classes |
| **API Logic** | `app.py` | Flask routes |

---

## 🔍 Schema Definition (Source Code)

**File:** `models.py`

```python
class User(UserMixin, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)  # ← HASHED
    role = db.Column(db.String(20), nullable=False)

class Tenant(db.Model):
    __tablename__ = "tenants"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))  # ← LINKS TO USER
    name = db.Column(db.String(100))
    phone = db.Column(db.String(15))
    join_date = db.Column(db.Date, default=date.today)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id"))  # ← LINKS TO ROOM
```

---

## 💾 How Data Persists

1. **Write:** Data → Python object → SQLAlchemy → SQLite → File saved
2. **Read:** File → SQLite → SQLAlchemy → Python object → JSON response
3. **Permanent:** Even after server restarts, data stays in `database.db`

---

## ⚠️ Important Notes

✅ **Passwords:** HASHED (secure)  
✅ **Tenant Data:** Stored in TENANT table  
✅ **Room Assignment:** Via room_id foreign key  
✅ **Payments:** Tracked in PAYMENTS table  
✅ **Complaints:** Stored in COMPLAINTS table  

❌ **Passwords never:** Visible in plain text, transmitted without HTTPS, logged  
❌ **Data never:** Deleted automatically, cached unsecurely  

---

## 🎯 Quick Lookup Table

| Info | Table | Column | Protected? |
|------|-------|--------|-----------|
| Tenant username | users | email | No |
| Tenant password | users | password | ✅ Yes (hashed) |
| Tenant role | users | role | No |
| Tenant name | tenants | name | No |
| Tenant phone | tenants | phone | No |
| Tenant's room | tenants | room_id | No |
| Room details | rooms | * | No |
| Rent amount | payments | amount | No |
| Payment status | payments | paid | No |
| Complaint details | complaints | * | No |

---

## 🚀 To Access the Data

### Real Example Query: Find Tenant's Room Rent

```bash
# Step 1: Login as admin
curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@pg.com","password":"admin123"}'

# Step 2: Get all tenants
curl http://localhost:8000/tenants -b cookies.txt
# Response: [{name: "John Doe", room_id: 3}]

# Step 3: Get all rooms
curl http://localhost:8000/rooms -b cookies.txt
# Response: [{room_no: "103", rent: 5000}]

# Result: John Doe lives in room 103 and pays ₹5000/month
```

---

**Summary:** Everything is stored in a single SQLite file (`database.db`) with 5 tables interconnected via foreign keys. Passwords are hashed for security. All data persists even after server restart.
