from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import date

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # ADMIN / TENANT

class Room(db.Model):
    __tablename__ = "rooms"

    id = db.Column(db.Integer, primary_key=True)
    room_no = db.Column(db.String(20), unique=True, nullable=False)
    room_type = db.Column(db.String(50))
    rent = db.Column(db.Integer)
    status = db.Column(db.String(20), default="Available")

class Tenant(db.Model):
    __tablename__ = "tenants"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    name = db.Column(db.String(100))
    phone = db.Column(db.String(15))
    join_date = db.Column(db.Date, default=date.today)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id"))
    # Personal info for admin (optional)
    address = db.Column(db.String(300), nullable=True)
    id_info = db.Column(db.String(300), nullable=True)

class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"))
    month = db.Column(db.String(20))  # Jan 2026
    amount = db.Column(db.Integer)
    paid = db.Column(db.Boolean, default=False)
    # Optional due date for payment reminders
    due_date = db.Column(db.Date, nullable=True)

class Complaint(db.Model):
    __tablename__ = "complaints"

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"))
    category = db.Column(db.String(100))
    description = db.Column(db.String(300))
    status = db.Column(db.String(20), default="Pending")
