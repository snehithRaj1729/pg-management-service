#!/usr/bin/env python3
"""
View all data in the PG Management database - Easy way!
Run: python3 view_data.py
"""

import sys
import os

# Add app to path
sys.path.insert(0, '/Users/snehithraj/PycharmProjects/PythonProject/pg-management-service/app')

from app import app, db
from models import User, Tenant, Room, Payment, Complaint

def print_header(title):
    """Print a nice section header"""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)

def print_divider():
    """Print a line"""
    print("-"*70)

# Connect to database
with app.app_context():

    # ========== USERS ==========
    print_header("👤 USERS (Login Accounts)")
    users = User.query.all()

    if users:
        for user in users:
            print(f"\nUser ID: {user.id}")
            print(f"  Email: {user.email}")
            print(f"  Role: {user.role}")
            print(f"  Password (hashed): {user.password[:40]}...")
    else:
        print("No users found!")

    # ========== ROOMS ==========
    print_header("🏠 ROOMS (Available Rooms)")
    rooms = Room.query.all()

    if rooms:
        print(f"\n{'Room No':<10} {'Type':<15} {'Rent':<10} {'Status':<15}")
        print_divider()
        for room in rooms:
            print(f"{room.room_no:<10} {room.room_type:<15} ₹{room.rent:<9} {room.status:<15}")
    else:
        print("No rooms found!")

    # ========== TENANTS ==========
    print_header("👥 TENANTS (Who Lives Where)")
    tenants = Tenant.query.all()

    if tenants:
        for tenant in tenants:
            user = User.query.get(tenant.user_id)
            room = Room.query.get(tenant.room_id)

            print(f"\nTenant ID: {tenant.id}")
            print(f"  Name: {tenant.name}")
            print(f"  Email: {user.email}")
            print(f"  Phone: {tenant.phone}")
            print(f"  Room: {room.room_no} ({room.room_type}) - ₹{room.rent}/month")
            print(f"  Joined: {tenant.join_date}")
    else:
        print("No tenants found!")

    # ========== PAYMENTS ==========
    print_header("💰 PAYMENTS (Rent Tracking)")
    payments = Payment.query.all()

    if payments:
        print(f"\n{'Tenant':<20} {'Month':<20} {'Amount':<10} {'Status':<15}")
        print_divider()
        for payment in payments:
            tenant = Tenant.query.get(payment.tenant_id)
            status = "✓ PAID" if payment.paid else "✗ PENDING"
            print(f"{tenant.name:<20} {payment.month:<20} ₹{payment.amount:<9} {status:<15}")
    else:
        print("No payments found!")

    # ========== COMPLAINTS ==========
    print_header("⚠️  COMPLAINTS (Maintenance Issues)")
    complaints = Complaint.query.all()

    if complaints:
        for complaint in complaints:
            tenant = Tenant.query.get(complaint.tenant_id)
            print(f"\nComplaint ID: {complaint.id}")
            print(f"  Tenant: {tenant.name}")
            print(f"  Category: {complaint.category}")
            print(f"  Issue: {complaint.description}")
            print(f"  Status: {complaint.status}")
    else:
        print("No complaints found!")

    # ========== SUMMARY ==========
    print_header("📊 DATABASE SUMMARY")

    user_count = User.query.count()
    room_count = Room.query.count()
    tenant_count = Tenant.query.count()
    payment_count = Payment.query.count()
    complaint_count = Complaint.query.count()

    print(f"\n  Total Users: {user_count}")
    print(f"  Total Rooms: {room_count}")
    print(f"  Total Tenants: {tenant_count}")
    print(f"  Total Payments: {payment_count}")
    print(f"  Total Complaints: {complaint_count}")

    # Calculate some stats
    paid_payments = Payment.query.filter_by(paid=True).count()
    pending_payments = Payment.query.filter_by(paid=False).count()

    if payment_count > 0:
        print(f"\n  Payments Status:")
        print(f"    - Paid: {paid_payments}")
        print(f"    - Pending: {pending_payments}")

    pending_complaints = Complaint.query.filter(Complaint.status != 'Resolved').count()
    if complaint_count > 0:
        print(f"\n  Complaints Status:")
        print(f"    - Pending: {pending_complaints}")

    print("\n" + "="*70)
    print("  ✅ Database viewed successfully!")
    print("="*70 + "\n")
