class UIManager {
    constructor() {
        this.currentPage = 'dashboard';
    }

    showPage(pageId) {
        // Ocultar todas las secciones
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Mostrar la sección solicitada
        const targetSection = document.getElementById(pageId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentPage = pageId;
        }
        
        // Actualizar navegación activa
        this.updateActiveNav(pageId);
    }

    updateActiveNav(activePage) {
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
            if (nav.getAttribute('data-page') === activePage) {
                nav.classList.add('active');
            }
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;

        notification.className = `notification notification-${type}`;
        notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }

    showLoading(element, message = 'Cargando...') {
        if (element) {
            element.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i> ${message}
                </div>
            `;
        }
    }

    hideLoading(element, content = '') {
        if (element) {
            element.innerHTML = content;
        }
    }

    updateLastSyncTime() {
        const now = new Date().toLocaleTimeString();
        const timeElements = document.querySelectorAll('#update-time, #sidebar-update-time, #herramientas-update, #en-espera-update, #materiales-update, #tareas-update, #operaciones-update');
        
        timeElements.forEach(element => {
            if (element) element.textContent = now;
        });
    }

    setupMobileMenu() {
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');

        if (menuToggle && sidebar && sidebarOverlay) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                sidebarOverlay.classList.toggle('active');
                
                const icon = menuToggle.querySelector('i');
                if (sidebar.classList.contains('open')) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-bars';
                }
            });
            
            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
                if (menuToggle.querySelector('i')) {
                    menuToggle.querySelector('i').className = 'fas fa-bars';
                }
            });
        }
    }

    setupNavigation(navigationHandler) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                if (navigationHandler) {
                    navigationHandler(page);
                } else {
                    this.showPage(page);
                }
            });
        });
    }

    updateUserProfile(userData) {
        const userAvatar = document.getElementById('user-avatar');
        const userNameElement = document.getElementById('user-name');
        const userRoleElement = document.getElementById('user-role');
        const userProfile = document.getElementById('user-profile-logout-btn');

        if (!userAvatar || !userNameElement || !userRoleElement || !userProfile) return;

        if (userData.isLoggedIn) {
            userAvatar.textContent = Helpers.getInitials(userData.name);
            userNameElement.textContent = userData.name;
            userRoleElement.textContent = userData.role;
            userProfile.classList.remove('logged-out');
            userProfile.title = 'Click para cerrar sesión';
        } else {
            userAvatar.textContent = '?';
            userNameElement.textContent = 'Usuario No Autenticado';
            userRoleElement.textContent = 'Invitado';
            userProfile.classList.add('logged-out');
            userProfile.title = 'Debe iniciar sesión';
        }
    }

    updateAdminMenuVisibility(isAdmin) {
        const configItem = document.querySelector('.nav-item[data-page="configuracion"]');
        if (configItem) {
            if (isAdmin) {
                configItem.classList.add('show');
            } else {
                configItem.classList.remove('show');
            }
        }
    }

    updateStats(stats) {
        const elements = {
            'disponible-count': stats.disponible,
            'en-uso-count': stats.enUso,
            'mantenimiento-count': stats.mantenimiento,
            'en-cola-count': stats.enCola
        };

        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = elements[id];
        });

        const sidebarTime = document.getElementById('sidebar-update-time');
        if (sidebarTime) {
            sidebarTime.textContent = new Date().toLocaleTimeString();
        }
    }

    setupSearchHandlers(searchHandlers) {
        // Handler para búsqueda de herramientas
        const herramientasSearch = document.getElementById('herramientas-search-tool');
        if (herramientasSearch && searchHandlers.herramientas) {
            herramientasSearch.addEventListener('input', 
                Helpers.debounce(searchHandlers.herramientas, 300)
            );
        }

        // Handler para búsqueda de materiales
        const materialesSearch = document.getElementById('materiales-search');
        if (materialesSearch && searchHandlers.materiales) {
            materialesSearch.addEventListener('input', 
                Helpers.debounce(searchHandlers.materiales, 300)
            );
        }

        // Handler para búsqueda de operaciones
        const operacionesSearch = document.getElementById('operaciones-search');
        if (operacionesSearch && searchHandlers.operaciones) {
            operacionesSearch.addEventListener('input', 
                Helpers.debounce(searchHandlers.operaciones, 300)
            );
        }
    }

    showLoginScreen() {
        const loginOverlay = document.getElementById('login-overlay');
        const appContainer = document.querySelector('.app-container');
        
        if (loginOverlay) loginOverlay.classList.remove('hidden');
        if (appContainer) appContainer.style.display = 'none';
    }

    hideLoginScreen() {
        const loginOverlay = document.getElementById('login-overlay');
        const appContainer = document.querySelector('.app-container');
        
        if (loginOverlay) loginOverlay.classList.add('hidden');
        if (appContainer) appContainer.style.display = 'grid';
    }
}