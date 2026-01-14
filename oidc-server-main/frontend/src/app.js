// Configuración de la aplicación
const CONFIG = {
    backendUrl: 'http://localhost:4009',
    providerUrl: 'http://localhost:5009'
};

// Elementos del DOM
const statusEl = document.getElementById('status');
const userInfoEl = document.getElementById('user-info');
const actionsEl = document.getElementById('actions');
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userCompanyEl = document.getElementById('user-company');
const userLoginTimeEl = document.getElementById('user-login-time');
const logoutBtn = document.getElementById('logout-btn');
const refreshBtn = document.getElementById('refresh-btn');

// Estado de la aplicación
let currentUser = null;

// Utilidades
function showStatus(message, type = 'loading') {
    statusEl.className = `status ${type}`;
    statusEl.innerHTML = type === 'loading'
        ? `<div class="spinner"></div>${message}`
        : message;
}

function showUserInfo(user) {
    currentUser = user;
    userNameEl.textContent = user.name || 'N/A';
    userEmailEl.textContent = user.email || 'N/A';
    userCompanyEl.textContent = user.companyName || user.companyId || 'N/A';  // ✅ Show name, fallback to ID
    userLoginTimeEl.textContent = user.login_time ? new Date(user.login_time).toLocaleString() : 'N/A';

    userInfoEl.style.display = 'block';
    actionsEl.style.display = 'block';
    statusEl.style.display = 'none';
}

function hideUserInfo() {
    currentUser = null;
    userInfoEl.style.display = 'none';
    actionsEl.style.display = 'none';
    statusEl.style.display = 'block';
}

// Funciones de API
async function checkAuthentication() {
    try {
        showStatus('Verificando autenticación...', 'loading');

        const response = await fetch(`${CONFIG.backendUrl}/api/me`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            let user = null;
            try {
                user = await response.json();
            } catch (parseError) {
                console.error('Failed to parse user info response as JSON:', parseError);
                const rawText = await response.text();
                console.error('Raw response text:', rawText);
                throw new Error('Invalid JSON response from server');
            }
            showStatus('✅ Usuario autenticado correctamente', 'success');
            showUserInfo(user);
        } else if (response.status === 401) {
            showStatus('❌ Usuario no autenticado', 'error');
            hideUserInfo();
            setTimeout(() => {
                window.location.href = `${CONFIG.backendUrl}/auth/login`;
            }, 5000);
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error checking authentication:', error);
        showStatus(`❌ Error de conexión: ${error.message}`, 'error');
        hideUserInfo();
    }
}

async function logout() {
    try {
        showStatus('Cerrando sesión...', 'loading');

        // Primero hacer logout en el backend
        const response = await fetch(`${CONFIG.backendUrl}/auth/logout`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            let data = { redirect_url: window.location.origin };
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Failed to parse logout response as JSON:', parseError);
                const rawText = await response.text();
                console.error('Raw response text:', rawText);
                console.log('Continuing with fallback redirect URL');
            }
            showStatus('✅ Sesión cerrada correctamente', 'success');
            hideUserInfo();

            // Redirect to the URL provided by the backend after a short delay
            setTimeout(() => {
                window.location.href = data.redirect_url || window.location.origin;
            }, 5000);
        } else {
            throw new Error(`Logout failed: ${response.status}`);
        }
    } catch (error) {
        console.error('Error during logout:', error);
        showStatus(`❌ Error al cerrar sesión: ${error.message}`, 'error');
    }
}

async function refreshUserInfo() {
    if (currentUser) {
        await checkAuthentication();
    }
}

// Event listeners
logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
});

refreshBtn.addEventListener('click', (e) => {
    e.preventDefault();
    refreshUserInfo();
});

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Sistema OIDC Frontend iniciado');
    console.log('📡 Backend URL:', CONFIG.backendUrl);
    console.log('🔐 Provider URL:', CONFIG.providerUrl);

    // Verificar autenticación al cargar
    checkAuthentication();

    // Verificar autenticación cada 30 segundos
    setInterval(checkAuthentication, 30000);
});

// Manejo de errores globales
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
    showStatus('❌ Error inesperado en la aplicación', 'error');
});

// Manejo de errores de fetch
window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejection:', event.reason);
    showStatus('❌ Error de conexión con el servidor', 'error');
});
