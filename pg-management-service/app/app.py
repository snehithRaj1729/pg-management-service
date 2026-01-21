import os
from datetime import date
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Room, Tenant, Payment, Complaint

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
    for t in tenants:
        user = User.query.get(t.user_id)
        room = Room.query.get(t.room_id)
        tenant_list.append({
            "id": t.id,
            "user_id": t.user_id,
            "name": t.name,
            "email": user.email if user else "N/A",
            "phone": t.phone,
            "room_id": t.room_id,
            "room_no": room.room_no if room else "N/A",
            "room_type": room.room_type if room else "N/A",
            "rent": room.rent if room else 0,
            "join_date": str(t.join_date) if t.join_date else "N/A"
        })
    return jsonify(tenant_list)

# ---------------- PAYMENTS ----------------

@app.route("/payments", methods=["POST"])
@login_required
def add_payment():
    if current_user.role != "ADMIN":
        return {"error": "Unauthorized"}, 403

    payment = Payment(**request.json)
    db.session.add(payment)
    db.session.commit()
    return {"message": "Payment recorded"}

@app.route("/payments", methods=["GET"])
@login_required
def view_payments():
    return jsonify([
        {"tenant_id": p.tenant_id, "month": p.month, "paid": p.paid}
        for p in Payment.query.all()
    ])

# ---------------- COMPLAINTS ----------------

@app.route("/complaints", methods=["POST"])
@login_required
def create_complaint():
    if current_user.role != "TENANT":
        return {"error": "Only tenants can raise complaints"}, 403

    complaint = Complaint(
        tenant_id=request.json["tenant_id"],
        category=request.json["category"],
        description=request.json["description"]
    )
    db.session.add(complaint)
    db.session.commit()
    return {"message": "Complaint submitted"}

@app.route("/complaints", methods=["GET"])
@login_required
def list_complaints():
    return jsonify([
        {"category": c.category, "status": c.status}
        for c in Complaint.query.all()
    ])

# ---------------- START ----------------

def init_sample_data():
    """Initialize database with sample data on first run"""
    # Check if data already exists
    try:
        if User.query.count() > 0:
            return
    except:
        pass  # Database might not be initialized yet

    # Create admin user
    admin = User(
        email="admin@pg.com",
        password="pbkdf2:sha256:600000$abc123xyz$admin",
        role="ADMIN"
    )
    db.session.add(admin)
    db.session.commit()

    # Create tenant user
    tenant_user = User(
        email="tenant@pg.com",
        password="pbkdf2:sha256:600000$def456uvw$tenant",
        role="TENANT"
    )
    db.session.add(tenant_user)
    db.session.commit()

    # Create sample rooms
    rooms = [
        Room(room_no="101", room_type="Single", rent=5000, status="Available"),
        Room(room_no="102", room_type="Double", rent=8000, status="Available"),
        Room(room_no="103", room_type="Single", rent=5000, status="Occupied"),
        Room(room_no="104", room_type="Triple", rent=12000, status="Available"),
    ]
    db.session.add_all(rooms)
    db.session.commit()

    # Create sample tenant record
    room = Room.query.filter_by(room_no="103").first()
    tenant = Tenant(
        user_id=tenant_user.id,
        name="John Doe",
        phone="9876543210",
        join_date=date.today(),
        room_id=room.id
    )
    db.session.add(tenant)
    db.session.commit()

    # Create sample payments
    payments = [
        Payment(tenant_id=tenant.id, month="January 2026", amount=5000, paid=True),
        Payment(tenant_id=tenant.id, month="February 2026", amount=5000, paid=False),
    ]
    db.session.add_all(payments)
    db.session.commit()

    # Create sample complaint
    complaint = Complaint(
        tenant_id=tenant.id,
        category="Plumbing",
        description="Water leakage in bathroom",
        status="Pending"
    )
    db.session.add(complaint)
    db.session.commit()

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

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        init_sample_data()
    # Use localhost for development, 0.0.0.0 for production
    host = os.getenv('FLASK_HOST', 'localhost')
    port = int(os.getenv('FLASK_PORT', 8000))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(debug=debug, host=host, port=port)
