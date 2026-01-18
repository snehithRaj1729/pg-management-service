// PG Management System - Frontend JavaScript

const API_URL = 'http://localhost:8000';
let currentUser = null;
let roomsList = [];
let tenantsList = [];
let paymentsList = [];
let complaintsList = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showLoggedInView();
        loadData();
    }
});

// ============ LOGIN ============
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Get user ID from current-user endpoint
            const userResponse = await fetch(`${API_URL}/current-user`, {
                credentials: 'include'
            });

            let userId = null;
            if (userResponse.ok) {
                const userData = await userResponse.json();
                userId = userData.id;
            }

            currentUser = {
                email,
                role: data.role,
                id: userId
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showLoggedInView();
            loadData();
            showAlert('Login successful!', 'success');
        } else {
            showAlert(data.error || 'Login failed', 'danger');
        }
    } catch (error) {
        showAlert('Connection error: ' + error.message, 'danger');
        console.error('Login error:', error);
    }
}

// ============ TENANT REGISTRATION ============
function showRegisterModal() {
    // Load available rooms for registration
    loadAvailableRoomsForRegistration();
    const modal = new bootstrap.Modal(document.getElementById('registerModal'));
    modal.show();
}

async function loadAvailableRoomsForRegistration() {
    try {
        const response = await fetch(`${API_URL}/rooms`, {
            credentials: 'include'
        });
        const data = await response.json();

        const roomSelect = document.getElementById('regRoomId');
        roomSelect.innerHTML = '<option value="">Select a Room</option>';

        data.forEach(room => {
            if (room.status === 'Available') {
                const option = document.createElement('option');
                option.value = room.id;
                option.textContent = `Room ${room.room_no} (${room.room_type}) - ₹${room.rent}/month`;
                roomSelect.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

async function registerTenant() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const roomId = document.getElementById('regRoomId').value;
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;

    // Validation
    if (!name || !email || !phone || !roomId || !password) {
        showAlert('Please fill all required fields', 'warning');
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters', 'warning');
        return;
    }

    if (password !== passwordConfirm) {
        showAlert('Passwords do not match', 'warning');
        return;
    }

    try {
        // Step 1: Register the user account
        console.log('Step 1: Registering user with email:', email);
        const registerResponse = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                email: email,
                password: password,
                name: name,
                phone: phone,
                role: 'TENANT'
            })
        });

        if (!registerResponse.ok) {
            const errorData = await registerResponse.json();
            console.error('Registration error:', errorData);
            showAlert(errorData.message || 'Failed to register. Email may already exist.', 'danger');
            return;
        }

        const registerData = await registerResponse.json();
        console.log('Registration successful:', registerData);

        // Step 2: Login to get the user and establish session
        console.log('Step 2: Logging in with email:', email);
        const loginResponse = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        if (!loginResponse.ok) {
            const errorData = await loginResponse.json();
            console.error('Login error:', errorData);
            showAlert('Registration successful, but login failed. Please login manually.', 'warning');
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
            return;
        }

        const loginData = await loginResponse.json();
        console.log('Login successful, role:', loginData.role);

        // Step 3: Get current user info from API to get the user ID
        console.log('Step 3: Fetching current user info');
        const userResponse = await fetch(`${API_URL}/current-user`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        let userId = null;
        if (userResponse.ok) {
            const userData = await userResponse.json();
            userId = userData.id;
            console.log('Got user ID:', userId);
        } else {
            // If current-user endpoint doesn't exist, query all users and find the one we just created
            console.log('current-user endpoint not available, fetching all users');
            const allUsersResponse = await fetch(`${API_URL}/users`, {
                credentials: 'include'
            });
            if (allUsersResponse.ok) {
                const users = await allUsersResponse.json();
                const newUser = users.find(u => u.email === email);
                userId = newUser ? newUser.id : null;
                console.log('Got user ID from users list:', userId);
            }
        }

        if (!userId) {
            showAlert('Could not get user ID. Please try logging in manually.', 'warning');
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
            return;
        }

        // Step 4: Create tenant record with correct user_id
        console.log('Step 4: Creating tenant record with user_id:', userId);
        const tenantResponse = await fetch(`${API_URL}/tenants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                user_id: userId,
                name: name,
                phone: phone,
                room_id: parseInt(roomId)
            })
        });

        if (tenantResponse.ok) {
            console.log('Tenant record created successfully');
            showAlert('Registration successful! You are now logged in.', 'success');

            // Clear form
            document.getElementById('registerForm').reset();

            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();

            // Set current user and show dashboard
            currentUser = { email, role: 'TENANT', id: userId };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showLoggedInView();
            await loadData();
        } else {
            const errorData = await tenantResponse.json();
            console.error('Tenant creation error:', errorData);
            showAlert(errorData.message || 'Failed to create tenant record', 'danger');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
        console.error('Registration error:', error);
    }
}

// ============ LOGOUT ============
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    location.reload();
}

// ============ UI MANAGEMENT ============
function showLoggedInView() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('userInfo').textContent = `${currentUser.email} (${currentUser.role})`;
    document.getElementById('logoutBtn').style.display = 'inline-block';

    // Show/hide admin features
    const adminButtons = document.querySelectorAll('.admin-only');
    adminButtons.forEach(btn => {
        btn.style.display = currentUser.role === 'ADMIN' ? 'block' : 'none';
    });

    // Show/hide tenant features
    const tenantButtons = document.querySelectorAll('.tenant-only');
    tenantButtons.forEach(btn => {
        btn.style.display = currentUser.role === 'TENANT' ? 'block' : 'none';
    });

    showSection('dashboard');
}

function showSection(section) {
    // Hide all sections
    const sections = ['dashboard', 'rooms', 'tenants', 'payments', 'complaints', 'tenantPayments', 'adminReceipts'];
    sections.forEach(sec => {
        const elem = document.getElementById(sec + 'Section');
        if (elem) elem.style.display = 'none';
    });

    // Show selected section
    const targetSection = document.getElementById(section + 'Section');
    if (targetSection) {
        targetSection.style.display = 'block';
    } else {
        console.error(`Section ${section}Section not found`);
        return;
    }

    // Update active button (only if event exists)
    if (event && event.target) {
        document.querySelectorAll('.list-group-item').forEach(item => {
            item.classList.remove('active');
        });
        const btn = event.target.closest('.list-group-item');
        if (btn) btn.classList.add('active');
    }

    // Load data for section
    if (section === 'dashboard') {
        loadDashboard();
    } else if (section === 'rooms') {
        loadRooms();
    } else if (section === 'tenants') {
        loadTenants();
    } else if (section === 'payments') {
        loadPayments();
    } else if (section === 'complaints') {
        loadComplaints();
    } else if (section === 'tenantPayments') {
        loadTenantPayments();
    } else if (section === 'adminReceipts') {
        loadAdminReceipts();
    }
}

// ============ LOAD DATA ============
async function loadData() {
    await loadDashboard();
    await loadRooms();
}

async function loadDashboard() {
    try {
        console.log('Loading dashboard...');

        const roomsResponse = await fetch(`${API_URL}/rooms`, {
            credentials: 'include'
        });

        if (!roomsResponse.ok) {
            console.error('Rooms request failed:', roomsResponse.status);
            throw new Error('Failed to fetch rooms');
        }
        const roomsData = await roomsResponse.json();
        console.log('Rooms loaded:', roomsData.length);

        const tenantsResponse = await fetch(`${API_URL}/tenants`, {
            credentials: 'include'
        });

        if (!tenantsResponse.ok) {
            console.error('Tenants request failed:', tenantsResponse.status);
            throw new Error('Failed to fetch tenants');
        }
        const tenantsData = await tenantsResponse.json();
        console.log('Tenants loaded:', tenantsData.length);

        const paymentsResponse = await fetch(`${API_URL}/payments`, {
            credentials: 'include'
        });

        if (!paymentsResponse.ok) {
            console.error('Payments request failed:', paymentsResponse.status);
            throw new Error('Failed to fetch payments');
        }
        const paymentsData = await paymentsResponse.json();
        console.log('Payments loaded:', paymentsData.length);

        const complaintsResponse = await fetch(`${API_URL}/complaints`, {
            credentials: 'include'
        });

        if (!complaintsResponse.ok) {
            console.error('Complaints request failed:', complaintsResponse.status);
            throw new Error('Failed to fetch complaints');
        }
        const complaintsData = await complaintsResponse.json();
        console.log('Complaints loaded:', complaintsData.length);

        // Update dashboard cards
        const totalRoomsElem = document.getElementById('totalRooms');
        const totalTenantsElem = document.getElementById('totalTenants');
        const pendingPaymentsElem = document.getElementById('pendingPayments');
        const openComplaintsElem = document.getElementById('openComplaints');

        if (totalRoomsElem) totalRoomsElem.textContent = roomsData.length || 0;
        if (totalTenantsElem) totalTenantsElem.textContent = tenantsData.length || 0;

        const pendingPayments = paymentsData.filter(p => !p.paid).length;
        if (pendingPaymentsElem) pendingPaymentsElem.textContent = pendingPayments;

        const openComplaints = complaintsData.filter(c => c.status === 'Pending').length;
        if (openComplaintsElem) openComplaintsElem.textContent = openComplaints;

        roomsList = roomsData;
        tenantsList = tenantsData;
        paymentsList = paymentsData;
        complaintsList = complaintsData;

        console.log('Dashboard loaded successfully');
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showAlert('Failed to load dashboard: ' + error.message, 'danger');
    }
}

async function loadRooms() {
    try {
        console.log('Loading rooms...');
        const response = await fetch(`${API_URL}/rooms`, {
            credentials: 'include'
        });

        if (!response.ok) {
            console.error('Rooms request failed:', response.status);
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('Rooms fetched:', data);
        roomsList = data;

        const roomsList_elem = document.getElementById('roomsList');
        if (!roomsList_elem) {
            console.error('roomsList element not found');
            return;
        }

        roomsList_elem.innerHTML = '';

        // Filter rooms based on user role
        let displayRooms = data;
        if (currentUser && currentUser.role === 'TENANT') {
            // Tenants only see available rooms
            displayRooms = data.filter(room => room.status === 'Available');

            if (displayRooms.length === 0) {
                roomsList_elem.innerHTML = '<div class="alert alert-info w-100">No rooms available at the moment.</div>';
                return;
            }
        }

        displayRooms.forEach(room => {
            const statusBadge = room.status === 'Available'
                ? '<span class="status-badge status-available">Available</span>'
                : '<span class="status-badge status-occupied">Occupied</span>';

            // Add note for tenants that they cannot edit
            const tenantNote = currentUser && currentUser.role === 'TENANT'
                ? '<div class="alert alert-light mt-3"><small><i class="fas fa-info-circle"></i> Room details are read-only. Contact admin to book a room.</small></div>'
                : '';

            const card = `
                <div class="col-md-6 mb-3">
                    <div class="card room-card ${currentUser && currentUser.role === 'TENANT' ? 'disabled-card' : ''}">
                        <div class="card-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <div class="room-number">${room.room_no}</div>
                                    <div class="room-type">${room.room_type}</div>
                                </div>
                                ${statusBadge}
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="room-detail">
                                <span class="room-detail-label">Rent:</span>
                                <span class="room-detail-value">₹${room.rent}</span>
                            </div>
                            <div class="room-detail">
                                <span class="room-detail-label">Status:</span>
                                <span class="room-detail-value">${room.status}</span>
                            </div>
                            ${tenantNote}
                        </div>
                    </div>
                </div>
            `;
            roomsList_elem.innerHTML += card;
        });
        console.log('Rooms loaded successfully');
    } catch (error) {
        console.error('Error loading rooms:', error);
        showAlert('Failed to load rooms: ' + error.message, 'danger');
    }
}

async function loadTenants() {
    try {
        console.log('Loading tenants...');

        // Get all users
        const usersResponse = await fetch(`${API_URL}/users`, {
            credentials: 'include'
        });

        if (!usersResponse.ok) {
            console.error('Users request failed:', usersResponse.status);
            throw new Error(`HTTP ${usersResponse.status}`);
        }

        const users = await usersResponse.json();
        console.log('All users fetched:', users);

        // Get all tenants
        const tenantsResponse = await fetch(`${API_URL}/tenants`, {
            credentials: 'include'
        });

        if (!tenantsResponse.ok) {
            console.error('Tenants request failed:', tenantsResponse.status);
            throw new Error(`HTTP ${tenantsResponse.status}`);
        }

        const tenants = await tenantsResponse.json();
        console.log('Tenant records fetched:', tenants);

        // Get all rooms
        const roomsResponse = await fetch(`${API_URL}/rooms`, {
            credentials: 'include'
        });

        if (!roomsResponse.ok) {
            console.error('Rooms request failed:', roomsResponse.status);
            throw new Error(`HTTP ${roomsResponse.status}`);
        }

        const rooms = await roomsResponse.json();
        console.log('Rooms fetched:', rooms);

        const tableBody = document.getElementById('tenantsTableBody');
        if (!tableBody) {
            console.error('tenantsTableBody element not found');
            return;
        }

        tableBody.innerHTML = '';

        // Filter to show only TENANT users (exclude admin)
        const tenantUsers = users.filter(user => user.role === 'TENANT');
        console.log('Tenant users (excluding admin):', tenantUsers);

        if (!tenantUsers || tenantUsers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No tenants found</td></tr>';
            return;
        }

        // Display each tenant user
        tenantUsers.forEach((user) => {
            // Find associated tenant record
            const tenantRecord = tenants.find(t => t.user_id === user.id);

            let roomNo = 'N/A';
            let roomType = 'N/A';
            let rent = 0;
            let joinDate = 'N/A';

            if (tenantRecord) {
                joinDate = tenantRecord.join_date || 'N/A';
                const room = rooms.find(r => r.id === tenantRecord.room_id);
                if (room) {
                    roomNo = room.room_no;
                    roomType = room.room_type;
                    rent = room.rent;
                }
            }

            const row = `
                <tr>
                    <td><strong>${tenantRecord ? tenantRecord.name : 'N/A'}</strong></td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${tenantRecord ? tenantRecord.phone : 'N/A'}</td>
                    <td>Room ${roomNo} (${roomType})</td>
                    <td>₹${rent}</td>
                    <td>${joinDate}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        console.log('Tenants loaded successfully');
    } catch (error) {
        console.error('Error loading tenants:', error);
        showAlert('Failed to load tenants: ' + error.message, 'danger');
    }
}

async function loadPayments() {
    try {
        console.log('Loading payments...');

        // Get all payments
        const paymentsResponse = await fetch(`${API_URL}/payments`, {
            credentials: 'include'
        });

        if (!paymentsResponse.ok) {
            console.error('Payments request failed:', paymentsResponse.status);
            throw new Error(`HTTP ${paymentsResponse.status}`);
        }

        const payments = await paymentsResponse.json();
        console.log('All payments fetched:', payments);
        paymentsList = payments;

        // Get all tenants
        const tenantsResponse = await fetch(`${API_URL}/tenants`, {
            credentials: 'include'
        });

        if (!tenantsResponse.ok) {
            console.error('Tenants request failed:', tenantsResponse.status);
            throw new Error(`HTTP ${tenantsResponse.status}`);
        }

        const tenants = await tenantsResponse.json();
        console.log('All tenants fetched:', tenants);

        // Get all users
        const usersResponse = await fetch(`${API_URL}/users`, {
            credentials: 'include'
        });

        if (!usersResponse.ok) {
            console.error('Users request failed:', usersResponse.status);
            throw new Error(`HTTP ${usersResponse.status}`);
        }

        const users = await usersResponse.json();
        console.log('All users fetched:', users);

        // Get all rooms
        const roomsResponse = await fetch(`${API_URL}/rooms`, {
            credentials: 'include'
        });

        if (!roomsResponse.ok) {
            console.error('Rooms request failed:', roomsResponse.status);
            throw new Error(`HTTP ${roomsResponse.status}`);
        }

        const rooms = await roomsResponse.json();
        console.log('All rooms fetched:', rooms);

        const tableBody = document.getElementById('paymentsTableBody');
        if (!tableBody) {
            console.error('paymentsTableBody element not found');
            return;
        }

        tableBody.innerHTML = '';

        if (!payments || payments.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No payments found</td></tr>';
            return;
        }

        // Display each payment
        payments.forEach(payment => {
            // Find tenant record
            const tenant = tenants.find(t => t.id === payment.tenant_id);

            let tenantName = 'N/A';
            let tenantEmail = 'N/A';
            let tenantPhone = 'N/A';
            let roomNo = 'N/A';
            let roomType = 'N/A';

            if (tenant) {
                tenantName = tenant.name;
                tenantPhone = tenant.phone;

                // Find user email
                const user = users.find(u => u.id === tenant.user_id);
                if (user) {
                    tenantEmail = user.email;
                }

                // Find room
                const room = rooms.find(r => r.id === tenant.room_id);
                if (room) {
                    roomNo = room.room_no;
                    roomType = room.room_type;
                }
            }

            const statusBadge = payment.paid
                ? '<span class="badge bg-success">✓ PAID</span>'
                : '<span class="badge bg-warning">✗ PENDING</span>';

            const row = `
                <tr>
                    <td><strong>${tenantName}</strong></td>
                    <td>${tenantEmail}</td>
                    <td>${tenantPhone}</td>
                    <td>Room ${roomNo} (${roomType})</td>
                    <td>${payment.month}</td>
                    <td>₹${payment.amount}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        console.log('Payments loaded successfully');
    } catch (error) {
        console.error('Error loading payments:', error);
        showAlert('Failed to load payments: ' + error.message, 'danger');
    }
}

async function loadComplaints() {
    try {
        const response = await fetch(`${API_URL}/complaints`, {
            credentials: 'include'
        });
        const data = await response.json();
        complaintsList = data;

        const tableBody = document.getElementById('complaintsTableBody');
        tableBody.innerHTML = '';

        data.forEach(complaint => {
            const tenant = tenantsList.find(t => t.id === complaint.tenant_id) || {};
            const statusBadge = complaint.status === 'Pending'
                ? '<span class="badge bg-warning">Pending</span>'
                : '<span class="badge bg-success">Resolved</span>';

            const row = `
                <tr>
                    <td>${tenant.name || 'N/A'}</td>
                    <td>${complaint.category}</td>
                    <td>${complaint.description}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading complaints:', error);
        showAlert('Failed to load complaints', 'danger');
    }
}

async function loadTenantPayments() {
    try {
        console.log('Loading tenant payments...');
        console.log('Current user:', currentUser);

        // Get current user's tenant ID
        const tenantsResponse = await fetch(`${API_URL}/tenants`, {
            credentials: 'include'
        });

        if (!tenantsResponse.ok) {
            showAlert('Failed to load tenants list', 'danger');
            return;
        }

        const tenants = await tenantsResponse.json();
        console.log('All tenants:', tenants);
        console.log('Looking for tenant with user_id:', currentUser.id);

        // Find current tenant by user_id
        const currentTenant = tenants.find(t => t.user_id === currentUser.id);
        console.log('Found current tenant:', currentTenant);

        if (!currentTenant) {
            console.warn('No tenant record found for user_id:', currentUser.id);
            const tableBody = document.getElementById('tenantPaymentsTableBody');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-warning">No tenant record associated with your account</td></tr>';
            }
            return;
        }

        // Get payments for this tenant
        const paymentsResponse = await fetch(`${API_URL}/tenants/${currentTenant.id}/payments`, {
            credentials: 'include'
        });

        if (!paymentsResponse.ok) {
            showAlert('Failed to load payments', 'danger');
            return;
        }

        const payments = await paymentsResponse.json();
        console.log('Tenant payments:', payments);

        const tableBody = document.getElementById('tenantPaymentsTableBody');
        if (!tableBody) {
            console.error('tenantPaymentsTableBody element not found');
            return;
        }

        tableBody.innerHTML = '';

        if (payments.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No payments found</td></tr>';
            return;
        }

        payments.forEach(payment => {
            const statusBadge = payment.paid
                ? '<span class="badge bg-success">✓ PAID</span>'
                : '<span class="badge bg-warning">✗ PENDING</span>';

            const downloadBtn = `
                <button class="btn btn-sm btn-info" onclick="downloadReceipt(${payment.id})">
                    <i class="fas fa-download"></i> Receipt
                </button>
            `;

            const row = `
                <tr>
                    <td><strong>${payment.month}</strong></td>
                    <td>₹${payment.amount}</td>
                    <td>${statusBadge}</td>
                    <td>${payment.paid ? downloadBtn : 'N/A'}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
        console.log('Tenant payments loaded successfully');
    } catch (error) {
        console.error('Error loading tenant payments:', error);
        showAlert('Failed to load payments: ' + error.message, 'danger');
    }
}

async function downloadReceipt(paymentId) {
    try {
        const response = await fetch(`${API_URL}/receipts/${paymentId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            showAlert('Failed to download receipt', 'danger');
            return;
        }

        const receiptData = await response.json();

        // Create receipt content
        const receiptContent = `
PG MANAGEMENT SYSTEM - PAYMENT RECEIPT
====================================

Receipt Number: ${receiptData.receipt_number}
Receipt Date: ${receiptData.receipt_date}

ORGANIZATION: ${receiptData.organization}

TENANT DETAILS:
--------------
Name: ${receiptData.tenant_name}
Email: ${receiptData.tenant_email}
Phone: ${receiptData.tenant_phone}

ROOM DETAILS:
-------------
Room No: ${receiptData.room_no}
Room Type: ${receiptData.room_type}

PAYMENT DETAILS:
----------------
Payment Month: ${receiptData.payment_month}
Rent Amount: ₹${receiptData.rent_amount}
Payment Status: ${receiptData.payment_status}
Payment Date: ${receiptData.payment_date}

====================================
Thank you for your payment!
====================================
        `;

        // Download as text file
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(receiptContent));
        element.setAttribute('download', `Receipt_${receiptData.receipt_number}.txt`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

        showAlert('Receipt downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error downloading receipt:', error);
        showAlert('Error downloading receipt: ' + error.message, 'danger');
    }
}

// ============ ADD TENANT ============
function showAddTenantModal() {
    // Populate room select
    const roomSelect = document.getElementById('roomSelect');
    roomSelect.innerHTML = '<option value="">Select Room</option>';

    roomsList.forEach(room => {
        if (room.status === 'Available') {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = `Room ${room.room_no} (${room.room_type}) - ₹${room.rent}`;
            roomSelect.appendChild(option);
        }
    });

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addTenantModal'));
    modal.show();
}

async function saveTenant() {
    const name = document.getElementById('tenantName').value;
    const email = document.getElementById('tenantEmail').value;
    const phone = document.getElementById('tenantPhone').value;
    const roomId = document.getElementById('roomSelect').value;
    const password = document.getElementById('tenantPassword').value;

    if (!name || !email || !phone || !roomId || !password) {
        showAlert('Please fill all required fields', 'warning');
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters', 'warning');
        return;
    }

    try {
        console.log('Step 1: Registering user...');
        // First register the user
        const registerResponse = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                email: email,
                password: password,
                role: 'TENANT'
            })
        });

        if (!registerResponse.ok) {
            const errorData = await registerResponse.json();
            showAlert(errorData.message || 'Failed to register tenant', 'danger');
            return;
        }

        console.log('Step 2: Getting user ID...');
        // Get the user ID
        let userId = null;

        // Try to get from users list
        const usersResponse = await fetch(`${API_URL}/users`, {
            credentials: 'include'
        });

        if (usersResponse.ok) {
            const users = await usersResponse.json();
            const newUser = users.find(u => u.email === email);
            userId = newUser ? newUser.id : null;
            console.log('Got user ID:', userId);
        }

        if (!userId) {
            showAlert('Could not get user ID. Please refresh and try again.', 'danger');
            return;
        }

        console.log('Step 3: Creating tenant record with user_id:', userId);
        // Then add tenant record
        const tenantResponse = await fetch(`${API_URL}/tenants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                user_id: userId,  // Use actual user ID
                name: name,
                phone: phone,
                room_id: parseInt(roomId)
            })
        });

        if (tenantResponse.ok) {
            console.log('Tenant created successfully');
            showAlert('Tenant added successfully!', 'success');

            // Clear form
            document.getElementById('addTenantForm').reset();

            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('addTenantModal')).hide();

            // Reload data
            await loadTenants();
            await loadDashboard();
        } else {
            const errorData = await tenantResponse.json();
            showAlert(errorData.message || 'Failed to add tenant', 'danger');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
        console.error('Save tenant error:', error);
    }
}

// ============ ADD ROOM ============
function showAddRoomModal() {
    const modal = new bootstrap.Modal(document.getElementById('addRoomModal'));
    modal.show();
}

async function saveRoom() {
    const roomNo = document.getElementById('roomNo').value;
    const roomType = document.getElementById('roomType').value;
    const roomRent = document.getElementById('roomRent').value;

    if (!roomNo || !roomType || !roomRent) {
        showAlert('Please fill all required fields', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                room_no: roomNo,
                room_type: roomType,
                rent: parseInt(roomRent),
                status: 'Available'
            })
        });

        if (response.ok) {
            showAlert('Room added successfully!', 'success');
            document.getElementById('addRoomForm').reset();
            bootstrap.Modal.getInstance(document.getElementById('addRoomModal')).hide();
            await loadRooms();
            await loadDashboard();
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || 'Failed to add room', 'danger');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
        console.error('Save room error:', error);
    }
}

// ============ ADD COMPLAINT ============
function showAddComplaintModal() {
    const modal = new bootstrap.Modal(document.getElementById('addComplaintModal'));
    modal.show();
}

async function saveComplaint() {
    const category = document.getElementById('complaintCategory').value;
    const description = document.getElementById('complaintDesc').value;

    if (!category || !description) {
        showAlert('Please fill all required fields', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                tenant_id: 1,  // Would be replaced with actual tenant ID
                category: category,
                description: description
            })
        });

        if (response.ok) {
            showAlert('Complaint submitted successfully!', 'success');
            document.getElementById('addComplaintForm').reset();
            bootstrap.Modal.getInstance(document.getElementById('addComplaintModal')).hide();
            await loadComplaints();
            await loadDashboard();
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || 'Failed to submit complaint', 'danger');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
        console.error('Save complaint error:', error);
    }
}

// ============ UTILITIES ============
function showAlert(message, type = 'info') {
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    const container = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    alertDiv.innerHTML = alertHTML;
    container.appendChild(alertDiv);

    // Auto remove after 4 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 4000);
}

async function loadAdminReceipts() {
    try {
        console.log('Loading admin receipts...');

        // Get all users
        const usersResponse = await fetch(`${API_URL}/users`, {
            credentials: 'include'
        });

        if (!usersResponse.ok) {
            throw new Error('Failed to fetch users');
        }

        const users = await usersResponse.json();
        console.log('Users fetched:', users);

        // Get all tenants
        const tenantsResponse = await fetch(`${API_URL}/tenants`, {
            credentials: 'include'
        });

        if (!tenantsResponse.ok) {
            throw new Error('Failed to fetch tenants');
        }

        const tenants = await tenantsResponse.json();
        console.log('Tenants fetched:', tenants);

        // Get all payments
        const paymentsResponse = await fetch(`${API_URL}/payments`, {
            credentials: 'include'
        });

        if (!paymentsResponse.ok) {
            throw new Error('Failed to fetch payments');
        }

        const payments = await paymentsResponse.json();
        console.log('Payments fetched:', payments);

        // Get all rooms
        const roomsResponse = await fetch(`${API_URL}/rooms`, {
            credentials: 'include'
        });

        if (!roomsResponse.ok) {
            throw new Error('Failed to fetch rooms');
        }

        const rooms = await roomsResponse.json();
        console.log('Rooms fetched:', rooms);

        const tableBody = document.getElementById('adminReceiptsTableBody');
        if (!tableBody) {
            console.error('adminReceiptsTableBody not found');
            return;
        }

        tableBody.innerHTML = '';

        // Filter to show only TENANT users
        const tenantUsers = users.filter(user => user.role === 'TENANT');

        if (!tenantUsers || tenantUsers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No tenants found</td></tr>';
            return;
        }

        // For each tenant, show their latest payment
        tenantUsers.forEach((user) => {
            // Find tenant record
            const tenantRecord = tenants.find(t => t.user_id === user.id);

            if (!tenantRecord) return; // Skip if no tenant record

            // Find tenant's payments
            const tenantPayments = payments.filter(p => p.tenant_id === tenantRecord.id);

            // Get latest payment
            const latestPayment = tenantPayments.length > 0 ? tenantPayments[tenantPayments.length - 1] : null;

            let roomNo = 'N/A';
            let roomType = 'N/A';
            let rent = 0;

            // Find room
            const room = rooms.find(r => r.id === tenantRecord.room_id);
            if (room) {
                roomNo = room.room_no;
                roomType = room.room_type;
                rent = room.rent;
            }

            const statusBadge = latestPayment && latestPayment.paid
                ? '<span class="badge bg-success">✓ PAID</span>'
                : '<span class="badge bg-warning">✗ PENDING</span>';

            const downloadBtn = latestPayment
                ? `<button class="btn btn-sm btn-primary" onclick="downloadAdminReceipt(${latestPayment.id}, '${tenantRecord.name}', '${user.email}', '${tenantRecord.phone}', 'Room ${roomNo}', ${latestPayment.amount}, '${latestPayment.month}')">
                     <i class="fas fa-download"></i> Download
                   </button>`
                : '<span class="text-muted">No Payment</span>';

            const row = `
                <tr>
                    <td><strong>${tenantRecord.name}</strong></td>
                    <td>${user.email}</td>
                    <td>${tenantRecord.phone}</td>
                    <td>Room ${roomNo} (${roomType})</td>
                    <td>₹${rent}</td>
                    <td>${latestPayment ? latestPayment.month : 'N/A'}</td>
                    <td>${latestPayment ? '₹' + latestPayment.amount : 'N/A'}</td>
                    <td>${latestPayment ? statusBadge : 'N/A'}</td>
                    <td>${downloadBtn}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        console.log('Admin receipts loaded successfully');
    } catch (error) {
        console.error('Error loading admin receipts:', error);
        showAlert('Failed to load receipts: ' + error.message, 'danger');
    }
}

async function downloadAdminReceipt(paymentId, tenantName, tenantEmail, tenantPhone, roomDetails, amount, month) {
    try {
        // Create receipt content
        const receiptContent = `
PG MANAGEMENT SYSTEM - PAYMENT RECEIPT
====================================

Receipt Number: ${paymentId}
Receipt Date: ${new Date().toLocaleDateString()}

ORGANIZATION: PG MANAGEMENT SYSTEM

TENANT DETAILS:
--------------
Name: ${tenantName}
Email: ${tenantEmail}
Phone: ${tenantPhone}

ROOM DETAILS:
-------------
${roomDetails}

PAYMENT DETAILS:
----------------
Payment Month: ${month}
Rent Amount: ₹${amount}
Payment Status: ${amount > 0 ? '✓ PAID' : '✗ PENDING'}
Payment Date: ${new Date().toLocaleDateString()}

====================================
Thank you for your payment!
====================================
        `;

        // Download as text file
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(receiptContent));
        element.setAttribute('download', `Receipt_${paymentId}.txt`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

        showAlert('Receipt downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error downloading receipt:', error);
        showAlert('Error downloading receipt: ' + error.message, 'danger');
    }
}
