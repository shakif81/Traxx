class AuthService {
    constructor(firebaseService, uiManager, userManager) {
        this.firebaseService = firebaseService;
        this.uiManager = uiManager;
        this.userManager = userManager;
        this.isLoggedIn = false;
        this.userName = '';
        this.userRole = '';
        this.userIsAdmin = false;
    }

    init() {
        this.setupLoginEventListeners();
        this.checkStoredSession();
    }

    setupLoginEventListeners() {
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.addEventListener('click', () => {
                this.handleLogin();
            });
        }

        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        
        if (usernameInput) {
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }
    }

    checkStoredSession() {
        this.userName = localStorage.getItem('taller_user_name');
        this.userRole = localStorage.getItem('taller_user_role');

        if (this.userName && this.userRole) {
            const userKey = Object.keys(this.userManager.loginUsers).find(key => 
                this.userManager.loginUsers[key].role === this.userName
            );
            this.userIsAdmin = userKey && this.userManager.loginUsers[userKey].isAdmin;
            
            this.isLoggedIn = true;
            this.updateUserProfile();
            this.uiManager.hideLoginScreen();
            this.uiManager.showNotification(`Sesión reanudada: ${this.userName}`, 'info');
            
            // Iniciar listener de Firebase después del login
            if (window.tallerSystem) {
                window.tallerSystem.setupRealtimeListener();
            }
        } else {
            this.showLoginScreen();
        }
    }

    handleLogin() {
        const usernameInput = document.getElementById('login-username').value.toLowerCase();
        const passwordInput = document.getElementById('login-password').value;
        const errorMessage = document.getElementById('login-error-message');
        
        const userLoginData = this.userManager.loginUsers[usernameInput];

        if (userLoginData && userLoginData.password === passwordInput) {
            this.isLoggedIn = true;
            this.userName = userLoginData.role; 
            this.userRole = usernameInput; 
            this.userIsAdmin = userLoginData.isAdmin;
            
            localStorage.setItem('taller_user_name', this.userName);
            localStorage.setItem('taller_user_role', this.userRole);
            
            this.updateUserProfile();
            this.hideLoginScreen();
            this.uiManager.updateAdminMenuVisibility(this.userIsAdmin);
            errorMessage.style.display = 'none';
            this.uiManager.showNotification(`Bienvenido, ${this.userName}`, 'success');
            
            // Iniciar listener de Firebase después del login
            if (window.tallerSystem) {
                window.tallerSystem.setupRealtimeListener();
            }
            
        } else {
            errorMessage.textContent = 'Usuario o contraseña incorrectos.';
            errorMessage.style.display = 'block';
        }
    }

    logout() {
        if (!this.isLoggedIn) return;

        if (window.tallerSystem && window.tallerSystem.unsubscribe) {
            window.tallerSystem.unsubscribe();
        }
        
        localStorage.removeItem('taller_user_name');
        localStorage.removeItem('taller_user_role');
        localStorage.removeItem('taller_operation_number');

        this.isLoggedIn = false;
        this.userName = '';
        this.userRole = '';
        this.userIsAdmin = false;
        
        this.updateUserProfile();
        this.uiManager.updateAdminMenuVisibility(false);
        this.showLoginScreen();
        
        this.uiManager.showNotification('Sesión cerrada correctamente.', 'info');
    }

    showLoginScreen() {
        this.uiManager.showLoginScreen();
        // Limpiar campos de login
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const errorMessage = document.getElementById('login-error-message');
        
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (errorMessage) errorMessage.style.display = 'none';
    }

    hideLoginScreen() {
        this.uiManager.hideLoginScreen();
    }

    updateUserProfile() {
        this.uiManager.updateUserProfile({
            isLoggedIn: this.isLoggedIn,
            name: this.userName,
            role: this.userRole
        });

        // Configurar evento de logout en el perfil de usuario
        const userProfile = document.getElementById('user-profile-logout-btn');
        if (userProfile) {
            userProfile.onclick = () => this.logout();
        }
    }

    requireAuth(callback) {
        if (!this.isLoggedIn) {
            this.uiManager.showNotification('Debe iniciar sesión para realizar esta acción', 'warning');
            return false;
        }
        if (callback) callback();
        return true;
    }

    requireAdmin(callback) {
        if (!this.isLoggedIn) {
            this.uiManager.showNotification('Debe iniciar sesión para realizar esta acción', 'warning');
            return false;
        }
        if (!this.userIsAdmin) {
            this.uiManager.showNotification('Acceso denegado. Se requieren permisos de administrador', 'error');
            return false;
        }
        if (callback) callback();
        return true;
    }
}