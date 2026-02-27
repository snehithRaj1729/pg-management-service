// PG Management System - Frontend JavaScript

const API_URL = '';
let currentUser = null;
let roomsList = [];
let tenantsList = [];
let paymentsList = [];
let complaintsList = [];

// Lightweight alert helper used by the UI. Appends a dismissible alert to #alertContainer.
function showAlert(message, type='info', timeout=4000) {
    try {
        const container = document.getElementById('alertContainer');
        if (!container) {
            // fallback to console if UI not present yet
            console.log(`[${type}] ${message}`);
            return;
        }
        const div = document.createElement('div');
        div.className = `alert alert-${type} alert-dismissible fade show`;
        div.role = 'alert';
        div.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
        container.appendChild(div);
        if (timeout > 0) setTimeout(() => { try { div.remove(); } catch(e){} }, timeout);
    } catch (e) {
        console.error('showAlert error', e);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Bind the 'Register here' link/button if present (avoids inline onclick global lookup errors)
    const regLink = document.getElementById('registerLink');
    if (regLink) {
        regLink.addEventListener('click', function (e) {
            e.preventDefault();
            try { showRegisterModal(); } catch (err) { console.error('showRegisterModal not available', err); }
        });
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
                room_id: parseInt(roomId),  // Pass room_id so backend can create tenant with the selected room
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

        // If the register endpoint already created a tenant, skip creating it again.
        if (registerData && registerData.tenant_id) {
            console.log('Tenant created by register endpoint. Tenant id:', registerData.tenant_id);
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
    } else if (section === 'payments'){
        loadPayments();
    } else if (section === 'tenantPayments') {
        loadTenantPayments();
    }
}

// ============ DASHBOARD ============
async function loadDashboard() {
    try {
        const roomsResp = await fetch(`${API_URL}/rooms`, { credentials: 'include' });
        const rooms = await roomsResp.json();
        document.getElementById('totalRooms').textContent = rooms.length;

        const tenantsResp = await fetch(`${API_URL}/tenants`, { credentials: 'include' });
        const tenants = await tenantsResp.json();
        document.getElementById('totalTenants').textContent = tenants.length;

        // If the current user is a TENANT, show their due date in the dashboard card
        try {
            if (currentUser && currentUser.role === 'TENANT') {
                // Match by user_id if available, otherwise fallback to matching by email
                const myTenant = tenants.find(t => (currentUser.id && t.user_id === currentUser.id) || (currentUser.email && t.email === currentUser.email));
                const dueElem = document.getElementById('tenantDueDate');
                if (dueElem) {
                    dueElem.textContent = myTenant ? (myTenant.end_date || 'N/A') : 'N/A';
                }
                // Ensure the tenant-only row is visible when a tenant is present
                try {
                    const tenantRow = document.querySelector('.tenant-only');
                    if (tenantRow) {
                        tenantRow.style.display = (myTenant ? 'flex' : 'none');
                    }
                } catch (e) {
                    // ignore
                }
             }
         } catch (e) {
             console.error('Error showing tenant due date:', e);
         }

        // If admin, fetch reminder summary
        if (currentUser && currentUser.role === 'ADMIN') {
            try {
                await fetchReminderSummary();
                await fetchPaymentSummary();
            } catch (e) {
                console.error('Error fetching admin summaries:', e);
            }
        }

        const paymentsResp = await fetch(`${API_URL}/payments`, { credentials: 'include' });
        const payments = await paymentsResp.json();
        const pendingCount = payments.filter(p => !p.paid).length;
        document.getElementById('pendingPayments').textContent = pendingCount;

        const complaintsResp = await fetch(`${API_URL}/complaints`, { credentials: 'include' });
        const complaints = await complaintsResp.json();
        document.getElementById('openComplaints').textContent = complaints.length;
    } catch (error) {
        console.error('Dashboard load error:', error);
        showAlert('Error loading dashboard', 'danger');
    }
}

// Fetch admin reminder summary and populate the dashboard card
async function fetchReminderSummary() {
    try {
        const resp = await fetch(`${API_URL}/admin/reminder-summary`, { credentials: 'include' });
        if (!resp.ok) {
            console.error('Reminder summary request failed', resp.status);
            return;
        }
        const data = await resp.json();
        document.getElementById('leavingTodayCount').textContent = data.leaving_today || 0;
        document.getElementById('upcomingTotalCount').textContent = data.total_upcoming || 0;

        const upcomingList = document.getElementById('upcomingList');
        upcomingList.innerHTML = '';
        if (Array.isArray(data.upcoming) && data.upcoming.length > 0) {
            data.upcoming.forEach(item => {
                const div = document.createElement('div');
                div.innerHTML = `<small>${item.date}: <strong>${item.count}</strong></small>`;
                upcomingList.appendChild(div);
            });
        } else {
            upcomingList.innerHTML = '<small>No upcoming departures in configured range.</small>';
        }
    } catch (e) {
        console.error('Error in fetchReminderSummary:', e);
    }
}

// Fetch admin payment summary and populate the payment dashboard card
async function fetchPaymentSummary() {
    try {
        const resp = await fetch(`${API_URL}/admin/payment-summary`, { credentials: 'include' });
        if (!resp.ok) {
            console.error('Payment summary request failed', resp.status);
            return;
        }
        const data = await resp.json();
        document.getElementById('paymentsDueToday').textContent = data.due_today || 0;
        document.getElementById('paymentsDueSoon').textContent = data.total_upcoming || 0;

        const pendingList = document.getElementById('pendingPaymentsList');
        pendingList.innerHTML = '';
        if (Array.isArray(data.upcoming) && data.upcoming.length > 0) {
            data.upcoming.forEach(item => {
                const div = document.createElement('div');
                div.innerHTML = `<small>${item.date}: <strong>${item.count}</strong> payment(s)</small>`;
                pendingList.appendChild(div);
            });
        } else {
            pendingList.innerHTML = '<small>No pending payments in configured range.</small>';
        }
    } catch (e) {
        console.error('Error in fetchPaymentSummary:', e);
    }
}

// ============ ROOMS ============
function showAddRoomModal() {
    document.getElementById('addRoomForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('addRoomModal'));
    modal.show();
}

async function saveRoom() {
    const roomNo = document.getElementById('roomNo').value;
    const roomType = document.getElementById('roomType').value;
    const roomRent = document.getElementById('roomRent').value;

    if (!roomNo || !roomType || !roomRent) {
        showAlert('Please fill all fields', 'warning');
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
            showAlert('Room added successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addRoomModal')).hide();
            loadRooms();
        } else {
            const data = await response.json();
            showAlert(data.message || 'Failed to add room', 'danger');
        }
    } catch (error) {
        showAlert('Error adding room: ' + error.message, 'danger');
        console.error('Save room error:', error);
    }
}

async function loadRooms() {
    try {
        const response = await fetch(`${API_URL}/rooms`, { credentials: 'include' });
        const rooms = await response.json();
        roomsList = rooms;

        const roomsList_elem = document.getElementById('roomsList');
        roomsList_elem.innerHTML = '';

        rooms.forEach(room => {
            const col = document.createElement('div');
            col.className = 'col-md-6 mb-3';
            const statusBadge = room.status === 'Available' ? '<span class="badge bg-success">Available</span>' : '<span class="badge bg-danger">Occupied</span>';
            col.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Room ${room.room_no}</h5>
                        <p><strong>Type:</strong> ${room.room_type}</p>
                        <p><strong>Rent:</strong> ₹${room.rent}/month</p>
                        <p><strong>Status:</strong> ${statusBadge}</p>
                    </div>
                </div>
            `;
            roomsList_elem.appendChild(col);
        });
    } catch (error) {
        console.error('Load rooms error:', error);
        showAlert('Error loading rooms', 'danger');
    }
}

// ============ TENANTS ============
function showAddTenantModal() {
    document.getElementById('addTenantForm').reset();
    loadRoomsForTenant();
    const modal = new bootstrap.Modal(document.getElementById('addTenantModal'));
    modal.show();
}

async function loadRoomsForTenant() {
    try {
        const response = await fetch(`${API_URL}/rooms`, { credentials: 'include' });
        const rooms = await response.json();
        const roomSelect = document.getElementById('roomSelect');
        roomSelect.innerHTML = '<option value="">Select a Room</option>';

        rooms.filter(r => r.status === 'Available').forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = `Room ${room.room_no} (${room.room_type}) - ₹${room.rent}`;
            roomSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Load rooms error:', error);
    }
}

async function saveTenant() {
    const name = document.getElementById('tenantName').value;
    const email = document.getElementById('tenantEmail').value;
    const phone = document.getElementById('tenantPhone').value;
    const roomId = document.getElementById('roomSelect').value;
    const password = document.getElementById('tenantPassword').value;

    if (!name || !email || !phone || !roomId || !password) {
        showAlert('Please fill all fields', 'warning');
        return;
    }

    try {
        // Step 1: Create user account
        const registerResp = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                email: email,
                password: password,
                name: name,
                phone: phone,
                room_id: parseInt(roomId),
                role: 'TENANT'
            })
        });

        if (!registerResp.ok) {
            const data = await registerResp.json();
            showAlert(data.message || 'Failed to create tenant', 'danger');
            return;
        }

        showAlert('Tenant added successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addTenantModal')).hide();
        loadTenants();
    } catch (error) {
        showAlert('Error adding tenant: ' + error.message, 'danger');
        console.error('Save tenant error:', error);
    }
}

async function loadTenants() {
    try {
        const response = await fetch(`${API_URL}/tenants`, { credentials: 'include' });
        const tenants = await response.json();
        tenantsList = tenants;

        const tbody = document.getElementById('tenantsTableBody');
        tbody.innerHTML = '';

        tenants.forEach(tenant => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tenant.name}</td>
                <td>${tenant.email}</td>
                <td>${tenant.phone}</td>
                <td>Room ${tenant.room_no} (${tenant.room_type})</td>
                <td>₹${tenant.rent}</td>
                <td>${tenant.join_date}</td>
                <td>${tenant.end_date || 'N/A'}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Load tenants error:', error);
        showAlert('Error loading tenants', 'danger');
    }
}

// ============ PAYMENTS ============
async function loadPayments() {
    try {
        const response = await fetch(`${API_URL}/payments`, { credentials: 'include' });
        const payments = await response.json();
        paymentsList = payments;

        const tbody = document.getElementById('paymentsTableBody');
        tbody.innerHTML = '';

        // Get tenants info for display
        const tenantsResp = await fetch(`${API_URL}/tenants`, { credentials: 'include' });
        const tenants = await tenantsResp.json();
        const tenantMap = {};
        tenants.forEach(t => tenantMap[t.id] = t);

        payments.forEach(payment => {
            const tenant = tenantMap[payment.tenant_id] || {};
            const row = document.createElement('tr');
            const statusBadge = payment.paid ? '<span class="badge bg-success">PAID</span>' : '<span class="badge bg-warning">PENDING</span>';
            row.innerHTML = `
                <td>${tenant.name || 'N/A'}</td>
                <td>${tenant.email || 'N/A'}</td>
                <td>${tenant.phone || 'N/A'}</td>
                <td>Room ${tenant.room_no || 'N/A'} (${tenant.room_type || 'N/A'})</td>
                <td>${payment.month}</td>
                <td>₹${payment.amount || 0}</td>
                <td>${statusBadge}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Load payments error:', error);
        showAlert('Error loading payments', 'danger');
    }
}

// Load tenant's own payments
async function loadTenantPayments() {
    try {
        // Get current tenant's ID
        const tenantsResp = await fetch(`${API_URL}/tenants`, { credentials: 'include' });
        const tenants = await tenantsResp.json();
        const currentTenant = tenants.find(t => t.user_id === currentUser.id);

        if (!currentTenant) {
            showAlert('Tenant record not found', 'danger');
            return;
        }

        // Get tenant's payments
        const paymentsResp = await fetch(`${API_URL}/tenants/${currentTenant.id}/payments`, { credentials: 'include' });
        const payments = await paymentsResp.json();

        const tbody = document.getElementById('tenantPaymentsTableBody');
        tbody.innerHTML = '';

        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No payments found</td></tr>';
            return;
        }

        payments.forEach(payment => {
            const row = document.createElement('tr');
            const statusBadge = payment.paid ? '<span class="badge bg-success">PAID</span>' : '<span class="badge bg-warning">PENDING</span>';
            row.innerHTML = `
                <td>${payment.month}</td>
                <td>₹${payment.amount}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="getTenantPaymentQR(${payment.id})">
                        <i class="fas fa-qrcode"></i> QR Code
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Load tenant payments error:', error);
        showAlert('Error loading payments', 'danger');
    }
}

// Get QR code for tenant payment
async function getTenantPaymentQR(paymentId) {
    try {
        const resp = await fetch(`${API_URL}/payments/${paymentId}/qr`, { credentials: 'include' });
        if (!resp.ok) {
            const data = await resp.json();
            showAlert(data.error || 'Failed to get QR code', 'danger');
            return;
        }

        const data = await resp.json();

        // Show modal with QR code
        const modalHtml = `
            <div class="modal fade" id="qrCodeModal" tabindex="-1">
                <div class="modal-dialog modal-sm">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Payment QR Code</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <img src="${data.qr_url}" alt="Payment QR Code" class="img-fluid mb-3">
                            <p><strong>Payment ID:</strong> ${paymentId}</p>
                            <p><small class="text-muted">Scan this QR code to make payment</small></p>
                            <p><a href="${data.payment_url}" target="_blank" class="btn btn-sm btn-primary">
                                <i class="fas fa-external-link-alt"></i> Open Payment Link
                            </a></p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove old modal if exists
        const oldModal = document.getElementById('qrCodeModal');
        if (oldModal) oldModal.remove();

        // Add new modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const qrModal = new bootstrap.Modal(document.getElementById('qrCodeModal'));
        qrModal.show();

        showAlert('QR code generated!', 'success', 2000);
    } catch (error) {
        console.error('Get QR code error:', error);
        showAlert('Error generating QR code: ' + error.message, 'danger');
    }
}

// ============ COMPLAINTS ============
function showAddComplaintModal() {
    document.getElementById('addComplaintForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('addComplaintModal'));
    modal.show();
}

async function saveComplaint() {
    const category = document.getElementById('complaintCategory').value;
    const description = document.getElementById('complaintDesc').value;

    if (!category || !description) {
        showAlert('Please fill all fields', 'warning');
        return;
    }

    try {
        // Get current tenant ID
        const tenantsResp = await fetch(`${API_URL}/tenants`, { credentials: 'include' });
        const tenants = await tenantsResp.json();
        const currentTenant = tenants.find(t => t.user_id === currentUser.id);

        if (!currentTenant) {
            showAlert('You must be a tenant to file a complaint', 'danger');
            return;
        }

        const response = await fetch(`${API_URL}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                tenant_id: currentTenant.id,
                category: category,
                description: description
            })
        });

        if (response.ok) {
            showAlert('Complaint submitted successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addComplaintModal')).hide();
            loadComplaints();
        } else {
            const data = await response.json();
            showAlert(data.message || 'Failed to submit complaint', 'danger');
        }
    } catch (error) {
        showAlert('Error submitting complaint: ' + error.message, 'danger');
        console.error('Save complaint error:', error);
    }
}

async function loadComplaints() {
    try {
        const response = await fetch(`${API_URL}/complaints`, { credentials: 'include' });
        const complaints = await response.json();
        complaintsList = complaints;

        const tbody = document.getElementById('complaintsTableBody');
        tbody.innerHTML = '';

        // Get tenants for mapping
        const tenantsResp = await fetch(`${API_URL}/tenants`, { credentials: 'include' });
        const tenants = await tenantsResp.json();
        const tenantMap = {};
        tenants.forEach(t => tenantMap[t.id] = t.name);

        complaints.forEach(complaint => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tenantMap[complaint.tenant_id] || 'N/A'}</td>
                <td>${complaint.category}</td>
                <td>${complaint.description}</td>
                <td><span class="badge bg-info">${complaint.status}</span></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Load complaints error:', error);
        showAlert('Error loading complaints', 'danger');
    }
}

// ============ ADMIN HELPERS ============
async function sendTestEmail() {
    if (!currentUser || currentUser.role !== 'ADMIN') {
        showAlert('Only admins can send test emails', 'danger');
        return;
    }

    const to = prompt('Enter recipient email for test', currentUser.email || '');
    if (!to) return;

    try {
        const resp = await fetch(`${API_URL}/admin/send-test-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ to_email: to, subject: 'PG Management - Test Email', body: 'This is a test email sent from PG Management.' })
        });

        const data = await resp.json();
        if (resp.ok) {
            showAlert(`Test email ${data.sent ? 'sent' : 'failed'} to ${data.to_email}`, data.sent ? 'success' : 'danger');
        } else {
            showAlert(data.error || 'Failed to send test email', 'danger');
        }
    } catch (err) {
        console.error('sendTestEmail error:', err);
        showAlert('Connection error: ' + err.message, 'danger');
    }
}

async function triggerReminders() {
    if (!currentUser || currentUser.role !== 'ADMIN') {
        showAlert('Only admins can trigger reminders', 'danger');
        return;
    }

    try {
        const resp = await fetch(`${API_URL}/admin/trigger-reminders`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await resp.json();
        console.log('triggerReminders response:', data);
        if (resp.ok) {
            showAlert(`Reminders triggered. ${Array.isArray(data) ? data.length : 0} actions logged (see console).`, 'success', 6000);
        } else {
            showAlert(data.error || 'Failed to trigger reminders', 'danger');
        }
    } catch (err) {
        console.error('triggerReminders error:', err);
        showAlert('Connection error: ' + err.message, 'danger');
    }
}

// ============ LOAD DATA ============
async function loadData() {
    try {
        await loadDashboard();
        if (currentUser.role === 'ADMIN') {
            await loadRooms();
            await loadTenants();
            await loadPayments();
        }
        await loadComplaints();
    } catch (error) {
        console.error('Load data error:', error);
    }
}

// Export commonly-used UI functions to the global scope so inline onclick handlers work reliably
try {
    if (typeof window !== 'undefined') {
        window.showRegisterModal = showRegisterModal;
        window.registerTenant = registerTenant;
        window.logout = logout;
        window.showSection = showSection;
        window.showAddRoomModal = showAddRoomModal;
        window.showAddTenantModal = showAddTenantModal;
        window.showAddComplaintModal = showAddComplaintModal;
        window.saveTenant = saveTenant;
        window.saveRoom = saveRoom;
        window.saveComplaint = saveComplaint;
        window.loadDashboard = loadDashboard;
        window.loadRooms = loadRooms;
        window.loadTenants = loadTenants;
        window.loadPayments = loadPayments;
        window.loadComplaints = loadComplaints;
        window.loadData = loadData;
        window.sendTestEmail = sendTestEmail;
        window.triggerReminders = triggerReminders;
        window.loadTenantPayments = loadTenantPayments;
        window.getTenantPaymentQR = getTenantPaymentQR;
    }
} catch (e) {
    // ignore
}

// Debug log so you can confirm in browser console that the script initialized
try { console.log('app.js loaded and UI helpers registered'); } catch(e){}
