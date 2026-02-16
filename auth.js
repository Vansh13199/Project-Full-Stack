// ===== Mock Auth System (Frontend Only) =====
const USERS_KEY = 'ams_users';
const CURRENT_USER_KEY = 'ams_current_user';

// ---- Toast Notifications (Tailwind Styled) ----
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');

    // Tailwind classes for toast
    const baseClasses = 'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all transform animate-drop-in min-w-[300px] border-l-4 backdrop-blur-md';
    const typeClasses = {
        success: 'bg-white text-gray-800 border-green-500',
        error: 'bg-white text-gray-800 border-red-500',
        warning: 'bg-white text-gray-800 border-yellow-500'
    };

    const icons = { success: '✓', error: '✕', warning: '⚠' };

    toast.className = `${baseClasses} ${typeClasses[type] || typeClasses.success}`;
    toast.innerHTML = `<span class="text-lg">${icons[type] || ''}</span><span>${message}</span>`;

    container.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ---- Data Management (Mock Database) ----
function getUsers() {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
}

function saveUserToDB(user) {
    const users = getUsers();
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function findUserByEmail(email) {
    const users = getUsers();
    return users.find(u => u.email === email);
}

// ---- Session Management ----
function getCurrentUser() {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
}

function setCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function clearSession() {
    localStorage.removeItem(CURRENT_USER_KEY);
}

function isAuthenticated() {
    return !!getCurrentUser();
}

function getRole() {
    const user = getCurrentUser();
    return user ? user.role : null;
}

// ---- Auth Actions (Simulating API) ----

// Register
async function registerUser(name, email, phone, password, role) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (findUserByEmail(email)) {
        throw new Error('An account with this email already exists.');
    }

    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        phone,
        password,
        role
    };

    saveUserToDB(newUser);
    setCurrentUser(newUser); // Auto-login after register

    return { user: newUser };
}

// Login
async function loginUser(email, password) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const user = findUserByEmail(email);

    if (!user || user.password !== password) {
        throw new Error('Invalid email or password.');
    }

    setCurrentUser(user);
    return { user };
}

// Forgot Password (Call Backend SES)
async function forgotPassword(email) {
    // Check if user exists locally first
    const user = findUserByEmail(email);
    if (!user) {
        throw new Error('No account found with this email.');
    }

    try {
        const response = await fetch('http://localhost:3000/api/send-reset-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to send email');
        }

        return await response.json();
    } catch (error) {
        console.error(error);
        throw new Error('Failed to connect to email service. Is the server running?');
    }
}

// Reset Password (Update Local Storage)
async function resetPassword(email, newPassword) {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay

    const users = getUsers();
    const userIndex = users.findIndex(u => u.email === email);

    if (userIndex === -1) {
        throw new Error('User not found.');
    }

    // Update password
    users[userIndex].password = newPassword;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    return { message: 'Password updated successfully' };
}

// Logout
function logout() {
    clearSession();
    window.location.href = 'login.html';
}

// ---- Route Protection (Updated roles) ----
function requireAuth(allowedRoles = []) {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }

    if (allowedRoles.length > 0) {
        const role = getRole();
        if (!allowedRoles.includes(role)) {
            window.location.href = role === 'Teacher' ? 'admin-dashboard.html' : 'user-dashboard.html';
            return false;
        }
    }

    return true;
}

function redirectIfAuthenticated() {
    if (isAuthenticated()) {
        const role = getRole();
        window.location.href = role === 'Teacher' ? 'admin-dashboard.html' : 'user-dashboard.html';
        return true;
    }
    return false;
}

// ---- UI Helpers ----
function setButtonLoading(btn, loading) {
    if (loading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.innerHTML;
        // Tailwind specific spinner
        btn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Processing...`;
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    }
}

function getUserInitials(name) {
    return name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}
