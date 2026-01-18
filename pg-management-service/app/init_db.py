#!/usr/bin/env python3
"""
Initialize the database with tables and sample data
Run: python init_db.py
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app import app, db
    from models import User, Room, Tenant, Payment, Complaint
    from werkzeug.security import generate_password_hash
    from datetime import date
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("Make sure you have installed: pip install -r requirements.txt")
    sys.exit(1)

def init_database():
    """Create database tables and populate with sample data"""

    with app.app_context():
        # Create all tables
        db.create_all()
        print("✓ Database tables created")

        # Add admin user
        if User.query.filter_by(email="admin@pg.com").first() is None:
            admin = User(
                email="admin@pg.com",
                password=generate_password_hash("admin123"),
                role="ADMIN"
            )
            db.session.add(admin)
            db.session.commit()
            print("✓ Admin user created (admin@pg.com / admin123)")

        # Add tenant user
        if User.query.filter_by(email="tenant@pg.com").first() is None:
            tenant_user = User(
                email="tenant@pg.com",
                password=generate_password_hash("tenant123"),
                role="TENANT"
            )
            db.session.add(tenant_user)
            db.session.commit()
            print("✓ Tenant user created (tenant@pg.com / tenant123)")

        # Add sample rooms
        if Room.query.count() == 0:
            rooms = [
                Room(room_no="101", room_type="Single", rent=5000, status="Available"),
                Room(room_no="102", room_type="Double", rent=8000, status="Available"),
                Room(room_no="103", room_type="Single", rent=5000, status="Occupied"),
                Room(room_no="104", room_type="Triple", rent=12000, status="Available"),
            ]
            db.session.add_all(rooms)
            db.session.commit()
            print("✓ Sample rooms added (101, 102, 103, 104)")

        # Add sample tenant record
        if Tenant.query.count() == 0:
            tenant_user = User.query.filter_by(email="tenant@pg.com").first()
            room = Room.query.filter_by(room_no="103").first()
            if tenant_user and room:
                sample_tenant = Tenant(
                    user_id=tenant_user.id,
                    name="John Doe",
                    phone="9876543210",
                    room_id=room.id,
                    join_date=date.today()
                )
                db.session.add(sample_tenant)
                db.session.commit()
                print("✓ Sample tenant record added (John Doe)")

        # Add sample payments
        if Payment.query.count() == 0:
            tenant = Tenant.query.first()
            if tenant:
                payments = [
                    Payment(tenant_id=tenant.id, month="January 2026", amount=5000, paid=True),
                    Payment(tenant_id=tenant.id, month="February 2026", amount=5000, paid=False),
                ]
                db.session.add_all(payments)
                db.session.commit()
                print("✓ Sample payments added")

        # Add sample complaint
        if Complaint.query.count() == 0:
            tenant = Tenant.query.first()
            if tenant:
                complaint = Complaint(
                    tenant_id=tenant.id,
                    category="Plumbing",
                    description="Water leakage in bathroom",
                    status="Pending"
                )
                db.session.add(complaint)
                db.session.commit()
                print("✓ Sample complaint added")

        print("\n✅ Database initialized successfully!")
        print("\n📊 Database Statistics:")
        print(f"  - Users: {User.query.count()}")
        print(f"  - Rooms: {Room.query.count()}")
        print(f"  - Tenants: {Tenant.query.count()}")
        print(f"  - Payments: {Payment.query.count()}")
        print(f"  - Complaints: {Complaint.query.count()}")

if __name__ == "__main__":
    init_database()
