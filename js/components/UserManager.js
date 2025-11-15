class UserManager {
    constructor(firebaseService, uiManager) {
        this.firebaseService = firebaseService;
        this.uiManager = uiManager;
        this.loginUsers = {};
    }

    setLoginUsers(users) {
        this.loginUsers = users;
    }

    renderUserList() {
        const tbody = document.getElementById('user-list-body');
        if (!tbody) return;
        
        if (!window.tallerSystem.userIsAdmin) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--danger);">Acceso denegado. Solo para administradores.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        Object.keys(this.loginUsers).forEach(userKey => {
            const user = this.loginUsers[userKey];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${userKey}</strong></td>
                <td>${user.role}</td>
                <td>****</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-icon-outline" title="Cambiar Contraseña" onclick="window.tallerSystem.userManager.showChangePasswordModal('${userKey}', '${user.role}')">
                            <i class="fas fa-lock"></i>
                        </button>
                        <button class="btn-icon btn-icon-danger" title="Eliminar Usuario" onclick="window.tallerSystem.userManager.deleteUser('${userKey}', '${user.role}')" ${userKey === 'admin' ? 'disabled title="No se puede eliminar al Administrador principal"' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    showAddUserModal() {
        if (!window.tallerSystem.userIsAdmin) {
            this.uiManager.showNotification('Permiso denegado.', 'error');
            return;
        }

        const modal = ModalService.createFormModal({
            title: '<i class="fas fa-user-plus"></i> Añadir Nuevo Usuario',
            fields: [
                {
                    type: 'text',
                    id: 'new-user-id',
                    label: '<i class="fas fa-user-tag"></i> ID de Usuario',
                    placeholder: 'Ingrese un ID único (Ej: op2)'
                },
                {
                    type: 'text',
                    id: 'new-user-role-name',
                    label: '<i class="fas fa-signature"></i> Nombre del Rol',
                    placeholder: 'Ej: Operario 2'
                },
                {
                    type: 'password',
                    id: 'new-user-password',
                    label: '<i class="fas fa-key"></i> Contraseña Inicial',
                    placeholder: 'Ingrese la contraseña'
                }
            ],
            customContent: `
                <div class="form-group" style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" id="new-user-is-admin" style="width: auto;">
                    <label for="new-user-is-admin" style="margin: 0;"><i class="fas fa-shield-alt"></i> Es Administrador</label>
                </div>
            `,
            onSubmit: this.confirmAddUser.bind(this),
            submitText: 'Guardar Usuario'
        });
    }

    confirmAddUser(formData) {
        const { 'new-user-id': id, 'new-user-role-name': roleName, 'new-user-password': password } = formData;
        const isAdmin = document.getElementById('new-user-is-admin').checked;

        if (!id || !roleName || !password) {
            this.uiManager.showNotification('Todos los campos son obligatorios.', 'error');
            return;
        }
        if (this.loginUsers[id]) {
            this.uiManager.showNotification('Ese ID de usuario ya existe.', 'error');
            return;
        }

        this.loginUsers[id] = {
            password: password,
            role: roleName,
            isAdmin: isAdmin
        };
        localStorage.setItem('taller_login_users', JSON.stringify(this.loginUsers));
        
        this.uiManager.showNotification(`Usuario **${roleName}** añadido.`, 'success');
        this.renderUserList();
    }

    showChangePasswordModal(userId, roleName) {
        if (!window.tallerSystem.userIsAdmin) {
            this.uiManager.showNotification('Permiso denegado.', 'error');
            return;
        }
        
        const modal = ModalService.createFormModal({
            title: '<i class="fas fa-key"></i> Cambiar Contraseña',
            fields: [
                {
                    type: 'password',
                    id: 'new-password',
                    label: '<i class="fas fa-lock"></i> Nueva Contraseña',
                    placeholder: 'Ingrese la nueva contraseña'
                }
            ],
            customContent: `<p>Cambiar contraseña para: <strong>${roleName} (${userId})</strong></p>`,
            onSubmit: (formData) => this.handlePasswordChange(userId, roleName, formData),
            submitText: 'Cambiar Contraseña'
        });
    }

    handlePasswordChange(userId, roleName, formData) {
        const newPassword = formData['new-password'];
        if (newPassword.length < 4) {
            this.uiManager.showNotification('La contraseña debe tener al menos 4 caracteres.', 'error');
            return;
        }
        this.loginUsers[userId].password = newPassword;
        localStorage.setItem('taller_login_users', JSON.stringify(this.loginUsers));
        this.uiManager.showNotification(`Contraseña de **${roleName}** actualizada.`, 'success');
    }

    deleteUser(userId, roleName) {
        if (!window.tallerSystem.userIsAdmin) {
            this.uiManager.showNotification('Permiso denegado.', 'error');
            return;
        }
        if (userId === 'admin') {
            this.uiManager.showNotification('No se puede eliminar al Administrador principal.', 'error');
            return;
        }
        
        ModalService.showConfirmationModal({
            title: 'Eliminar Usuario',
            message: `¿Está seguro de que desea eliminar al usuario ${roleName} (${userId})? Esta acción no se puede deshacer.`,
            confirmText: 'Eliminar',
            onConfirm: () => {
                delete this.loginUsers[userId];
                localStorage.setItem('taller_login_users', JSON.stringify(this.loginUsers));
                this.renderUserList();
                this.uiManager.showNotification(`Usuario **${roleName}** eliminado.`, 'danger');
            }
        });
    }

    renderUsersManagement() {
        const usersList = document.getElementById('users-management-list');
        if (!usersList) return;

        usersList.innerHTML = '';
        
        Object.keys(this.loginUsers).forEach(userId => {
            const user = this.loginUsers[userId];
            const userItem = document.createElement('div');
            userItem.className = 'tool-requirement';
            userItem.innerHTML = `
                <div style="flex: 1;">
                    <strong>${user.role}</strong><br>
                    <small>ID: ${userId} | ${user.isAdmin ? 'Administrador' : 'Operario'}</small>
                </div>
                <div class="action-buttons">
                    <button class="btn-icon btn-icon-outline" title="Cambiar Contraseña" onclick="window.tallerSystem.userManager.showChangePasswordModal('${userId}', '${user.role}')">
                        <i class="fas fa-lock"></i>
                    </button>
                    <button class="btn-icon btn-icon-danger" title="Eliminar" onclick="window.tallerSystem.userManager.deleteUser('${userId}', '${user.role}')" ${userId === 'admin' ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            usersList.appendChild(userItem);
        });
    }
}