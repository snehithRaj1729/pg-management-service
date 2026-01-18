# PG Management API - Complete Flow Diagrams

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   USER AUTHENTICATION FLOW                  │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   New User?      │
                    └────────┬─────────┘
                             │
                    ┌────────▼──────────┐
                    │  POST /register   │
                    │  email, password  │
                    │  role (ADMIN/TEN) │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────┐
                    │  User Created     │
                    │  Password Hashed  │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────────┐
                    │   POST /login         │
                    │   email, password     │
                    └────────┬──────────────┘
                             │
                    ┌────────▼──────────────┐
                    │  Credentials Valid?   │
                    └────────┬──────────────┘
                             │
                    ┌────────▼──────────────┐
                    │  Session Created      │
                    │  (Flask-Login)        │
                    │  Cookies Set          │
                    └────────┬──────────────┘
                             │
                    ┌────────▼──────────────┐
                    │ Access Protected      │
                    │ Routes/Endpoints      │
                    └──────────────────────┘
```

---

## Admin Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                   ADMIN WORKFLOW                            │
└─────────────────────────────────────────────────────────────┘

  ┌────────────────────┐
  │  Admin Login       │
  │ admin@pg.com       │
  │ admin123           │
  └────────┬───────────┘
           │
           ├─────────────────┬──────────────────┬──────────────────┐
           │                 │                  │                  │
      ┌────▼────┐   ┌────────▼────┐  ┌─────────▼──┐   ┌──────────▼──┐
      │  ROOMS   │   │  TENANTS    │  │  PAYMENTS  │   │ COMPLAINTS │
      └────┬────┘   └────────┬────┘  └─────────┬──┘   └──────────┬──┘
           │                 │                  │                  │
      ┌────▼────────┐   ┌────▼──────────┐  ┌──▼──────────┐   ┌───▼──────┐
      │ POST /rooms │   │POST /tenants  │  │POST /payments│  │ GET /comp│
      │ Add Room    │   │ Add Tenant    │  │Record Payment│  │View Issues│
      │             │   │               │  │              │  │          │
      │ GET /rooms  │   │GET /tenants   │  │GET /payments │  │ GET /comp│
      │ View Rooms  │   │ View Tenants  │  │View Payments │  │View Issues│
      └─────────────┘   └───────────────┘  └──────────────┘  └──────────┘
```

---

## Tenant Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                   TENANT WORKFLOW                           │
└─────────────────────────────────────────────────────────────┘

  ┌────────────────────┐
  │  Tenant Login      │
  │ tenant@pg.com      │
  │ tenant123          │
  └────────┬───────────┘
           │
           ├──────────────────┬──────────────────┬─────────────────┐
           │                  │                  │                 │
      ┌────▼──────┐   ┌───────▼─────┐   ┌───────▼────┐   ┌───────▼──┐
      │   ROOMS   │   │  PAYMENTS    │   │ COMPLAINTS │   │  LOGOUT  │
      └────┬──────┘   └───────┬─────┘   └───────┬────┘   └───────┬──┘
           │                  │                  │                 │
      ┌────▼──────────┐  ┌───▼────────┐  ┌──────▼────────┐   ┌───▼──┐
      │ GET /rooms    │  │GET /payments│  │POST /complaints│  │Logout│
      │ View Available│  │Check Payment│  │Submit Complaint│  │      │
      │ Rooms & Rates │  │ Status      │  │Report Issues   │  └──────┘
      │               │  │             │  │                │
      │ GET /payments │  │GET /complaints│ │ GET /complaints│
      │ Check Own     │  │View Own      │  │ View Own       │
      │ Payments      │  │ Complaints   │  │ Complaints     │
      └───────────────┘  └─────────────┘  └────────────────┘
```

---

## Complete User Journey - Day in Life

```
┌─────────────────────────────────────────────────────────────────┐
│                    A DAY IN LIFE - ADMIN                        │
└─────────────────────────────────────────────────────────────────┘

        MORNING                  AFTERNOON              EVENING
        ────────                 ─────────              ───────

    9:00 AM                   2:00 PM                5:00 PM
        │                       │                        │
        ▼                       ▼                        ▼
   ┌─────────┐            ┌──────────┐            ┌──────────┐
   │  Login  │            │ Add Room │            │Check Pay-│
   │ admin@  │            │   105    │            │ments &   │
   │pg.com   │            │ 9000/mon │            │Complaints│
   └────┬────┘            └────┬─────┘            └────┬─────┘
        │                      │                       │
        ▼                      ▼                       ▼
   ┌─────────┐           ┌──────────┐           ┌──────────┐
   │ View    │           │ Check    │           │ View all │
   │ Rooms   │           │ Tenants  │           │Complaints│
   │ Status  │           │ Details  │           │ Status   │
   └────┬────┘           └────┬─────┘           └────┬─────┘
        │                     │                      │
        ▼                     ▼                      ▼
   ┌─────────┐          ┌──────────┐           ┌──────────┐
   │ View    │          │ Record   │           │  Logout  │
   │ Tenants │          │ Payment  │           │          │
   └─────────┘          │ Received │           └──────────┘
                        └──────────┘
```

```
┌─────────────────────────────────────────────────────────────────┐
│                    A DAY IN LIFE - TENANT                       │
└─────────────────────────────────────────────────────────────────┘

        MORNING                  AFTERNOON              EVENING
        ────────                 ─────────              ───────

    8:00 AM                   1:00 PM                7:00 PM
        │                       │                        │
        ▼                       ▼                        ▼
   ┌─────────┐            ┌──────────┐            ┌──────────┐
   │  Login  │            │  Check   │            │Report AC │
   │tenant@  │            │Payment   │            │  Not     │
   │pg.com   │            │ Status   │            │ Working  │
   └────┬────┘            └────┬─────┘            └────┬─────┘
        │                      │                       │
        ▼                      ▼                       ▼
   ┌─────────┐           ┌──────────┐           ┌──────────┐
   │ View    │           │ Check    │           │ POST     │
   │Available│           │Complaint │           │Complaint │
   │ Rooms   │           │  Status  │           │Category: │
   └─────────┘           └──────────┘           │Maint.    │
                                                └────┬─────┘
                                                     │
                                                     ▼
                                                ┌──────────┐
                                                │View      │
                                                │Complaints│
                                                │Status    │
                                                └────┬─────┘
                                                     │
                                                     ▼
                                                ┌──────────┐
                                                │ Logout   │
                                                └──────────┘
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   DATA FLOW DIAGRAM                         │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐                                ┌─────────────┐
│   Browser/   │                                │  Flask App  │
│   Postman    │◄──────── HTTP Response ────────┤  (app.py)   │
│              │                                │             │
│              ├─────── HTTP Request ──────────►│             │
└──────────────┘                                └────────┬────┘
                                                         │
                                                         │ SQLAlchemy ORM
                                                         │
                                           ┌─────────────▼─────────────┐
                                           │  Database Models          │
                                           │  (models.py)              │
                                           │                           │
                                           │ • User                    │
                                           │ • Room                    │
                                           │ • Tenant                  │
                                           │ • Payment                 │
                                           │ • Complaint               │
                                           └─────────────┬─────────────┘
                                                         │
                                                         │ SQL Queries
                                                         │
                                           ┌─────────────▼─────────────┐
                                           │    SQLite Database        │
                                           │    (database.db)          │
                                           │                           │
                                           │ ┌──────────┐              │
                                           │ │  users   │              │
                                           │ ├──────────┤              │
                                           │ │  rooms   │              │
                                           │ ├──────────┤              │
                                           │ │ tenants  │              │
                                           │ ├──────────┤              │
                                           │ │ payments │              │
                                           │ ├──────────┤              │
                                           │ │complaints│              │
                                           │ └──────────┘              │
                                           └───────────────────────────┘
```

---

## Request/Response Cycle

```
┌──────────────────────────────────────────────────────────────┐
│         REQUEST/RESPONSE CYCLE - ADD ROOM EXAMPLE            │
└──────────────────────────────────────────────────────────────┘

1. CLIENT (Postman/Browser)
   ┌────────────────────────────────────────┐
   │ POST /rooms                            │
   │ Content-Type: application/json         │
   │ Cookies: admin_session_id              │
   │                                        │
   │ Body:                                  │
   │ {                                      │
   │   "room_no": "105",                   │
   │   "room_type": "Double",              │
   │   "rent": 9000,                       │
   │   "status": "Available"               │
   │ }                                      │
   └────────────────────┬───────────────────┘
                        │
                        │ HTTP POST Request
                        ▼
2. FLASK SERVER
   ┌────────────────────────────────────────┐
   │ @app.route("/rooms", methods=["POST"]) │
   │ @login_required                        │
   │ def add_room():                        │
   │   # Check if user is ADMIN             │
   │   if current_user.role != "ADMIN":     │
   │     return 403 Forbidden               │
   │                                        │
   │   # Create room object                 │
   │   room = Room(**data)                  │
   │                                        │
   │   # Add to session                     │
   │   db.session.add(room)                 │
   │                                        │
   │   # Commit to database                 │
   │   db.session.commit()                  │
   │                                        │
   │   return {"message": "Room added"}     │
   └────────────────────┬───────────────────┘
                        │
                        │ SQL INSERT
                        ▼
3. DATABASE (SQLite)
   ┌────────────────────────────────────────┐
   │ INSERT INTO room                       │
   │ (room_no, room_type, rent, status)     │
   │ VALUES                                 │
   │ ('105', 'Double', 9000, 'Available')   │
   │                                        │
   │ RESULT: Room with id=5 created         │
   └────────────────────┬───────────────────┘
                        │
                        │ Row inserted
                        ▼
4. SERVER RESPONSE
   ┌────────────────────────────────────────┐
   │ HTTP 200 OK                            │
   │ Content-Type: application/json         │
   │                                        │
   │ Body:                                  │
   │ {                                      │
   │   "message": "Room added"              │
   │ }                                      │
   └────────────────────┬───────────────────┘
                        │
                        │ HTTP Response
                        ▼
5. CLIENT DISPLAY
   ┌────────────────────────────────────────┐
   │ ✓ Room 105 (Double) added!             │
   │   Rent: ₹9000/month                    │
   │   Status: Available                    │
   └────────────────────────────────────────┘
```

---

## Database Schema Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                             │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│      USER               │
├─────────────────────────┤
│ id (PK)          ◄──────┼─────────┐
│ email (UNIQUE)   │      │         │
│ password         │      │         │
│ role             │      │         │
└─────────────────────────┘         │
          ▲                          │
          │                          │
          │ (1:N)                    │ (1:N)
          │                          │
┌─────────┴────────────────────────────────────────┐
│      TENANT                                     │
├─────────────────────────────────────────────────┤
│ id (PK)                                         │
│ user_id (FK) ──────────────────► USER.id       │
│ name                                            │
│ phone                                           │
│ join_date                                       │
│ room_id (FK) ──┐                               │
└─────────┬──────┼───────────────────────────────┘
          │      │
          │      │ (1:N)
          │      │
          │  ┌───▼──────────────────────┐
          │  │      ROOM                │
          │  ├──────────────────────────┤
          └─►│ id (PK)                  │
             │ room_no (UNIQUE)         │
             │ room_type                │
             │ rent                     │
             │ status                   │
             └────────────────────────────┘

┌──────────────────────────────┐
│     PAYMENT                  │
├──────────────────────────────┤
│ id (PK)                      │
│ tenant_id (FK) ──────────────┼──► TENANT.id
│ month                        │
│ amount                       │
│ paid (Boolean)               │
└──────────────────────────────┘

┌──────────────────────────────┐
│     COMPLAINT                │
├──────────────────────────────┤
│ id (PK)                      │
│ tenant_id (FK) ──────────────┼──► TENANT.id
│ category                     │
│ description                  │
│ status                       │
└──────────────────────────────┘
```

---

## HTTP Status Codes Reference

```
┌──────────────────────────────────────────────────────────────┐
│             HTTP STATUS CODES IN THIS API                    │
└──────────────────────────────────────────────────────────────┘

✓ SUCCESS (2xx)
├─ 200 OK
│  └─ Request successful, data returned
│     Example: GET /rooms, POST /login (success)
│
├─ 201 Created
│  └─ Resource created (not currently used)
│     Would be: POST /rooms creates a room
│
└─ 204 No Content
   └─ Request successful, no data to return

⚠ CLIENT ERROR (4xx)
├─ 400 Bad Request
│  └─ Invalid request format
│     Example: Missing required fields
│
├─ 401 Unauthorized
│  └─ Authentication required/failed
│     Example: No session, wrong password
│
├─ 403 Forbidden
│  └─ Authenticated but not authorized
│     Example: Tenant tries to add room (Admin only)
│
└─ 404 Not Found
   └─ Endpoint doesn't exist

✗ SERVER ERROR (5xx)
└─ 500 Internal Server Error
   └─ Server-side exception
      Example: Database error, unhandled exception
```

---

## Session Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│              SESSION MANAGEMENT FLOW                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  User Credentials    │
│  admin@pg.com        │
│  admin123            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  POST /login         │
│  Verify Password     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Create Session                  │
│  (Flask-Login)                   │
│  • User ID stored in session     │
│  • Session cookie sent to client │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Client stores cookie            │
│  Postman: -c admin_cookies.txt   │
│  Browser: localStorage           │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Subsequent Requests             │
│  Include cookie: -b admin_...txt │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Server validates session        │
│  @login_manager.user_loader      │
│  Loads user from database        │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  current_user available          │
│  Check role for authorization    │
│  Execute endpoint logic          │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  GET /logout                     │
│  Destroy session                 │
│  Clear cookies                   │
│  User needs to login again       │
└──────────────────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│              ERROR HANDLING FLOW                            │
└─────────────────────────────────────────────────────────────┘

Request Received
      │
      ▼
┌──────────────────────┐
│ Route Found?         │
└──┬──────────────┬────┘
   │              │
  NO             YES
   │              │
   ▼              ▼
 404            ┌──────────────────────┐
Error          │ Check @login_required │
              └──┬──────────────────┬──┘
                 │                  │
            Not Required        Required
                 │                  │
                 ▼                  ▼
              ┌──────────┐    ┌──────────────┐
              │ Execute  │    │ Check Session│
              │ Endpoint │    └──┬──────┬────┘
              └─────┬────┘       │      │
                    │        Valid   Invalid
                    │            │      │
                    │            ▼      ▼
                    │         Continue 401
                    │            │      Error
                    │            ▼
                    │        ┌──────────┐
                    │        │ Check    │
                    │        │ Role     │
                    │        └──┬────┬──┘
                    │           │    │
                    │       Match   No Match
                    │           │    │
                    │           ▼    ▼
                    │        Continue 403
                    │           │     Error
                    │           ▼
                    │      ┌──────────────┐
                    │      │ Execute      │
                    │      │ Endpoint     │
                    │      │ Logic        │
                    │      └──┬───────┬───┘
                    │         │       │
                    │      Success  Exception
                    │         │       │
                    └────┬────┘       │
                         │           ▼
                         │      ┌─────────┐
                         │      │ 500     │
                         │      │ Error   │
                         │      └─────────┘
                         │
                         ▼
                    ┌──────────────┐
                    │ Send Response│
                    │ + Status Code│
                    └──────────────┘
```

---

## Rate Limiting & Best Practices (Future)

```
┌─────────────────────────────────────────────────────────────┐
│    RECOMMENDED ADDITIONS (Not Yet Implemented)              │
└─────────────────────────────────────────────────────────────┘

1. INPUT VALIDATION
   Request → Validate fields → Process or reject (400)

2. RATE LIMITING
   Request → Check request count → Allow or block (429)

3. LOGGING
   All requests → Log to file with timestamp, user, action

4. ERROR MESSAGES
   Exception → Catch → Log → Return user-friendly message

5. PAGINATION
   GET /payments?page=1&limit=10 → Return 10 records per page

6. SEARCH/FILTER
   GET /tenants?name=John → Return matching tenants

7. PAGINATION
   GET /tenants → Return first 10 only

8. PERSISTENT SESSIONS
   Use Redis instead of memory for production
```

---

## Complete API Call Sequence

```
┌─────────────────────────────────────────────────────────────┐
│         COMPLETE SEQUENCE: Add Room & Verify                │
└─────────────────────────────────────────────────────────────┘

1. Initialize
   GET /init-db
   ✓ Database created with sample data

2. Login
   POST /login (admin@pg.com, admin123)
   ✓ Session created, cookies saved

3. Add Room
   POST /rooms (room_no=105, rent=9000)
   ✓ New room created in database

4. Verify
   GET /rooms
   ✓ Room 105 appears in list

5. Add Tenant to Room
   POST /tenants (user_id=2, room_id=5)
   ✓ Tenant assigned to room 105

6. Record Payment
   POST /payments (tenant_id=2, month="March 2026")
   ✓ Payment recorded

7. Check Payment
   GET /payments
   ✓ Payment appears in list

8. Logout
   GET /logout
   ✓ Session destroyed

9. Verify Logout
   GET /rooms (without cookie)
   ✗ 401 Unauthorized - session required
```
