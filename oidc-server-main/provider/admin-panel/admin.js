// Use relative URLs since admin panel is now served from the same origin
const API_URL = '';

let currentAdmin = null;
let expandedCompanyId = null;
let allCompanies = [];
let currentUserModal = null;
let loadingStates = new Set();

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_URL}/admin-auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    if (response.ok) {
      const data = await response.json();
      currentAdmin = data.admin;
      showAdminDashboard();
    } else {
      const error = await response.json();
      document.getElementById('login-error').textContent = error.error || 'Error al iniciar sesión';
    }
  } catch (error) {
    document.getElementById('login-error').textContent = 'Error al iniciar sesión';
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch(`${API_URL}/admin-auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  showLoginPage();
});

// Show/Hide pages
function showLoginPage() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('admin-page').style.display = 'none';
}

function showAdminDashboard() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('admin-page').style.display = 'block';
  document.getElementById('admin-name').textContent = currentAdmin.full_name;
  loadCompanies();
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Load data for selected tab
    switch (tabName) {
      case 'companies': loadCompanies(); break;
      case 'clients': loadClients(); break;
      case 'users': loadUsers(); break;
      case 'access': loadAccessControl(); break;
      case 'audit': loadAuditLogs(); break;
      case 'stats': loadStatistics(); break;
    }
  });
});

// API calls
async function loadCompanies() {
  try {
    const response = await fetch(`${API_URL}/admin/companies`, { credentials: 'include' });
    const companies = await response.json();
    renderCompaniesTable(companies);
  } catch (error) {
    console.error('Error loading companies:', error);
  }
}

async function loadClients() {
  try {
    const response = await fetch(`${API_URL}/admin/clients`, { credentials: 'include' });
    const clients = await response.json();
    renderClientsTable(clients);
  } catch (error) {
    console.error('Error loading clients:', error);
  }
}

async function loadUsers() {
  try {
    const response = await fetch(`${API_URL}/admin/users`, { credentials: 'include' });
    const users = await response.json();
    renderUsersTable(users);
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

async function loadAuditLogs() {
  try {
    const response = await fetch(`${API_URL}/admin/audit-logs`, { credentials: 'include' });
    const logs = await response.json();
    renderAuditTable(logs);
  } catch (error) {
    console.error('Error loading audit logs:', error);
  }
}

async function loadStatistics() {
  try {
    const response = await fetch(`${API_URL}/admin/statistics`, { credentials: 'include' });
    const stats = await response.json();
    renderStatistics(stats);
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

async function loadAccessControl() {
  try {
    const response = await fetch(`${API_URL}/admin/access/company-client`, { credentials: 'include' });
    const accessList = await response.json();
    renderAccessControlTable(accessList);
  } catch (error) {
    console.error('Error loading access control:', error);
  }
}

// Render companies table with expandable rows
function renderCompaniesTable(companies) {
  allCompanies = companies;
  const tbody = document.querySelector('#companies-table tbody');

  tbody.innerHTML = companies.map(company => `
    <tr class="company-row" data-company-id="${company.company_id}">
      <td>
        <button class="expand-btn" onclick="toggleCompanyExpand('${company.company_id}')">
          <span class="expand-icon">▶</span>
        </button>
      </td>
      <td>${company.company_id}</td>
      <td><strong>${company.company_name}</strong></td>
      <td>
        <span class="status-badge ${company.is_active ? 'status-active' : 'status-inactive'}" 
              onclick="toggleCompanyStatus('${company.company_id}', ${!company.is_active})"
              title="Clic para ${company.is_active ? 'desactivar' : 'activar'}">
          ${company.is_active ? '✓ Activo' : '✗ Inactivo'}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editCompany('${company.company_id}')">Editar</button>
        <button class="btn btn-sm btn-primary" onclick="showAddUserForCompany('${company.company_id}')">Agregar Usuario</button>
        <button class="btn btn-sm btn-danger" onclick="deleteCompany('${company.company_id}')">Eliminar</button>
      </td>
    </tr>
    <tr class="company-users-row" id="users-${company.company_id}" style="display: none;">
      <td colspan="5">
        <div class="users-container">
          <h4>Usuarios de ${company.company_name}</h4>
          <div class="users-loading">Cargando usuarios...</div>
        </div>
      </td>
    </tr>
  `).join('');
}

// Toggle company expansion
async function toggleCompanyExpand(companyId) {
  const usersRow = document.getElementById(`users-${companyId}`);
  const expandIcon = document.querySelector(`[data-company-id="${companyId}"] .expand-icon`);

  if (expandedCompanyId === companyId) {
    // Collapse
    usersRow.style.display = 'none';
    expandIcon.textContent = '▶';
    expandedCompanyId = null;
  } else {
    // Collapse previous if any
    if (expandedCompanyId) {
      document.getElementById(`users-${expandedCompanyId}`).style.display = 'none';
      document.querySelector(`[data-company-id="${expandedCompanyId}"] .expand-icon`).textContent = '▶';
    }

    // Expand new
    usersRow.style.display = 'table-row';
    expandIcon.textContent = '▼';
    expandedCompanyId = companyId;

    // Load users for this company
    await loadCompanyUsers(companyId);
  }
}

// Load users for a specific company
async function loadCompanyUsers(companyId) {
  try {
    const container = document.querySelector(`#users-${companyId} .users-container`);
    container.innerHTML = '<div class="users-loading">Cargando usuarios...</div>';

    const response = await fetch(`${API_URL}/admin/companies/${companyId}/users`, {
      credentials: 'include'
    });
    const users = await response.json();

    if (users.length === 0) {
      container.innerHTML = `
        <h4>Usuarios de ${companyId}</h4>
        <p class="no-users">No se encontraron usuarios para esta empresa.</p>
        <button class="btn btn-primary" onclick="showAddUserForCompany('${companyId}')">Agregar Primer Usuario</button>
      `;
      return;
    }

    container.innerHTML = `
      <h4>Usuarios de ${companyId} (${users.length})</h4>
      <table class="users-subtable">
        <thead>
          <tr>
            <th>Correo Electrónico</th>
            <th>Nombre</th>
            <th>Estado</th>
            <th>Último Inicio de Sesión</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(user => `
            <tr>
              <td>${user.email}</td>
              <td>${user.name}</td>
              <td>
                <span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}" 
                      onclick="toggleUserStatus(${user.id}, ${!user.is_active})"
                      title="Clic para ${user.is_active ? 'desactivar' : 'activar'}">
                  ${user.is_active ? '✓ Activo' : '✗ Inactivo'}
                </span>
              </td>
              <td>${user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Nunca'}</td>
              <td>
                <button class="btn btn-xs btn-primary" onclick="editUser(${user.id}, '${companyId}')">Editar</button>
                <button class="btn btn-xs btn-danger" onclick="deleteUser(${user.id}, '${companyId}')">Eliminar</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Error loading company users:', error);
    document.querySelector(`#users-${companyId} .users-container`).innerHTML =
      '<p class="error">Error al cargar usuarios</p>';
  }
}

// Prevent race conditions on status toggles
async function toggleCompanyStatus(companyId, newStatus) {
  const badgeKey = `company-${companyId}`;
  if (loadingStates.has(badgeKey)) return;

  const confirmed = confirm(
    `¿Está seguro de que desea ${newStatus ? 'activar' : 'desactivar'} esta empresa?\n\n` +
    `${!newStatus ? 'Esto afectará a todos los usuarios de esta empresa.' : ''}`
  );

  if (!confirmed) return;

  loadingStates.add(badgeKey);

  try {
    const response = await fetch(`${API_URL}/admin/companies/${companyId}/toggle-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_active: newStatus })
    });

    if (response.ok) {
      await loadCompanies();
      showNotification(`Empresa ${newStatus ? 'activada' : 'desactivada'} exitosamente`, 'success');
    } else {
      throw new Error('Failed to update status');
    }
  } catch (error) {
    console.error('Error toggling company status:', error);
    showNotification('Error al actualizar estado de empresa', 'error');
  } finally {
    loadingStates.delete(badgeKey);
  }
}

async function toggleUserStatus(userId, newStatus) {
  const badgeKey = `user-${userId}`;
  if (loadingStates.has(badgeKey)) return;

  const action = newStatus ? 'activate' : 'deactivate';
  const message = newStatus
    ? '¿Está seguro de que desea activar este usuario?'
    : '¿Está seguro de que desea desactivar este usuario?\n\nEsto:\n- Revocará todo el acceso al sistema\n- Terminará las sesiones activas\n- Deshabilitará todo el acceso a clientes';

  const confirmed = confirm(message);
  if (!confirmed) return;

  loadingStates.add(badgeKey);

  try {
    const response = await fetch(`${API_URL}/admin/users/${userId}/toggle-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_active: newStatus })
    });

    if (response.ok) {
      if (expandedCompanyId) {
        await loadCompanyUsers(expandedCompanyId);
      }
      showNotification(`Usuario ${action === 'activate' ? 'activado' : 'desactivado'} exitosamente`, 'success');
    } else {
      throw new Error('Failed to update status');
    }
  } catch (error) {
    console.error('Error toggling user status:', error);
    showNotification(`Error al ${action === 'activate' ? 'activar' : 'desactivar'} usuario`, 'error');
  } finally {
    loadingStates.delete(badgeKey);
  }
}

// Company Modal Functions
function showAddCompanyForm() {
  document.getElementById('company-modal-title').textContent = 'Agregar Empresa';
  document.getElementById('company-edit-id').value = '';
  document.getElementById('company-id-display').style.display = 'none';
  document.getElementById('company-name-input').value = '';
  document.getElementById('company-active-input').checked = true;
  showModal('company-modal');
}

function editCompany(companyId) {
  const company = allCompanies.find(c => c.company_id === companyId);
  if (!company) return;

  document.getElementById('company-modal-title').textContent = 'Editar Empresa';
  document.getElementById('company-edit-id').value = company.company_id;
  document.getElementById('company-id-display').style.display = 'block';
  document.getElementById('company-id-display-text').value = company.company_id;
  document.getElementById('company-name-input').value = company.company_name;
  document.getElementById('company-active-input').checked = company.is_active;
  showModal('company-modal');
}

async function deleteCompany(companyId) {
  const company = allCompanies.find(c => c.company_id === companyId);

  // Obtener conteo de usuarios antes de mostrar diálogo
  let userCount = 0;
  try {
    const usersResponse = await fetch(`${API_URL}/admin/companies/${companyId}/users`, {
      credentials: 'include'
    });
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      userCount = users.length;
    }
  } catch (error) {
    console.warn('Could not fetch user count:', error);
  }

  // Construir mensaje de confirmación
  let confirmMessage = `¿Está seguro de que desea eliminar "${company.company_name}"?\n\n`;
  if (userCount > 0) {
    confirmMessage += `⚠️ ADVERTENCIA: Esto eliminará ${userCount} usuario(s) asociado(s) con esta empresa.\n\n`;
    confirmMessage += `Todos los usuarios serán eliminados permanentemente del sistema.\n\n`;
  }
  confirmMessage += 'Esta acción no se puede deshacer.';

  const confirmed = await showConfirmDialog(
    'Eliminar Empresa',
    confirmMessage
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`${API_URL}/admin/companies/${companyId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const result = await response.json();

    if (response.ok && result.success) {
      const successMessage = result.usersDeleted && result.usersDeleted > 0
        ? `Empresa eliminada exitosamente. ${result.usersDeleted} usuario(s) han sido eliminados permanentemente.`
        : 'Empresa eliminada exitosamente';
      showNotification(successMessage, 'success');
      await loadCompanies();
    } else {
      showNotification(result.error || 'Error al eliminar empresa', 'error');
    }
  } catch (error) {
    console.error('Error deleting company:', error);
    showNotification('Error de red. Por favor, intente nuevamente.', 'error');
  }
}

// Password toggle and validation functions
function togglePasswordVisibility(inputId, button) {
  const input = document.getElementById(inputId);
  const icon = button.querySelector('.password-toggle-icon');

  if (input.type === 'password') {
    input.type = 'text';
    icon.textContent = '🙈';
    button.title = 'Ocultar contraseña';
  } else {
    input.type = 'password';
    icon.textContent = '👁️';
    button.title = 'Mostrar contraseña';
  }
}

function validatePasswordMatch() {
  const password = document.getElementById('user-password-input').value;
  const passwordConfirm = document.getElementById('user-password-confirm-input').value;
  const matchMessage = document.getElementById('password-match-message');

  // Only validate if both fields have values
  if (password && passwordConfirm) {
    if (password !== passwordConfirm) {
      matchMessage.style.display = 'block';
      matchMessage.textContent = 'Las contraseñas no coinciden';
      return false;
    } else {
      matchMessage.style.display = 'none';
      return true;
    }
  }

  // If editing and password is empty, don't require confirmation
  const editId = document.getElementById('user-edit-id').value;
  if (editId && !password && !passwordConfirm) {
    matchMessage.style.display = 'none';
    return true;
  }

  return true;
}

// User Modal Functions
async function showAddUserForm() {
  await loadCompaniesDropdown();

  document.getElementById('user-modal-title').textContent = 'Agregar Usuario';
  document.getElementById('user-edit-id').value = '';
  document.getElementById('user-email-input').value = '';
  document.getElementById('user-name-input').value = '';
  document.getElementById('user-password-input').value = '';
  document.getElementById('user-password-input').type = 'password';
  document.getElementById('user-password-input').required = true;
  document.getElementById('user-password-confirm-input').value = '';
  document.getElementById('user-password-confirm-input').type = 'password';
  document.getElementById('user-password-confirm-input').required = true;
  document.getElementById('user-company-select').value = '';
  document.getElementById('user-company-select').disabled = false;
  document.getElementById('user-active-input').checked = true;
  document.getElementById('user-form-error').style.display = 'none';
  document.getElementById('password-match-message').style.display = 'none';

  currentUserModal = null;
  showModal('user-modal');
}

async function showAddUserForCompany(companyId) {
  await loadCompaniesDropdown();

  // Try to find company in allCompanies, but if not found, fetch from dropdown data
  let company = allCompanies.find(c => c.company_id === companyId);

  if (!company) {
    // If not in allCompanies, try to find it from the dropdown data
    try {
      const response = await fetch(`${API_URL}/admin/companies/dropdown/active`, {
        credentials: 'include'
      });
      const dropdownCompanies = await response.json();
      company = dropdownCompanies.find(c => c.company_id === companyId);
    } catch (error) {
      console.error('Error loading companies for dropdown:', error);
    }
  }

  if (!company) {
    showNotification('Empresa no encontrada. Por favor, actualice la página e intente nuevamente.', 'error');
    return;
  }

  document.getElementById('user-modal-title').textContent = `Agregar Usuario a ${company.company_name}`;
  document.getElementById('user-edit-id').value = '';
  document.getElementById('user-email-input').value = '';
  document.getElementById('user-name-input').value = '';
  document.getElementById('user-password-input').value = '';
  document.getElementById('user-password-input').type = 'password';
  document.getElementById('user-password-input').required = true;
  document.getElementById('user-password-confirm-input').value = '';
  document.getElementById('user-password-confirm-input').type = 'password';
  document.getElementById('user-password-confirm-input').required = true;

  // Use company_id from the found company (ensures we have the correct value)
  const actualCompanyId = company.company_id;
  document.getElementById('user-company-select').value = actualCompanyId;
  document.getElementById('user-company-select').disabled = true;
  document.getElementById('user-active-input').checked = true;
  document.getElementById('user-form-error').style.display = 'none';
  document.getElementById('password-match-message').style.display = 'none';

  currentUserModal = { companyId: actualCompanyId };
  showModal('user-modal');
}

async function editUser(userId, companyId) {
  await loadCompaniesDropdown();

  try {
    const response = await fetch(`${API_URL}/admin/users`, { credentials: 'include' });
    const users = await response.json();
    const user = users.find(u => u.id === userId);

    if (!user) {
      showNotification('Usuario no encontrado', 'error');
      return;
    }

    // Get company_id string from companies list
    let companyIdStr = '';
    try {
      const companiesResponse = await fetch(`${API_URL}/admin/companies`, { credentials: 'include' });
      const companies = await companiesResponse.json();
      const company = companies.find(c => c.id === user.company_id);
      if (company) {
        companyIdStr = company.company_id;
      }
    } catch (error) {
      console.error('Error loading companies for edit:', error);
    }

    document.getElementById('user-modal-title').textContent = 'Editar Usuario';
    document.getElementById('user-edit-id').value = user.id;
    document.getElementById('user-email-input').value = user.email;
    document.getElementById('user-name-input').value = user.name;
    document.getElementById('user-password-input').value = '';
    document.getElementById('user-password-input').type = 'password';
    document.getElementById('user-password-input').required = false;
    document.getElementById('user-password-confirm-input').value = '';
    document.getElementById('user-password-confirm-input').type = 'password';
    document.getElementById('user-password-confirm-input').required = false;
    document.getElementById('user-company-select').value = companyIdStr || user.company_id;
    document.getElementById('user-company-select').disabled = false;
    document.getElementById('user-active-input').checked = user.is_active;
    document.getElementById('user-form-error').style.display = 'none';
    document.getElementById('password-match-message').style.display = 'none';

    currentUserModal = { userId, companyId: companyIdStr || companyId };
    showModal('user-modal');
  } catch (error) {
    console.error('Error loading user:', error);
    showNotification('Error al cargar datos del usuario', 'error');
  }
}

async function deleteUser(userId, companyId) {
  const confirmed = await showConfirmDialog(
    'Desactivar Usuario',
    '¿Está seguro de que desea desactivar este usuario?\n\nEsto:\n• Establecerá el usuario como inactivo\n• Revocará todo el acceso a clientes\n• Invalidará todas las sesiones activas\n\nEl usuario puede ser reactivado más tarde si es necesario.'
  );

  if (!confirmed) return;

  // Optionally prompt for a reason
  const reason = prompt('Opcional: Ingrese una razón para la desactivación (para registro de auditoría)');

  try {
    const response = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: reason || 'No reason provided' })
    });

    if (response.ok) {
      const result = await response.json();
      showNotification(result.message || 'Usuario desactivado exitosamente', 'success');
      await loadCompanyUsers(companyId);
    } else {
      const error = await response.json();
      showNotification(error.error || 'Error al desactivar usuario', 'error');
    }
  } catch (error) {
    console.error('Error deactivating user:', error);
    showNotification('Error de red. Por favor, intente nuevamente.', 'error');
  }
}

// Load companies for dropdown
async function loadCompaniesDropdown(selectId = 'user-company-select') {
  try {
    const response = await fetch(`${API_URL}/admin/companies/dropdown/active`, {
      credentials: 'include'
    });
    const companies = await response.json();

    const select = document.getElementById(selectId);
    if (!select) {
      console.error(`Select element with id "${selectId}" not found`);
      return;
    }

    select.innerHTML = '<option value="">Seleccione una empresa...</option>' +
      companies.map(c => `<option value="${c.company_id}">${c.company_name}</option>`).join('');
  } catch (error) {
    console.error('Error loading companies dropdown:', error);
  }
}

// Form submission handlers
document.getElementById('company-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);

  const editId = document.getElementById('company-edit-id').value;
  const companyName = document.getElementById('company-name-input').value.trim();
  const isActive = document.getElementById('company-active-input').checked;

  // Validate company name
  if (!companyName || companyName.length === 0) {
    showNotification('El nombre de la empresa es requerido', 'error');
    setButtonLoading(btn, false);
    return;
  }

  try {
    const url = editId
      ? `${API_URL}/admin/companies/${editId}`
      : `${API_URL}/admin/companies`;

    const method = editId ? 'PUT' : 'POST';

    // For new companies, only send company_name (company_id is auto-generated)
    // For updates, include company_id only to identify which company to update
    const body = editId
      ? { company_name: companyName, is_active: isActive }
      : { company_name: companyName, is_active: isActive };

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });

    if (response.ok) {
      const company = await response.json();
      showNotification(`Empresa ${editId ? 'actualizada' : 'creada'} exitosamente${!editId ? ` (ID: ${company.company_id})` : ''}`, 'success');
      closeCompanyModal();
      await loadCompanies();
    } else {
      const error = await response.json();
      showNotification(error.error || error.message || 'Error al guardar empresa', 'error');
    }
  } catch (error) {
    console.error('Error saving company:', error);
    showNotification('Error de red. Por favor, intente nuevamente.', 'error');
  } finally {
    setButtonLoading(btn, false);
  }
});

document.getElementById('user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);

  const editId = document.getElementById('user-edit-id').value;
  const email = document.getElementById('user-email-input').value.trim();
  const name = document.getElementById('user-name-input').value.trim();
  const password = document.getElementById('user-password-input').value;
  const passwordConfirm = document.getElementById('user-password-confirm-input').value;
  const companyIdStr = document.getElementById('user-company-select').value;
  const isActive = document.getElementById('user-active-input').checked;

  // Validate required fields
  if (!email || !name || !companyIdStr) {
    document.getElementById('user-form-error').textContent = 'Por favor, complete todos los campos requeridos';
    document.getElementById('user-form-error').style.display = 'block';
    setButtonLoading(btn, false);
    return;
  }

  // Validate password for new users
  const isNewUser = !editId;
  if (isNewUser && !password) {
    document.getElementById('user-form-error').textContent = 'La contraseña es requerida al crear un nuevo usuario';
    document.getElementById('user-form-error').style.display = 'block';
    setButtonLoading(btn, false);
    return;
  }

  // Validate password confirmation
  if (password || passwordConfirm) {
    if (password !== passwordConfirm) {
      document.getElementById('user-form-error').textContent = 'Las contraseñas no coinciden';
      document.getElementById('user-form-error').style.display = 'block';
      document.getElementById('password-match-message').style.display = 'block';
      setButtonLoading(btn, false);
      return;
    }
  }

  // companyIdStr is already the company_id (string format like "1", "2", etc.)
  // The backend expects company_id (string), not the numeric id from the table
  // So we can use companyIdStr directly
  const companyId = companyIdStr;

  try {
    const url = editId
      ? `${API_URL}/admin/users/${editId}`
      : `${API_URL}/admin/users`;

    const method = editId ? 'PUT' : 'POST';

    const body = {
      email,
      name,
      company_id: companyId, // Send company_id string (e.g., "1", "2", etc.)
      is_active: isActive
    };

    // Only include password if it's provided (required for new users, optional for edits)
    if (password && password.trim() !== '') {
      body.password = password;
    }

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });

    if (response.ok) {
      showNotification(`Usuario ${editId ? 'actualizado' : 'creado'} exitosamente`, 'success');
      closeUserModal();

      // Reload data based on context
      const activeTab = document.querySelector('.tab.active')?.dataset.tab;

      if (activeTab === 'users') {
        // If we're in the users tab, reload the general users list
        await loadUsers();
      }

      // If user was created from a company view, reload that company's users
      if (currentUserModal && currentUserModal.companyId) {
        await loadCompanyUsers(currentUserModal.companyId);
      } else if (expandedCompanyId) {
        // If a company is expanded, reload its users too
        await loadCompanyUsers(expandedCompanyId);
      }
    } else {
      const error = await response.json();
      const errorMessage = error.message || error.error || (error.details && Array.isArray(error.details) ? error.details.join(', ') : 'Error al guardar usuario');
      document.getElementById('user-form-error').textContent = errorMessage;
      document.getElementById('user-form-error').style.display = 'block';
    }
  } catch (error) {
    console.error('Error saving user:', error);
    document.getElementById('user-form-error').textContent = 'Error de red. Por favor, intente nuevamente.';
    document.getElementById('user-form-error').style.display = 'block';
  } finally {
    setButtonLoading(btn, false);
  }
});

// Helper function to parse URLs from textarea (lines or comma-separated)
function parseUrlsFromTextarea(text) {
  if (!text || text.trim() === '') return [];

  return text
    .split(/[\n,]+/)
    .map(url => url.trim())
    .filter(url => url.length > 0);
}

// Client form submission handler
document.getElementById('client-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);

  const editId = document.getElementById('client-edit-id').value;
  const clientId = document.getElementById('client-id-input').value.trim();
  const clientName = document.getElementById('client-name-input').value.trim();
  const clientSecret = document.getElementById('client-secret-input').value;
  const redirectUrisText = document.getElementById('client-redirect-uris-input').value;
  const postLogoutUrisText = document.getElementById('client-post-logout-uris-input').value;
  const grantTypes = document.getElementById('client-grant-types-input').value.trim();
  const authMethod = document.getElementById('client-auth-method-select').value;
  const frontendUrl = document.getElementById('client-frontend-url-input').value.trim();
  const isActive = document.getElementById('client-active-input').checked;

  // Validate required fields
  if (!clientId || !clientName || !redirectUrisText.trim()) {
    document.getElementById('client-form-error').textContent = 'ID de Cliente, Nombre y URI de Redirección son requeridos';
    document.getElementById('client-form-error').style.display = 'block';
    setButtonLoading(btn, false);
    return;
  }

  // Validate password for new clients
  const isNewClient = !editId;
  if (isNewClient && (!clientSecret || clientSecret.length < 8)) {
    document.getElementById('client-form-error').textContent = 'El secreto del cliente es requerido y debe tener al menos 8 caracteres';
    document.getElementById('client-form-error').style.display = 'block';
    setButtonLoading(btn, false);
    return;
  }

  // Parse URLs
  const redirectUris = parseUrlsFromTextarea(redirectUrisText);
  if (redirectUris.length === 0) {
    document.getElementById('client-form-error').textContent = 'Se requiere al menos una URI de redirección';
    document.getElementById('client-form-error').style.display = 'block';
    setButtonLoading(btn, false);
    return;
  }

  // Validate URLs
  try {
    redirectUris.forEach(url => {
      new URL(url); // Will throw if invalid
    });
  } catch (error) {
    document.getElementById('client-form-error').textContent = 'Formato de URI de redirección inválido. Por favor, use URLs válidas (ej: https://ejemplo.com/auth/callback)';
    document.getElementById('client-form-error').style.display = 'block';
    setButtonLoading(btn, false);
    return;
  }

  const postLogoutUris = parseUrlsFromTextarea(postLogoutUrisText);
  if (postLogoutUris.length > 0) {
    try {
      postLogoutUris.forEach(url => {
        new URL(url);
      });
    } catch (error) {
      document.getElementById('client-form-error').textContent = 'Formato de URI de redirección post-logout inválido';
      document.getElementById('client-form-error').style.display = 'block';
      setButtonLoading(btn, false);
      return;
    }
  }

  try {
    const url = editId
      ? `${API_URL}/admin/clients/${editId}`
      : `${API_URL}/admin/clients`;

    const method = editId ? 'PUT' : 'POST';

    const body = {
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: grantTypes || 'authorization_code',
      token_endpoint_auth_method: authMethod || 'client_secret_post',
      is_active: isActive
    };

    // Only include client_id for new clients (not for updates)
    if (!editId) {
      body.client_id = clientId;
    }

    // Only include client_secret if provided (required for new, optional for edit)
    if (clientSecret && clientSecret.trim() !== '') {
      body.client_secret = clientSecret;
    }

    // Always include post_logout_redirect_uris (can be empty array)
    if (postLogoutUris.length > 0) {
      body.post_logout_redirect_uris = postLogoutUris;
    } else {
      // Include empty array to allow clearing the field
      body.post_logout_redirect_uris = [];
    }

    // frontend_url can be empty string, so always include it if the field exists
    const frontendUrlInput = document.getElementById('client-frontend-url-input');
    if (frontendUrlInput) {
      body.frontend_url = frontendUrlInput.value.trim() || '';
    }

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });

    if (response.ok) {
      const client = await response.json();
      showNotification(`Cliente ${editId ? 'actualizado' : 'creado'} exitosamente`, 'success');
      closeClientModal();
      await loadClients();
    } else {
      const error = await response.json();
      const errorMessage = error.message || error.error || (error.details && Array.isArray(error.details) ? error.details.join(', ') : 'Error al guardar cliente');
      document.getElementById('client-form-error').textContent = errorMessage;
      document.getElementById('client-form-error').style.display = 'block';
    }
  } catch (error) {
    console.error('Error saving client:', error);
    document.getElementById('client-form-error').textContent = 'Error de red. Por favor, intente nuevamente.';
    document.getElementById('client-form-error').style.display = 'block';
  } finally {
    setButtonLoading(btn, false);
  }
});

// Modal utility functions
function showModal(modalId) {
  document.getElementById(modalId).style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeCompanyModal() {
  document.getElementById('company-modal').style.display = 'none';
  document.body.style.overflow = 'auto';
  document.getElementById('company-form').reset();
  document.getElementById('company-id-display').style.display = 'none';
}

function closeUserModal() {
  document.getElementById('user-modal').style.display = 'none';
  document.body.style.overflow = 'auto';
  document.getElementById('user-form').reset();
  document.getElementById('password-match-message').style.display = 'none';
  document.getElementById('user-form-error').style.display = 'none';
  // Reset password fields type to ensure they're hidden when reopening
  document.getElementById('user-password-input').type = 'password';
  document.getElementById('user-password-confirm-input').type = 'password';
  currentUserModal = null;
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Confirmation dialog helper
function showConfirmDialog(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmBtn = document.getElementById('confirm-action-btn');
    const cancelBtn = modal.querySelector('.btn-secondary');

    // Set title and message
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;

    // Remove any existing event listeners by cloning and replacing the button
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    // Set up the confirm button handler
    newConfirmBtn.onclick = () => {
      closeConfirmModal();
      resolve(true);
    };

    // Set up cancel button handler
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    newCancelBtn.onclick = () => {
      closeConfirmModal();
      resolve(false);
    };

    // Show the modal
    showModal('confirm-modal');

    // Close on backdrop click
    const modalClickHandler = (e) => {
      if (e.target === modal) {
        closeConfirmModal();
        resolve(false);
        modal.removeEventListener('click', modalClickHandler);
      }
    };
    modal.addEventListener('click', modalClickHandler);
  });
}

// Button loading state
function setButtonLoading(btn, loading) {
  const textSpan = btn.querySelector('.btn-text');
  const loadingSpan = btn.querySelector('.btn-loading');

  if (loading) {
    textSpan.style.display = 'none';
    loadingSpan.style.display = 'inline';
    btn.disabled = true;
  } else {
    textSpan.style.display = 'inline';
    loadingSpan.style.display = 'none';
    btn.disabled = false;
  }
}

// Notification helper
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Render functions for other tabs (clients, users, audit, stats)
function renderClientsTable(clients) {
  const tbody = document.querySelector('#clients-table tbody');
  tbody.innerHTML = clients.map(client => `
    <tr>
      <td>${client.client_id}</td>
      <td>${client.client_name}</td>
      <td>${client.redirect_uris.join(', ')}</td>
      <td>${client.frontend_url || '<em style="color: #999;">No configurado</em>'}</td>
      <td>${client.is_active ? 'Activo' : 'Inactivo'}</td>
      <td>
        <button class="btn btn-primary" onclick="editClient('${client.client_id}')">Editar</button>
        <button class="btn btn-danger" onclick="deleteClient('${client.client_id}')">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function renderUsersTable(users) {
  const tbody = document.querySelector('#users-table tbody');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No se encontraron usuarios</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${user.email}</td>
      <td>${user.name}</td>
      <td>${user.company_id || '-'}</td>
      <td>
        <span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">
          ${user.is_active ? '✓ Activo' : '✗ Inactivo'}
        </span>
      </td>
      <td>
        <button class="btn btn-xs btn-primary" onclick="editUser(${user.id}, '${user.company_id || ''}')">Editar</button>
        <button class="btn btn-xs btn-danger" onclick="deleteUser(${user.id}, '${user.company_id || ''}')">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function renderAuditTable(logs) {
  const tbody = document.querySelector('#audit-table tbody');
  tbody.innerHTML = logs.map(log => `
    <tr>
      <td>${new Date(log.created_at).toLocaleString()}</td>
      <td>${log.action}</td>
      <td>${log.user_email || log.admin_user_id || '-'}</td>
      <td>${log.details ? JSON.stringify(log.details) : '-'}</td>
      <td>${log.success ? '✅' : '❌'}</td>
    </tr>
  `).join('');
}

function renderStatistics(stats) {
  document.getElementById('stat-companies').textContent = stats.active_companies || 0;
  document.getElementById('stat-clients').textContent = stats.active_clients || 0;
  document.getElementById('stat-users').textContent = stats.active_users || 0;
  document.getElementById('stat-sessions').textContent = stats.active_sessions || 0;
}

function renderAccessControlTable(accessList) {
  const tbody = document.querySelector('#company-access-table tbody');

  if (accessList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 20px; color: #666;">
          No se encontraron entradas de control de acceso. Otorgue acceso empresa-cliente para verlas aquí.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = accessList.map(access => `
    <tr>
      <td>
        <strong>${access.company_name || access.company_id}</strong>
        <br><small style="color: #666;">${access.company_id}</small>
      </td>
      <td>
        <strong>${access.client_name || 'Cliente Desconocido'}</strong>
        <br><small style="color: #666;">ID: ${access.client_id}</small>
      </td>
      <td>
        <span class="status-badge ${access.is_active ? 'status-active' : 'status-inactive'}">
          ${access.is_active ? '✓ Activo' : '✗ Inactivo'}
        </span>
      </td>
      <td>
        <button class="btn btn-xs btn-danger" onclick="revokeAccess('${access.company_id}', '${access.client_id}')">Revocar</button>
        <br><small style="color: #666; margin-top: 5px; display: inline-block;">
          Otorgado por ${access.granted_by_name || 'Desconocido'}<br>
          el ${new Date(access.granted_at).toLocaleDateString() || 'Desconocido'}
        </small>
      </td>
    </tr>
  `).join('');
}

// Load clients for dropdown
async function loadClientsDropdown() {
  try {
    const response = await fetch(`${API_URL}/admin/clients`, { credentials: 'include' });
    const clients = await response.json();

    // Filter for active clients only
    const activeClients = clients.filter(c => c.is_active !== false);

    const select = document.getElementById('grant-client-select');
    select.innerHTML = '<option value="">Seleccione un cliente...</option>' +
      activeClients.map(c => `<option value="${c.client_id}">${c.client_name} (${c.client_id})</option>`).join('');
  } catch (error) {
    console.error('Error loading clients dropdown:', error);
  }
}

// Grant Access Modal Functions
async function showGrantAccessForm() {
  await loadCompaniesDropdown('grant-company-select');
  await loadClientsDropdown();

  document.getElementById('grant-company-select').value = '';
  document.getElementById('grant-client-select').value = '';
  document.getElementById('grant-access-form-error').style.display = 'none';
  showModal('grant-access-modal');
}

function closeGrantAccessModal() {
  document.getElementById('grant-access-modal').style.display = 'none';
  document.body.style.overflow = 'auto';
  document.getElementById('grant-access-form').reset();
  document.getElementById('grant-access-form-error').style.display = 'none';
}

// Grant Access form submission handler
document.getElementById('grant-access-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);

  const companyId = document.getElementById('grant-company-select').value;
  const clientId = document.getElementById('grant-client-select').value;

  // Validate selections
  if (!companyId || !clientId) {
    document.getElementById('grant-access-form-error').textContent = 'Por favor, seleccione una empresa y un cliente';
    document.getElementById('grant-access-form-error').style.display = 'block';
    setButtonLoading(btn, false);
    return;
  }

  try {
    const response = await fetch(`${API_URL}/admin/access/company-client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ company_id: companyId, client_id: clientId })
    });

    if (response.ok) {
      const result = await response.json();
      showNotification(result.message || 'Acceso otorgado exitosamente', 'success');
      closeGrantAccessModal();
      await loadAccessControl();
    } else {
      const error = await response.json();
      const errorMessage = error.error || error.message || 'Error al otorgar acceso';
      document.getElementById('grant-access-form-error').textContent = errorMessage;
      document.getElementById('grant-access-form-error').style.display = 'block';
    }
  } catch (error) {
    console.error('Error granting access:', error);
    document.getElementById('grant-access-form-error').textContent = 'Error de red. Por favor, intente nuevamente.';
    document.getElementById('grant-access-form-error').style.display = 'block';
  } finally {
    setButtonLoading(btn, false);
  }
});

// Access Control Management
async function revokeAccess(companyId, clientId) {
  const confirmed = confirm(
    `¿Está seguro de que desea revocar el acceso de esta empresa a este cliente?\n\n` +
    `Empresa: ${companyId}\n` +
    `ID de Cliente: ${clientId}\n\n` +
    `Esto impedirá que todos los usuarios de esta empresa accedan a este cliente.`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`${API_URL}/admin/access/company-client`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ company_id: companyId, client_id: clientId })
    });

    if (response.ok) {
      showNotification('Acceso revocado exitosamente', 'success');
      await loadAccessControl();
    } else {
      const error = await response.json();
      showNotification(error.error || 'Error al revocar acceso', 'error');
    }
  } catch (error) {
    console.error('Error revoking access:', error);
    showNotification('Error de red. Por favor, intente nuevamente.', 'error');
  }
}

// Client Modal Functions
function showAddClientForm() {
  document.getElementById('client-modal-title').textContent = 'Agregar Cliente';
  document.getElementById('client-edit-id').value = '';
  document.getElementById('client-id-input').value = '';
  document.getElementById('client-id-input').disabled = false;
  document.getElementById('client-name-input').value = '';
  document.getElementById('client-secret-input').value = '';
  document.getElementById('client-redirect-uris-input').value = '';
  document.getElementById('client-post-logout-uris-input').value = '';
  document.getElementById('client-grant-types-input').value = 'authorization_code';
  document.getElementById('client-auth-method-select').value = 'client_secret_post';
  document.getElementById('client-frontend-url-input').value = '';
  document.getElementById('client-active-input').checked = true;
  document.getElementById('client-form-error').style.display = 'none';
  showModal('client-modal');
}

async function editClient(clientId) {
  try {
    const response = await fetch(`${API_URL}/admin/clients`, { credentials: 'include' });
    const clients = await response.json();
    const client = clients.find(c => c.client_id === clientId);

    if (!client) {
      showNotification('Cliente no encontrado', 'error');
      return;
    }

    document.getElementById('client-modal-title').textContent = 'Editar Cliente';
    document.getElementById('client-edit-id').value = client.id || client.client_id;
    document.getElementById('client-id-input').value = client.client_id;
    document.getElementById('client-id-input').disabled = true; // Can't change client_id
    document.getElementById('client-name-input').value = client.client_name || '';
    document.getElementById('client-secret-input').value = ''; // Don't show secret for security
    document.getElementById('client-redirect-uris-input').value = Array.isArray(client.redirect_uris) ? client.redirect_uris.join('\n') : client.redirect_uris || '';
    document.getElementById('client-post-logout-uris-input').value = Array.isArray(client.post_logout_redirect_uris) ? client.post_logout_redirect_uris.join('\n') : client.post_logout_redirect_uris || '';
    document.getElementById('client-grant-types-input').value = Array.isArray(client.grant_types) ? client.grant_types.join(', ') : client.grant_types || 'authorization_code';
    document.getElementById('client-auth-method-select').value = client.token_endpoint_auth_method || 'client_secret_post';
    document.getElementById('client-frontend-url-input').value = client.frontend_url || '';
    document.getElementById('client-active-input').checked = client.is_active !== false;
    document.getElementById('client-form-error').style.display = 'none';
    showModal('client-modal');
  } catch (error) {
    console.error('Error loading client:', error);
    showNotification('Error al cargar datos del cliente', 'error');
  }
}

async function deleteClient(clientId) {
  const confirmed = await showConfirmDialog(
    'Eliminar Cliente',
    `¿Está seguro de que desea eliminar el cliente "${clientId}"?\n\nEsta acción no se puede deshacer y revocará el acceso para todas las empresas que usen este cliente.`
  );

  if (!confirmed) {
    return;
  }

  // Find the delete button to show loading state
  const deleteButtons = document.querySelectorAll(`button[onclick*="deleteClient('${clientId}')"]`);
  const deleteBtn = deleteButtons.length > 0 ? deleteButtons[0] : null;
  
  if (deleteBtn) {
    deleteBtn.disabled = true;
    const originalText = deleteBtn.textContent;
    deleteBtn.textContent = 'Eliminando...';
  }

  try {
    // Find the client to get its ID
    const response = await fetch(`${API_URL}/admin/clients`, { credentials: 'include' });
    
    if (!response.ok) {
      throw new Error('Failed to fetch clients list');
    }
    
    const clients = await response.json();
    const client = clients.find(c => c.client_id === clientId);

    if (!client) {
      showNotification('Cliente no encontrado', 'error');
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = deleteBtn.textContent.replace('Eliminando...', 'Eliminar');
      }
      return;
    }

    // Make DELETE request to backend
    const deleteResponse = await fetch(`${API_URL}/admin/clients/${client.id || client.client_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        reason: 'Deleted via admin panel'
      })
    });

    if (deleteResponse.ok) {
      const result = await deleteResponse.json();
      showNotification(result.message || 'Cliente eliminado exitosamente', 'success');
      await loadClients();
    } else {
      const error = await deleteResponse.json();
      const errorMessage = error.message || error.error || 'Error al eliminar cliente';
      showNotification(errorMessage, 'error');
      console.error('Delete client error:', error);
    }
  } catch (error) {
    console.error('Error deleting client:', error);
    showNotification('Error de red. Por favor, intente nuevamente.', 'error');
  } finally {
    // Restore button state
    if (deleteBtn) {
      deleteBtn.disabled = false;
      deleteBtn.textContent = 'Eliminar';
    }
  }
}

function closeClientModal() {
  document.getElementById('client-modal').style.display = 'none';
  document.body.style.overflow = 'auto';
  document.getElementById('client-form').reset();
  document.getElementById('client-form-error').style.display = 'none';
}


// Real-time password validation listeners
document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById('user-password-input');
  const passwordConfirmInput = document.getElementById('user-password-confirm-input');

  if (passwordInput && passwordConfirmInput) {
    // Validate on input for both fields
    passwordInput.addEventListener('input', validatePasswordMatch);
    passwordConfirmInput.addEventListener('input', validatePasswordMatch);
  }
});

// Check session on load
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch(`${API_URL}/admin-auth/me`, { credentials: 'include' });
    if (response.ok) {
      currentAdmin = await response.json();
      showAdminDashboard();
    } else {
      showLoginPage();
    }
  } catch {
    showLoginPage();
  }
});

