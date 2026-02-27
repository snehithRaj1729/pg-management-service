import os
from datetime import date, timedelta
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
from models import db, User, Room, Tenant, Payment, Complaint
import threading
import time
import smtplib
from email.message import EmailMessage

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app, supports_credentials=True)
app.config['SECRET_KEY'] = 'change_this_secret'

# Use absolute path for database
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

print(f"Using database: {DB_PATH}")

db.init_app(app)

login_manager = LoginManager(app)
login_manager.login_view = None  # Disable automatic redirect for JSON APIs

@login_manager.unauthorized_handler
def unauthorized():
    return {"error": "Unauthorized - Please login first"}, 401

@app.route("/")
def home():
    return render_template('index.html')

@app.route("/api")
def api():
    return {
        "status": "PG Management Backend is running",
        "message": "API endpoints available",
        "endpoints": ["/login", "/rooms", "/tenants", "/payments", "/complaints"]
    }

@app.route("/init-db")
def init_db_endpoint():
    """Initialize database with sample data"""
    try:
        db.create_all()
        init_sample_data()
        return {
            "status": "success",
            "message": "Database initialized",
            "stats": {
                "users": User.query.count(),
                "rooms": Room.query.count(),
                "tenants": Tenant.query.count(),
                "payments": Payment.query.count(),
                "complaints": Complaint.query.count(),
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Sample data initialization
def init_sample_data():
    """Initialize database with sample data if it doesn't exist"""
    try:
        # Create default admin user if doesn't exist
        if User.query.filter_by(email='admin@pg.com').first() is None:
            admin = User(email='admin@pg.com', password='admin123', role='ADMIN')
            db.session.add(admin)

        # Create default tenant user if doesn't exist
        if User.query.filter_by(email='tenant@pg.com').first() is None:
            tenant_user = User(email='tenant@pg.com', password='tenant123', role='TENANT')
            db.session.add(tenant_user)

        # Create default rooms if don't exist
        if Room.query.count() == 0:
            rooms = [
                Room(room_no='101', room_type='Single', rent=5000, status='Available'),
                Room(room_no='102', room_type='Double', rent=8000, status='Available'),
                Room(room_no='103', room_type='Single', rent=5000, status='Available'),
                Room(room_no='104', room_type='Triple', rent=12000, status='Available'),
                Room(room_no='105', room_type='Suite', rent=60000, status='Available'),
            ]
            for room in rooms:
                db.session.add(room)

        db.session.commit()
    except Exception as e:
        print(f"Error initializing sample data: {e}")
        db.session.rollback()

# ---------------- AUTH ----------------

@app.route("/register", methods=["POST"])
def register():
    data = request.json

    # Check if user already exists
    existing_user = User.query.filter_by(email=data["email"]).first()
    if existing_user:
        return {"message": "Email already exists"}, 400

    try:
        # Store password as plain text for demo (for login to work)
        # In production, use proper hashing
        user = User(
            email=data["email"].lower(),
            password=data["password"],  # Store plain password for easy login
            role=data.get("role", "TENANT")
        )
        db.session.add(user)
        db.session.commit()

        # If user is a TENANT, create a tenant record automatically.
        # Use provided room_id (from the registration form) if available, otherwise pick the first Available room.
        created_tenant_id = None
        if user.role == "TENANT":
            # Prefer room_id provided by client (so frontend can let user pick a room)
            requested_room_id = data.get("room_id")
            available_room = None

            if requested_room_id:
                available_room = Room.query.filter_by(
                    id=int(requested_room_id),
                    status="Available"
                ).first()

                if not available_room:
                    return {
                        "message": "Selected room is no longer available"
                    }, 400
            else:
                return {
                    "message": "Room selection is required"
                }, 400

            if available_room:
                tenant = Tenant(
                    user_id=user.id,
                    name=data.get("name", data["email"].split("@")[0]),
                    phone=data.get("phone", ""),
                    join_date=date.today(),
                    room_id=available_room.id
                )
                db.session.add(tenant)
                # Mark the room as occupied
                available_room.status = "Occupied"
                db.session.add(available_room)
                db.session.commit()
                created_tenant_id = tenant.id

        resp = {"message": "User created", "user_id": user.id}
        if created_tenant_id:
            resp["tenant_id"] = created_tenant_id
        return resp, 201
    except Exception as e:
        db.session.rollback()
        return {"message": f"Registration failed: {str(e)}"}, 500

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email", "").lower()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()

    if not user:
        return {"error": "Invalid credentials"}, 401

    # Check password - try plain comparison first, then try hash verification
    password_valid = False

    # Direct plain text comparison
    if user.password == password:
        password_valid = True
    # Fallback: try werkzeug hash verification for hashed passwords
    elif user.password.startswith('pbkdf2:') or user.password.startswith('scrypt:') or user.password.startswith('bcrypt:'):
        try:
            password_valid = check_password_hash(user.password, password)
        except:
            password_valid = False

    if not password_valid:
        return {"error": "Invalid credentials"}, 401

    login_user(user)
    return {"message": "Login successful", "role": user.role}

@app.route("/current-user", methods=["GET"])
@login_required
def get_current_user():
    """Get current logged-in user's information"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role
    }

@app.route("/users", methods=["GET"])
@login_required
def list_users():
    """List all users (admin only)"""
    if current_user.role != "ADMIN":
        return {"error": "Unauthorized"}, 403

    users = User.query.all()
    return jsonify([
        {"id": u.id, "email": u.email, "role": u.role}
        for u in users
    ])

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return {"message": "Logged out"}

# ---------------- ROOMS (ADMIN) ----------------

@app.route("/rooms", methods=["POST"])
@login_required
def add_room():
    if current_user.role != "ADMIN":
        return {"error": "Unauthorized"}, 403

    data = request.json
    room = Room(**data)
    db.session.add(room)
    db.session.commit()
    return {"message": "Room added"}

@app.route("/rooms", methods=["GET"])
def list_rooms():
    # Allow unauthenticated access so users can see rooms during registration
    rooms = Room.query.all()
    return jsonify([
        {
            "id": r.id,
            "room_no": r.room_no,
            "room_type": r.room_type,
            "rent": r.rent,
            "status": r.status
        }
        for r in rooms
    ])

# ---------------- TENANTS (ADMIN) ----------------

@app.route("/tenants", methods=["POST"])
@login_required
def add_tenant():
    # Allow ADMIN to create tenants for any user. Allow TENANT users to create their own tenant record
    if current_user.role not in ("ADMIN", "TENANT"):
        return {"error": "Unauthorized"}, 403

    data = request.json or {}

    # If the requester is a TENANT, force the user_id to be the current user
    if current_user.role == "TENANT":
        data["user_id"] = current_user.id

    # Validate required fields
    if "user_id" not in data:
        return {"error": "user_id is required"}, 400

    tenant = Tenant(
        user_id=data.get("user_id"),
        name=data.get("name"),
        phone=data.get("phone"),
        join_date=data.get("join_date") or date.today(),
        room_id=data.get("room_id")
    )
    db.session.add(tenant)

    # If a room_id was provided, mark that room as occupied
    if tenant.room_id:
        room = Room.query.get(tenant.room_id)
        if room:
            room.status = "Occupied"
            db.session.add(room)

    db.session.commit()
    return {"message": "Tenant added", "tenant_id": tenant.id}

@app.route("/tenants", methods=["GET"])
@login_required
def list_tenants():
    tenants = Tenant.query.all()
    tenant_list = []
    # Lease length (days) can be configured via environment variable LEASE_LENGTH_DAYS
    lease_days = int(os.getenv('LEASE_LENGTH_DAYS', '30'))
    for t in tenants:
        user = User.query.get(t.user_id)
        room = Room.query.get(t.room_id)
        # Compute an end_date for the tenant using join_date + lease_days
        try:
            if t.join_date:
                end_date = (t.join_date + timedelta(days=lease_days))
                end_date_str = str(end_date)
            else:
                end_date_str = "N/A"
        except Exception:
            end_date_str = "N/A"

        # Expose personal info only to admins
        tenant_obj = {
            "id": t.id,
            "user_id": t.user_id,
            "name": t.name,
            "email": user.email if user else "N/A",
            "phone": t.phone,
            "room_id": t.room_id,
            "room_no": room.room_no if room else "N/A",
            "room_type": room.room_type if room else "N/A",
            "rent": room.rent if room else 0,
            "join_date": str(t.join_date) if t.join_date else "N/A",
            "end_date": end_date_str
        }
        if current_user.role == 'ADMIN':
            tenant_obj['address'] = t.address
            tenant_obj['id_info'] = t.id_info

        tenant_list.append(tenant_obj)
    return jsonify(tenant_list)

@app.route('/payments/<int:payment_id>/qr', methods=['GET'])
@login_required
def payment_qr(payment_id):
    """Return a QR image URL (Google Chart API) encoding a simple payment link for the payment_id."""
    payment = Payment.query.get(payment_id)
    if not payment:
        return {"error": "Payment not found"}, 404

    # Only tenant who owns the payment or admin may request
    tenant = Tenant.query.get(payment.tenant_id)
    if current_user.role != 'ADMIN' and (not tenant or tenant.user_id != current_user.id):
        return {"error": "Unauthorized"}, 403

    # Build a payment URL that could be used by payment gateway / manual handling
    host = request.host_url.rstrip('/')
    payment_url = f"{host}/pay?payment_id={payment.id}"

    # For QR code, use simple URL encoding that Google Charts API accepts
    import urllib.parse
    qr_data = urllib.parse.quote(payment_url)
    qr_url = f"https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl={qr_data}"

    return jsonify({
        "payment_url": payment_url,
        "qr_url": qr_url
    })


@app.route('/admin/payment-summary', methods=['GET'])
@login_required
def admin_payment_summary():
    if current_user.role != 'ADMIN':
        return {"error": "Unauthorized"}, 403
    try:
        upcoming_days = int(os.getenv('REMINDER_UPCOMING_DAYS', '30'))
        today = date.today()
        due_today = 0
        counts_by_date = {}

        payments = Payment.query.filter_by(paid=False).all()
        for p in payments:
            if not p.due_date:
                continue
            days_left = (p.due_date - today).days
            if days_left < 0:
                continue
            if days_left == 0:
                due_today += 1
            if 0 < days_left <= upcoming_days:
                dstr = str(p.due_date)
                counts_by_date[dstr] = counts_by_date.get(dstr, 0) + 1

        upcoming_list = [{"date": d, "count": counts_by_date[d]} for d in sorted(counts_by_date.keys())]
        total_upcoming = sum(counts_by_date.values())
        return jsonify({"due_today": due_today, "total_upcoming": total_upcoming, "upcoming": upcoming_list})
    except Exception as e:
        print('Error in admin_payment_summary:', e)
        return {"error": str(e)}, 500


def payment_due_check_once():
    """Check unpaid payments for due_date and notify admins (via email) and return summary."""
    results = []
    try:
        payments = Payment.query.filter_by(paid=False).all()
        today = date.today()
        upcoming_days = int(os.getenv('REMINDER_UPCOMING_DAYS', '30'))
        due_today = []
        upcoming = {}

        for p in payments:
            if not p.due_date:
                continue
            days_left = (p.due_date - today).days
            if days_left < 0:
                continue
            if days_left == 0:
                due_today.append(p)
            if 0 < days_left <= upcoming_days:
                dstr = str(p.due_date)
                upcoming[dstr] = upcoming.get(dstr, []) + [p]

        # Notify admins if any due_today or upcoming
        admin_emails = [u.email for u in User.query.filter_by(role='ADMIN').all()]
        if admin_emails and (due_today or upcoming):
            subject = 'Payment reminders: pending payments'
            body_lines = []
            body_lines.append(f"Payments due today: {len(due_today)}")
            body_lines.append(f"Payments upcoming (next {upcoming_days} days): {sum(len(v) for v in upcoming.values())}")
            body_lines.append('\nDetails:')
            for p in due_today:
                tenant = Tenant.query.get(p.tenant_id)
                body_lines.append(f"Due today - Tenant: {tenant.name if tenant else 'N/A'} - Payment ID: {p.id} - Amount: {p.amount}")
            for d in sorted(upcoming.keys()):
                for p in upcoming[d]:
                    tenant = Tenant.query.get(p.tenant_id)
                    body_lines.append(f"Upcoming {d} - Tenant: {tenant.name if tenant else 'N/A'} - Payment ID: {p.id} - Amount: {p.amount}")

            body = '\n'.join(body_lines)
            for admin_email in admin_emails:
                send_email_smtp(admin_email, subject, body)

        # Build simple results list for API usage
        results.append({"due_today": len(due_today), "total_upcoming": sum(len(v) for v in upcoming.values())})
    except Exception as e:
        print('Error during payment_due_check_once:', e)
        results.append({'error': str(e)})
    return results


# ============ RECEIPTS ============
@app.route("/receipts/<int:payment_id>", methods=["GET"])
@login_required
def get_receipt(payment_id):
    """Download receipt for a payment"""
    payment = Payment.query.get(payment_id)

    if not payment:
        return {"error": "Payment not found"}, 404

    tenant = Tenant.query.get(payment.tenant_id)
    user = User.query.get(tenant.user_id)
    room = Room.query.get(tenant.room_id)

    # Check authorization - tenant can only see their own receipt
    if current_user.role == "TENANT" and current_user.id != tenant.user_id:
        return {"error": "Unauthorized"}, 403

    receipt_data = {
        "receipt_id": payment.id,
        "receipt_date": str(date.today()),
        "tenant_name": tenant.name,
        "tenant_email": user.email,
        "tenant_phone": tenant.phone,
        "room_no": room.room_no,
        "room_type": room.room_type,
        "payment_month": payment.month,
        "rent_amount": payment.amount,
        "payment_status": "PAID" if payment.paid else "PENDING",
        "payment_date": str(date.today()) if payment.paid else "Not Paid",
        "organization": "PG Management System",
        "receipt_number": f"RCP-{payment.id:05d}"
    }

    return jsonify(receipt_data)

@app.route("/tenants/<int:tenant_id>/payments", methods=["GET"])
@login_required
def get_tenant_payments(tenant_id):
    """Get all payments for a specific tenant"""
    tenant = Tenant.query.get(tenant_id)

    if not tenant:
        return {"error": "Tenant not found"}, 404

    # Check authorization
    if current_user.role == "TENANT" and current_user.id != tenant.user_id:
        return {"error": "Unauthorized"}, 403

    payments = Payment.query.filter_by(tenant_id=tenant_id).all()
    payment_list = []

    for p in payments:
        payment_list.append({
            "id": p.id,
            "month": p.month,
            "amount": p.amount,
            "paid": p.paid,
            "status": "PAID" if p.paid else "PENDING"
        })

    return jsonify(payment_list)

@app.route('/payments', methods=['POST'])
@login_required
def add_payment():
    if current_user.role != 'ADMIN':
        return {"error": "Unauthorized"}, 403

    data = request.json or {}
    tenant_id = data.get('tenant_id')
    month = data.get('month')
    amount = data.get('amount')
    paid = data.get('paid', False)
    due_date = data.get('due_date')  # optional YYYY-MM-DD

    if not tenant_id or month is None or amount is None:
        return {"error": "tenant_id, month and amount are required"}, 400

    try:
        payment = Payment(
            tenant_id=int(tenant_id),
            month=str(month),
            amount=int(amount),
            paid=bool(paid)
        )
        if due_date:
            try:
                from datetime import datetime
                payment.due_date = datetime.strptime(due_date, "%Y-%m-%d").date()
            except Exception:
                # ignore invalid date format, leave as None
                pass

        db.session.add(payment)
        db.session.commit()
        return {"message": "Payment created", "payment_id": payment.id}, 201
    except Exception as e:
        db.session.rollback()
        return {"error": str(e)}, 500

def send_email_smtp(to_email, subject, body):
    """Send email using SMTP if configuration present. Prints log if not configured."""
    smtp_user = os.getenv('SMTP_EMAIL')
    smtp_pass = os.getenv('SMTP_PASSWORD')
    smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', 587))

    if not smtp_user or not smtp_pass:
        print("SMTP not configured (SMTP_EMAIL/SMTP_PASSWORD missing). Skipping email to:", to_email)
        return False

    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg.set_content(body)

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        print(f"Reminder email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return False

def due_date_check_once():
    """Run a single pass of the reminder check and attempt to send emails.
    Returns a list of dicts describing actions taken for easy inspection/testing.
    """
    results = []
    try:
        tenants = Tenant.query.all()
        lease_days = int(os.getenv('LEASE_LENGTH_DAYS', '30'))
        reminder_days = int(os.getenv('REMINDER_DAYS_BEFORE', '7'))

        for t in tenants:
            if not t.join_date:
                continue
            end_date = t.join_date + timedelta(days=lease_days)
            days_left = (end_date - date.today()).days
            # If tenant is at reminder threshold, notify tenant
            if days_left == reminder_days:
                user = User.query.get(t.user_id)
                if user and user.email:
                    subject = "Your tenancy end date is approaching"
                    body = f"Hello {t.name},\n\nYour tenancy is scheduled to end on {end_date}. Please let us know whether you want to continue staying or leave. Reply to this email or contact the admin.\n\nRegards,\nPG Management"
                    sent = send_email_smtp(user.email, subject, body)
                    results.append({"tenant_id": t.id, "email": user.email, "sent": sent, "days_left": days_left})
                else:
                    results.append({"tenant_id": t.id, "email": None, "sent": False, "days_left": days_left})
            # If tenant's end_date has passed, free the room automatically
            if days_left < 0:
                try:
                    room = Room.query.get(t.room_id) if t.room_id else None
                    if room and room.status != 'Available':
                        room.status = 'Available'
                        db.session.add(room)
                        db.session.commit()
                        results.append({"tenant_id": t.id, "freed_room_id": room.id, "room_no": room.room_no})
                except Exception as e:
                    print('Error freeing room for tenant', t.id, e)
                    db.session.rollback()
    except Exception as e:
        print("Error during due_date_check_once:", e)
        results.append({"error": str(e)})

    return results

def due_date_reminder_worker():
    """Background worker that checks tenants and sends reminder emails before end_date.
    Runs in a loop once per day (or faster if DEV_REMINDER_INTERVAL_SECONDS set).
    """
    # Number of days before end_date to send reminder
    reminder_days = int(os.getenv('REMINDER_DAYS_BEFORE', '7'))
    # Sleep interval between checks (seconds). Default one day.
    interval = int(os.getenv('REMINDER_INTERVAL_SECONDS', str(24*60*60)))

    print("Due date reminder worker started: checking every", interval, "seconds")
    while True:
        try:
            with app.app_context():
                # Reuse the single-run checker so behavior is consistent and testable
                results = due_date_check_once()
                if results:
                    print("Due-date reminder worker run results:", results)
                # Run payment due checks as well
                payment_results = payment_due_check_once()
                if payment_results:
                    print("Payment reminder run results:", payment_results)
                # Additionally, free rooms whose tenant end_date is passed
                # Implemented inside due_date_check_once: mark rooms Available when end_date < today
        except Exception as e:
            print("Error in reminder worker:", e)

        # Sleep before next run
        time.sleep(interval)

# Start helper for scheduler
def start_due_date_scheduler():
    """Start the background reminder worker in a daemon thread."""
    try:
        thread = threading.Thread(target=due_date_reminder_worker, daemon=True)
        thread.start()
        print("Due date scheduler thread started")
    except Exception as e:
        print("Failed to start due date scheduler thread:", e)

# ---------------- ADMIN / DEBUG ROUTES ----------------
@app.route('/admin/send-test-email', methods=['POST'])
@login_required
def admin_send_test_email():
    """Admin-only: send a one-off test email using configured SMTP settings.
    Request JSON: {"to_email": "...", "subject": "...", "body": "..."}
    """
    if current_user.role != 'ADMIN':
        return {"error": "Unauthorized"}, 403

    data = request.json or {}
    to_email = data.get('to_email')
    subject = data.get('subject', 'PG Management Test Email')
    body = data.get('body', 'This is a test email from PG Management')

    if not to_email:
        return {"error": "to_email is required"}, 400

    sent = send_email_smtp(to_email, subject, body)
    return {"to_email": to_email, "sent": sent}


@app.route('/admin/trigger-reminders', methods=['POST'])
@login_required
def admin_trigger_reminders():
    """Admin-only: run the reminder check once and return results (useful for testing)."""
    if current_user.role != 'ADMIN':
        return {"error": "Unauthorized"}, 403

    with app.app_context():
        results = due_date_check_once()
    return jsonify(results)

@app.route('/admin/reminder-summary', methods=['GET'])
@login_required
def admin_reminder_summary():
    """Admin-only endpoint that returns how many tenants are leaving today and upcoming dates.
    Response JSON:
    {
      "leaving_today": int,
      "total_upcoming": int,
      "upcoming": [{"date": "YYYY-MM-DD", "count": n}, ...]
    }
    """
    if current_user.role != 'ADMIN':
        return {"error": "Unauthorized"}, 403

    try:
        tenants = Tenant.query.all()
        lease_days = int(os.getenv('LEASE_LENGTH_DAYS', '30'))
        upcoming_days = int(os.getenv('REMINDER_UPCOMING_DAYS', '30'))

        today = date.today()
        counts_by_date = {}
        leaving_today = 0

        for t in tenants:
            if not t.join_date:
                continue
            end_date = t.join_date + timedelta(days=lease_days)
            days_left = (end_date - today).days
            if days_left < 0:
                continue
            if days_left == 0:
                leaving_today += 1
            if 0 < days_left <= upcoming_days:
                dstr = str(end_date)
                counts_by_date[dstr] = counts_by_date.get(dstr, 0) + 1

        upcoming_list = [{"date": d, "count": counts_by_date[d]} for d in sorted(counts_by_date.keys())]
        total_upcoming = sum(counts_by_date.values())

        return jsonify({
            "leaving_today": leaving_today,
            "total_upcoming": total_upcoming,
            "upcoming": upcoming_list
        })
    except Exception as e:
        print('Error in admin_reminder_summary:', e)
        return {"error": str(e)}, 500

@app.route('/admin/send-digest-email', methods=['POST'])
@login_required
def admin_send_digest_email():
    """Admin-only: send a daily digest email to all admins with payment and tenant summaries."""
    if current_user.role != 'ADMIN':
        return {"error": "Unauthorized"}, 403

    try:
        # Gather tenant summary
        tenants = Tenant.query.all()
        lease_days = int(os.getenv('LEASE_LENGTH_DAYS', '30'))
        upcoming_days = int(os.getenv('REMINDER_UPCOMING_DAYS', '30'))
        today = date.today()
        leaving_today = 0
        tenant_upcoming = []

        for t in tenants:
            if not t.join_date:
                continue
            end_date = t.join_date + timedelta(days=lease_days)
            days_left = (end_date - today).days
            if days_left == 0:
                leaving_today += 1
            if 0 < days_left <= upcoming_days:
                tenant_upcoming.append((t.name, end_date, days_left))

        # Gather payment summary
        payments = Payment.query.filter_by(paid=False).all()
        pay_due_today = 0
        pay_upcoming = []

        for p in payments:
            if not p.due_date:
                continue
            days_left = (p.due_date - today).days
            if days_left == 0:
                pay_due_today += 1
            if 0 < days_left <= upcoming_days:
                tenant = Tenant.query.get(p.tenant_id)
                pay_upcoming.append((tenant.name if tenant else 'N/A', p.due_date, p.amount, days_left))

        # Build email body
        body_lines = []
        body_lines.append("=" * 60)
        body_lines.append("PG MANAGEMENT - DAILY DIGEST")
        body_lines.append(f"Date: {today}")
        body_lines.append("=" * 60)
        body_lines.append("")

        body_lines.append("TENANT STATUS SUMMARY")
        body_lines.append("-" * 60)
        body_lines.append(f"Tenants leaving today: {leaving_today}")
        body_lines.append(f"Tenants leaving soon (next {upcoming_days} days): {len(tenant_upcoming)}")
        if tenant_upcoming:
            body_lines.append("\nUpcoming departures:")
            for name, end_date, days_left in sorted(tenant_upcoming, key=lambda x: x[2]):
                body_lines.append(f"  - {name} (on {end_date}, in {days_left} day(s))")
        body_lines.append("")

        body_lines.append("PAYMENT STATUS SUMMARY")
        body_lines.append("-" * 60)
        body_lines.append(f"Payments due today: {pay_due_today}")
        body_lines.append(f"Payments due soon (next {upcoming_days} days): {len(pay_upcoming)}")
        if pay_upcoming:
            body_lines.append("\nUpcoming payments:")
            for name, due_date, amount, days_left in sorted(pay_upcoming, key=lambda x: x[3]):
                body_lines.append(f"  - {name} (₹{amount} on {due_date}, in {days_left} day(s))")
        body_lines.append("")

        body_lines.append("=" * 60)
        body_lines.append("End of Daily Digest")
        body_lines.append("=" * 60)

        subject = f"PG Management - Daily Digest ({today})"
        body = '\n'.join(body_lines)

        # Send to all admins
        admin_emails = [u.email for u in User.query.filter_by(role='ADMIN').all()]
        sent_count = 0
        for admin_email in admin_emails:
            if send_email_smtp(admin_email, subject, body):
                sent_count += 1

        return jsonify({
            "message": "Digest email sent",
            "total_admins": len(admin_emails),
            "sent": sent_count,
            "date": str(today)
        }), 200
    except Exception as e:
        print('Error in admin_send_digest_email:', e)
        return {"error": str(e)}, 500

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        init_sample_data()
    # Start the due date scheduler (runs in background)
    try:
        start_due_date_scheduler()
    except Exception as e:
        print("Failed to start reminder scheduler:", e)
    # Use localhost for development, 0.0.0.0 for production
    host = os.getenv('FLASK_HOST', 'localhost')
    port = int(os.getenv('FLASK_PORT', 8000))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(debug=debug, host=host, port=port)
