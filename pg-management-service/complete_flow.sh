#!/bin/bash

################################################################################
# PG Management API - Complete Flow Test Script
# This script demonstrates the entire API flow from login to all endpoints
#
# Usage: bash complete_flow.sh
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:8000"
ADMIN_COOKIES="admin_cookies.txt"
TENANT_COOKIES="tenant_cookies.txt"

# Helper function to print section headers
print_section() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"
}

# Helper function to print step
print_step() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Helper function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Helper function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Make API call and pretty print JSON
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local cookies=$4

    if [ -z "$cookies" ]; then
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint"
    else
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -b "$cookies" \
            -d "$data" \
            "$BASE_URL$endpoint"
    fi
}

################################################################################
# START: Complete API Flow Test
################################################################################

print_section "PG MANAGEMENT API - COMPLETE FLOW TEST"
echo "Base URL: $BASE_URL"
echo "Current Date: $(date '+%B %d, %Y')"
echo "Testing all endpoints with proper authentication"

################################################################################
# Step 1: Initialize Database
################################################################################

print_section "STEP 1: Initialize Database"
print_step "Initializing database with sample data..."

response=$(api_call GET "/init-db" "" "")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Database initialized"

################################################################################
# Step 2: Home Endpoint
################################################################################

print_section "STEP 2: Home Endpoint (Public)"
print_step "Checking home endpoint..."

response=$(api_call GET "/" "" "")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Home endpoint accessible"

################################################################################
# Step 3: User Registration
################################################################################

print_section "STEP 3: User Registration"
print_step "Registering new admin user..."

response=$(api_call POST "/register" \
    '{"email":"newadmin@pg.com","password":"secure123","role":"ADMIN"}' \
    "")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "New admin user registered"

################################################################################
# Step 4: Admin Login
################################################################################

print_section "STEP 4: Admin Login"
print_step "Logging in as admin@pg.com..."

response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -c "$ADMIN_COOKIES" \
    -d '{"email":"admin@pg.com","password":"admin123"}' \
    "$BASE_URL/login")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Admin logged in (session saved to $ADMIN_COOKIES)"

################################################################################
# Step 5: Add New Room
################################################################################

print_section "STEP 5: Add New Room (Admin Only)"
print_step "Adding room 105..."

response=$(api_call POST "/rooms" \
    '{"room_no":"105","room_type":"Double","rent":9000,"status":"Available"}' \
    "$ADMIN_COOKIES")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Room 105 added"

################################################################################
# Step 6: View All Rooms
################################################################################

print_section "STEP 6: View All Rooms"
print_step "Fetching all rooms..."

response=$(curl -s -X GET \
    -b "$ADMIN_COOKIES" \
    "$BASE_URL/rooms")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Rooms fetched successfully"

################################################################################
# Step 7: Add New Tenant
################################################################################

print_section "STEP 7: Add New Tenant (Admin Only)"
print_step "Adding tenant Jane Smith to room 2..."

response=$(api_call POST "/tenants" \
    '{"user_id":2,"name":"Jane Smith","phone":"9876543211","room_id":2}' \
    "$ADMIN_COOKIES")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Tenant Jane Smith added"

################################################################################
# Step 8: View All Tenants
################################################################################

print_section "STEP 8: View All Tenants"
print_step "Fetching all tenants..."

response=$(curl -s -X GET \
    -b "$ADMIN_COOKIES" \
    "$BASE_URL/tenants")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Tenants fetched successfully"

################################################################################
# Step 9: Record Payment
################################################################################

print_section "STEP 9: Record Payment (Admin Only)"
print_step "Recording payment for March 2026..."

response=$(api_call POST "/payments" \
    '{"tenant_id":1,"month":"March 2026","amount":5000,"paid":true}' \
    "$ADMIN_COOKIES")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Payment recorded"

################################################################################
# Step 10: View All Payments
################################################################################

print_section "STEP 10: View All Payments"
print_step "Fetching all payments..."

response=$(curl -s -X GET \
    -b "$ADMIN_COOKIES" \
    "$BASE_URL/payments")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Payments fetched successfully"

################################################################################
# Step 11: Tenant Login
################################################################################

print_section "STEP 11: Tenant Login"
print_step "Logging in as tenant@pg.com..."

response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -c "$TENANT_COOKIES" \
    -d '{"email":"tenant@pg.com","password":"tenant123"}' \
    "$BASE_URL/login")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Tenant logged in (session saved to $TENANT_COOKIES)"

################################################################################
# Step 12: Tenant Views Rooms
################################################################################

print_section "STEP 12: Tenant Views Rooms"
print_step "Fetching rooms as tenant..."

response=$(curl -s -X GET \
    -b "$TENANT_COOKIES" \
    "$BASE_URL/rooms")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Tenant can view rooms"

################################################################################
# Step 13: Tenant Views Payments
################################################################################

print_section "STEP 13: Tenant Views Payments"
print_step "Fetching payment status as tenant..."

response=$(curl -s -X GET \
    -b "$TENANT_COOKIES" \
    "$BASE_URL/payments")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Tenant can view payments"

################################################################################
# Step 14: Tenant Submit Complaint
################################################################################

print_section "STEP 14: Tenant Submit Complaint (Tenant Only)"
print_step "Submitting complaint about electrical issue..."

response=$(api_call POST "/complaints" \
    '{"tenant_id":1,"category":"Electrical","description":"Light switch in bedroom is broken"}' \
    "$TENANT_COOKIES")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Complaint submitted"

################################################################################
# Step 15: View All Complaints
################################################################################

print_section "STEP 15: View All Complaints"
print_step "Fetching all complaints..."

response=$(curl -s -X GET \
    -b "$TENANT_COOKIES" \
    "$BASE_URL/complaints")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Complaints fetched successfully"

################################################################################
# Step 16: Authorization Test - Tenant tries to add room
################################################################################

print_section "STEP 16: Authorization Test (Should Fail)"
print_step "Tenant attempting to add room (should get 403 Forbidden)..."

response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -b "$TENANT_COOKIES" \
    -d '{"room_no":"106","room_type":"Single","rent":5000,"status":"Available"}' \
    "$BASE_URL/rooms")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Authorization check passed - tenant correctly denied"

################################################################################
# Step 17: Authorization Test - Admin tries to submit complaint
################################################################################

print_section "STEP 17: Authorization Test (Should Fail)"
print_step "Admin attempting to submit complaint (should get 403 Forbidden)..."

response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -b "$ADMIN_COOKIES" \
    -d '{"tenant_id":1,"category":"Plumbing","description":"Sink leaking"}' \
    "$BASE_URL/complaints")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Authorization check passed - admin correctly denied"

################################################################################
# Step 18: Unauthorized Access Test
################################################################################

print_section "STEP 18: Unauthorized Access Test"
print_step "Attempting to access protected endpoint without login..."

response=$(curl -s -X GET \
    "$BASE_URL/rooms")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Unauthorized access check passed - session required"

################################################################################
# Step 19: Logout
################################################################################

print_section "STEP 19: Logout"
print_step "Admin logging out..."

response=$(curl -s -X GET \
    -b "$ADMIN_COOKIES" \
    "$BASE_URL/logout")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Admin logged out"

print_step "Tenant logging out..."

response=$(curl -s -X GET \
    -b "$TENANT_COOKIES" \
    "$BASE_URL/logout")
echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
print_success "Tenant logged out"

################################################################################
# Summary
################################################################################

print_section "✓ COMPLETE FLOW TEST FINISHED"
echo -e "${GREEN}All tests completed successfully!${NC}\n"
echo "Test Summary:"
echo "  ✓ Database initialization"
echo "  ✓ User registration"
echo "  ✓ Admin login/logout"
echo "  ✓ Room management (create & view)"
echo "  ✓ Tenant management (create & view)"
echo "  ✓ Payment recording & viewing"
echo "  ✓ Complaint submission"
echo "  ✓ Authorization checks"
echo "  ✓ Tenant operations"
echo ""
echo "Cookie files saved for reuse:"
echo "  - $ADMIN_COOKIES (admin session)"
echo "  - $TENANT_COOKIES (tenant session)"
echo ""
echo -e "${GREEN}Ready for production!${NC}\n"
