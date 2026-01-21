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
    }
}

// Export commonly-used UI functions to the global scope so inline onclick handlers work reliably
try {
    if (typeof window !== 'undefined') {
        if (typeof showRegisterModal !== 'undefined') window.showRegisterModal = showRegisterModal;
        if (typeof registerTenant !== 'undefined') window.registerTenant = registerTenant;
        if (typeof logout !== 'undefined') window.logout = logout;
        if (typeof showSection !== 'undefined') window.showSection = showSection;
        // Some admin functions may be defined elsewhere; attach if present to avoid onclick errors
        if (typeof showAddRoomModal !== 'undefined') window.showAddRoomModal = showAddRoomModal;
        if (typeof showAddTenantModal !== 'undefined') window.showAddTenantModal = showAddTenantModal;
        if (typeof showAddComplaintModal !== 'undefined') window.showAddComplaintModal = showAddComplaintModal;
        if (typeof saveTenant !== 'undefined') window.saveTenant = saveTenant;
        if (typeof saveRoom !== 'undefined') window.saveRoom = saveRoom;
        if (typeof saveComplaint !== 'undefined') window.saveComplaint = saveComplaint;
    }
} catch (e) {
    // ignore
}

// Debug log so you can confirm in browser console that the script initialized
try { console.log('app.js loaded and UI helpers registered'); } catch(e){}
