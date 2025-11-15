class TallerSystem {
    constructor() {
        // Inicializar servicios
        this.firebaseService = new FirebaseService();
        this.uiManager = new UIManager();
        
        // Inicializar managers
        this.toolManager = new ToolManager(this.firebaseService, this.uiManager);
        this.materialManager = new MaterialManager(this.firebaseService, this.uiManager);
        this.taskManager = new TaskManager(this.firebaseService, this.uiManager);
        this.operationManager = new OperationManager(this.firebaseService, this.uiManager);
        this.userManager = new UserManager(this.firebaseService, this.uiManager);
        
        // Inicializar servicio de autenticación
        this.authService = new AuthService(this.firebaseService, this.uiManager, this.userManager);

        // Variables del sistema
        this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
        this.operationNumber = localStorage.getItem('taller_operation_number') || '';
        this.selectedTool = null;
        
        // Datos
        this.tools = [];
        this.stations = [];
        this.history = [];
        this.colaEspera = [];
        this.materials = [];
        this.tasks = [];
        this.operations = {};
        
        // Variables temporales
        this.currentTaskTools = [];
        this.currentParentModal = null;
        this.unsubscribe = null;
        
        this.init();
    }

    async init() {
        try {
            console.log('🔧 Iniciando sistema...');
            
            // Inicializar Firebase
            await this.firebaseService.init();
            
            // Inicializar autenticación (esto mostrará la pantalla de login si es necesario)
            this.authService.init();
            
            // Configurar event listeners
            this.setupEventListeners();
            this.setupNavigation();
            this.uiManager.setupMobileMenu();
            
            console.log('✅ Sistema inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando sistema:', error);
            this.uiManager.showNotification('Error de conexión con Firebase', 'error');
            this.loadDefaultData();
        }
    }

    // Métodos de autenticación (proxy al AuthService)
    get isLoggedIn() { return this.authService.isLoggedIn; }
    get userName() { return this.authService.userName; }
    get userRole() { return this.authService.userRole; }
    get userIsAdmin() { return this.authService.userIsAdmin; }

    showLoginScreen() { this.authService.showLoginScreen(); }
    logout() { this.authService.logout(); }

    setupEventListeners() {
        // Los event listeners de login están en AuthService
        
        // Event listeners de búsqueda
        document.getElementById('herramientas-search-tool').addEventListener('input', 
            Helpers.debounce(() => this.toolManager.renderToolsInHerramientasSection(), 300)
        );
        
        document.getElementById('materiales-search').addEventListener('input', 
            Helpers.debounce(() => this.materialManager.renderMaterials(), 300)
        );

        // Event listeners para operaciones
        const operacionesSearch = document.getElementById('operaciones-search');
        const operacionesFilter = document.getElementById('operaciones-filter');
        
        if (operacionesSearch) {
            operacionesSearch.addEventListener('input', 
                Helpers.debounce(() => this.operationManager.renderOperacionesList(), 300)
            );
        }
        if (operacionesFilter) {
            operacionesFilter.addEventListener('change', 
                () => this.operationManager.renderOperacionesList()
            );
        }

        // Event listener para añadir tarea
        const addTaskBtn = document.getElementById('add-task-btn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => {
                if (this.authService.requireAuth()) {
                    this.taskManager.showAddTaskModal();
                }
            });
        }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                const page = item.getAttribute('data-page');
                
                // Verificar autenticación para páginas que no sean dashboard
                if (page !== 'dashboard' && !this.authService.requireAuth()) {
                    return;
                }

                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                this.showPage(page);
            });
        });
    }

    showPage(page) {
        this.uiManager.showPage(page);
        
        // Ejecutar renderizado específico de cada página
        switch (page) {
            case 'herramientas':
                this.toolManager.renderToolsInHerramientasSection();
                break;
            case 'materiales':
                this.materialManager.renderMaterials();
                break;
            case 'tareas':
                this.taskManager.renderTasks();
                break;
            case 'operaciones':
                this.operationManager.renderOperacionesPage();
                break;
            case 'en-espera':
                this.renderWaitingQueue();
                this.renderCurrentUsageInOperarios();
                break;
            case 'configuracion':
                this.renderAdminConfiguration();
                break;
            case 'historial':
                this.renderHistoryTable();
                break;
            case 'instrucciones':
                this.uiManager.updateLastSyncTime();
                break;
        }
    }

    // MÉTODOS FIREBASE
    setupRealtimeListener() {
        try {
            this.unsubscribe = this.firebaseService.setupRealtimeListener((data, error) => {
                if (error) {
                    console.error('Error en listener:', error);
                    this.uiManager.showNotification('Error de conexión en tiempo real', 'error');
                    this.loadDefaultData();
                    return;
                }

                if (data) {
                    this.processData(data);
                } else {
                    this.createInitialData();
                }
            });
        } catch (error) {
            console.error('Error configurando listener:', error);
            this.loadDefaultData();
        }
    }

    processData(data) {
        console.log('📥 Procesando datos de Firebase:', data);
        
        // Actualizar datos locales
        this.tools = data.tools || this.getDefaultTools();
        this.stations = data.stations || this.getDefaultStations();
        this.history = data.history || [];
        this.colaEspera = data.colaEspera || [];
        this.materials = data.materials || this.getDefaultMaterials();
        this.tasks = data.tasks || this.getDefaultTasks();
        this.operations = data.operations || this.getDefaultOperations();

        // Actualizar managers
        this.toolManager.setTools(this.tools);
        this.materialManager.setMaterials(this.materials);
        this.taskManager.setTasks(this.tasks);
        this.operationManager.setOperations(this.operations);

        this.renderAll();
        this.uiManager.updateLastSyncTime();
    }

    renderAll() {
        this.renderStations();
        this.renderHistoryTable();
        this.updateStats();
        this.renderWaitingQueue();
        this.toolManager.renderToolsInHerramientasSection();
        this.renderCurrentUsageInOperarios();
        this.materialManager.renderMaterials();
        this.taskManager.renderTasks();
    }

    async createInitialData() {
        try {
            const defaultData = {
                tools: this.getDefaultTools(),
                stations: this.getDefaultStations(),
                history: [],
                colaEspera: [],
                materials: this.getDefaultMaterials(),
                tasks: this.getDefaultTasks(),
                operations: this.getDefaultOperations(),
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await this.firebaseService.saveData(defaultData);
            this.uiManager.showNotification('Datos iniciales creados en Firebase', 'info');
        } catch (error) {
            console.error('Error creando datos:', error);
            this.uiManager.showNotification('Error al crear datos iniciales', 'error');
        }
    }

    async saveData() {
        try {
            console.log('💾 Guardando datos en Firebase...');
            
            const dataToSave = {
                tools: this.tools,
                history: this.history,
                colaEspera: this.colaEspera,
                materials: this.materials,
                tasks: this.tasks,
                operations: this.operations,
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.firebaseService.saveData(dataToSave);
            
            console.log('✅ Datos guardados exitosamente');
            this.uiManager.updateLastSyncTime();
        } catch (error) {
            console.error('❌ Error guardando:', error);
            this.uiManager.showNotification('Error al guardar datos', 'error');
        }
    }

    // DATOS POR DEFECTO
    getDefaultTools() {
        return [
            { id: 1, name: "Llave Dinamométrica M12 56Nm", status: "disponible", operator: "", station: "", icon: "fas fa-tachometer-alt", isTorque: true, location: "estante-1", grupo: "Dinamométricas", numeroSerie: "LD-001" },
            { id: 2, name: "Llave Dinamométrica M10 32Nm", status: "disponible", operator: "", station: "", icon: "fas fa-tachometer-alt", isTorque: true, location: "estante-1", grupo: "Dinamométricas", numeroSerie: "LD-002" },
            { id: 3, name: "Llave Dinamométrica M8 16,2Nm", status: "disponible", operator: "", station: "", icon: "fas fa-tachometer-alt", isTorque: true, location: "estante-2", grupo: "Dinamométricas", numeroSerie: "LD-003" },
            { id: 4, name: "Llave Dinamométrica M6 6,8Nm", status: "disponible", operator: "", station: "", icon: "fas fa-tachometer-alt", isTorque: true, location: "estante-2", grupo: "Dinamométricas", numeroSerie: "LD-004" },
            { id: 5, name: "Destornillador TORX T30", status: "disponible", operator: "", station: "", icon: "fas fa-screwdriver", isTorque: false, location: "estante-3", grupo: "destornilladores", numeroSerie: "" },
            { id: 6, name: "LLave 22", status: "disponible", operator: "", station: "", icon: "fas fa-wrench", isTorque: true, location: "estante-3", grupo: "Llaves", numeroSerie: "" },
            { id: 7, name: "Llave 18", status: "disponible", operator: "", station: "", icon: "fas fa-wrench", isTorque: true, location: "estante-4", grupo: "Llaves", numeroSerie: "" },
            { id: 8, name: "Llave 13", status: "disponible", operator: "", station: "", icon: "fas fa-wrench", isTorque: false, location: "estante-4", grupo: "Llaves", numeroSerie: "" },
        ];
    }

    getDefaultMaterials() {
        return [
            { id: 1, name: "Molycote", code: "MOLY-001", status: "disponible", operator: "", station: "", location: "Estante-a1", minQuantity: 2 },
            { id: 2, name: "Loctite 270", code: "LOC-270", status: "disponible", operator: "", station: "", location: "Estante-b2", minQuantity: 2 },
            { id: 3, name: "Molycote", code: "MOLY-002", status: "agotado", operator: "", station: "", location: "Estante-a1", minQuantity: 2 },
            { id: 4, name: "Loctite 270", code: "LOC-271", status: "disponible", operator: "", station: "", location: "E-b2", minQuantity: 2 }
        ];
    }

    getDefaultTasks() {
        return [
            {
                id: 1,
                name: "Seccionador",
                operationNumber: "150",
                description: "Mantenimiento y calibración de seccionador principal",
                tools: [
                    { numeroSerie: "TQ100-001", name: "Torquímetro 20-100 Nm" },
                    { numeroSerie: "DP-001", name: "Destornillador Plano" }
                ],
                status: 'pendiente',
                assignedTo: 'Operario 1',
                createdAt: new Date().toISOString(),
                startedAt: null,
                completedAt: null
            },
            {
                id: 2,
                name: "Operación 200 - Transformador",
                operationNumber: "200",
                description: "Revisión y mantenimiento de transformador de potencia",
                tools: [
                    { numeroSerie: "LE10-001", name: "Llave Inglesa 10mm" },
                    { numeroSerie: "LI-001", name: "Llave de Impacto" }
                ],
                status: 'pendiente',
                assignedTo: 'Operario 2',
                createdAt: new Date().toISOString(),
                startedAt: null,
                completedAt: null
            }
        ];
    }

    getDefaultStations() {
        return [
            { id: "estacion-0", name: "Estación 0" },
            { id: "estacion-1", name: "Estación 1" },
            { id: "estacion-2", name: "Estación 2" },
            { id: "estacion-3", name: "Estación 3" },
            { id: "estacion-4", name: "Estación 4" },
            { id: "estacion-5", name: "Estación 5" }
        ];
    }

    getDefaultOperations() {
        return {
            'seccionador': {
                id: 'seccionador',
                name: 'Operación Seccionador',
                code: '150',
                description: 'Mantenimiento y calibración de seccionador principal',
                documents: [
                    { name: 'Manual de Procedimiento Completo', type: 'pdf', url: '#' },
                    { name: 'Diagramas Eléctricos', type: 'pdf', url: '#' },
                    { name: 'Lista de Herramientas Requeridas', type: 'pdf', url: '#' }
                ],
                steps: [
                    'Desenergizar el equipo y verificar ausencia de tensión',
                    'Inspeccionar contactos y mecanismos',
                    'Realizar calibración de parámetros',
                    'Verificar funcionamiento de protecciones',
                    'Documentar resultados en formato QA-150'
                ]
            },
            'qb0300': {
                id: 'qb0300',
                name: 'Operación QB0300',
                code: 'QB0300', 
                description: 'Ensamblaje y verificación de componente QB0300',
                documents: [
                    { name: 'Guía de Ensamblaje Paso a Paso', type: 'pdf', url: '#' },
                    { name: 'Lista de Verificación Final', type: 'pdf', url: '#' },
                    { name: 'Especificaciones Técnicas', type: 'pdf', url: '#' }
                ],
                steps: [
                    'Preparar componentes según lista de materiales',
                    'Realizar ensamblaje secuencial etapas 1-5',
                    'Verificar tolerancias y ajustes',
                    'Realizar prueba funcional',
                    'Completar documentación de calidad'
                ]
            }
        };
    }

    loadDefaultData() {
        this.tools = this.getDefaultTools();
        this.stations = this.getDefaultStations();
        this.history = [];
        this.colaEspera = [];
        this.materials = this.getDefaultMaterials();
        this.tasks = this.getDefaultTasks();
        this.operations = this.getDefaultOperations();

        // Actualizar managers
        this.toolManager.setTools(this.tools);
        this.materialManager.setMaterials(this.materials);
        this.taskManager.setTasks(this.tasks);
        this.operationManager.setOperations(this.operations);

        this.renderAll();
    }

    // MÉTODOS AUXILIARES
    getStationName(stationId) {
        const station = this.stations.find(s => s.id === stationId);
        return station ? station.name : 'Desconocida';
    }

    updateStats() {
        const disponible = this.tools.filter(t => t.status === 'disponible').length;
        const enUso = this.tools.filter(t => t.status === 'en-uso').length;
        const mantenimiento = this.tools.filter(t => t.status === 'mantenimiento').length;
        
        const toolsInUseOrMaint = this.tools.filter(t => t.status !== 'disponible').map(t => t.id);
        const enCola = this.colaEspera.filter(item => toolsInUseOrMaint.includes(item.toolId)).length;
        
        this.uiManager.updateStats({
            disponible,
            enUso,
            mantenimiento,
            enCola
        });
    }

    renderStations() {
        const stationsContainer = document.getElementById('stations');
        if (!stationsContainer) return;
        stationsContainer.innerHTML = '';

        this.stations.forEach((station, index) => {
            const toolsInStation = this.tools.filter(tool => 
                tool.status === 'en-uso' && tool.station === station.id
            );

            const stationCard = document.createElement('div');
            stationCard.className = `station-card estacion-${index}`;
            
            let toolsListHTML = toolsInStation.length > 0 ? 
                toolsInStation.map(tool => `
                    <div class="tool-in-station">
                        <i class="${tool.icon}"></i> 
                        <span>${tool.name}</span>
                    </div>
                `).join('') :
                '<p style="color: var(--gray-500); font-size: 0.875rem;">Sin herramientas en uso.</p>';

            stationCard.innerHTML = `
                <i class="fas fa-industry"></i>
                <div class="station-label">${station.name}</div>
                <div class="station-value">${toolsInStation.length}</div>
                <div class="station-label" style="margin-bottom: 0;">Herramientas en Uso</div>
                <div class="station-tools">
                    ${toolsListHTML}
                </div>
            `;
            stationsContainer.appendChild(stationCard);
        });
    }

    renderHistoryTable() {
        const tbody = document.getElementById('history-table-body');
        if (!tbody) return;

        if (this.history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--gray-500);">No hay historial</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        this.history.slice(0, 50).forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.operator}</strong></td>
                <td>${new Date(item.time).toLocaleString()}</td>
                <td>${item.tool}</td>
                <td>${item.numeroSerie || '-'}</td>
                <td>${item.operationNumber || '-'}</td>
                <td>
                    <span class="status-badge ${item.action === 'tomada' ? 'status-in-use' : 'status-available'}">
                        ${item.action}
                    </span>
                </td>
                <td>${item.station}</td>
            `;
            tbody.appendChild(row);
        });
    }

    renderWaitingQueue() {
        const waitingList = document.getElementById('waiting-list');
        if (!waitingList) return;

        const toolsInUseOrMaint = this.tools.filter(t => t.status !== 'disponible').map(t => t.id);
        const colaFiltrada = this.colaEspera.filter(item => toolsInUseOrMaint.includes(item.toolId));

        if (colaFiltrada.length === 0) {
            waitingList.innerHTML = `
                <div class="queue-info-message">
                    <i class="fas fa-check"></i> No hay operarios en espera por herramientas en uso.
                </div>
            `;
            return;
        }

        waitingList.innerHTML = '';
        
        const colaAgrupada = colaFiltrada.reduce((acc, item) => {
            const tool = this.tools.find(t => t.id === item.toolId);
            const key = tool ? tool.name : 'Herramienta Desconocida';
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(item);
            return acc;
        }, {});

        Object.keys(colaAgrupada).forEach(toolName => {
            const groupHeader = document.createElement('h5');
            groupHeader.className = 'queue-group-header';
            groupHeader.innerHTML = `<i class="fas fa-tools"></i> ${toolName}`;
            waitingList.appendChild(groupHeader);
            
            colaAgrupada[toolName].forEach((item, index) => {
                const queueItem = document.createElement('div');
                queueItem.className = 'queue-item';

                const isFirstInLine = index === 0;
                const isCurrentUser = item.operator === this.userName;

                if (isFirstInLine) {
                    queueItem.classList.add('first-in-line');
                }
                if (isCurrentUser) {
                    queueItem.classList.add('current-user');
                }

                const positionHTML = isFirstInLine 
                    ? `<span class="queue-position first">${index + 1}</span>`
                    : `<span class="queue-position">${index + 1}</span>`;
                
                const queueInfo = document.createElement('div');
                queueInfo.className = 'queue-info';
                let indicators = '';
                if (isFirstInLine) {
                    indicators += `<span class="first-in-line-indicator"><i class="fas fa-crown"></i> PRÓXIMO</span>`;
                }
                if (isCurrentUser) {
                    indicators += `<span class="current-user-indicator"><i class="fas fa-user"></i> TÚ</span>`;
                }

                queueInfo.innerHTML = `
                    ${positionHTML}
                    <div style="margin-left: 20px;">
                        <strong>${item.operator}</strong>${indicators}<br>
                        <small>Operación: ${item.operationNumber} - ${this.getStationName(item.station)}</small>
                    </div>
                `;

                const queueActions = document.createElement('div');
                queueActions.className = 'queue-actions';

                if (isCurrentUser) {
                    queueActions.innerHTML = `
                        <button class="btn-cancel-queue" onclick="window.tallerSystem.toolManager.cancelQueueReservation(${item.toolId}, '${item.toolName}')">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    `;
                }

                queueItem.appendChild(queueInfo);
                queueItem.appendChild(queueActions);
                waitingList.appendChild(queueItem);
            });
        });
    }

    renderCurrentUsageInOperarios() {
        const currentUsage = document.getElementById('operarios-current-usage');
        if (!currentUsage) return;
        
        const herramientasEnUso = this.tools.filter(tool => tool.status === 'en-uso');
        
        if (herramientasEnUso.length === 0) {
            currentUsage.innerHTML = `
                <div class="current-usage-item">
                    <div>No hay herramientas en uso</div>
                </div>
            `;
            return;
        }
        
        currentUsage.innerHTML = '';
        
        herramientasEnUso.forEach(tool => {
            const usageItem = document.createElement('div');
            usageItem.className = 'current-usage-item';
            
            const nextInQueue = this.colaEspera.find(item => item.toolId === tool.id);
            let nextInQueueHTML = '';
            if (nextInQueue) {
                nextInQueueHTML = `
                    <span style="font-size: 0.8rem; color: var(--success);">
                        Próximo: <strong>${nextInQueue.operator}</strong>
                    </span>
                `;
            }

            usageItem.innerHTML = `
                <div>
                    <strong>${tool.name}</strong> (${tool.numeroSerie})<br>
                    <small>En uso por: ${tool.operator} - ${this.getStationName(tool.station)}</small>
                </div>
                <div style="text-align: right; margin-top: 5px;">
                    ${nextInQueueHTML}
                </div>
            `;
            currentUsage.appendChild(usageItem);
        });
    }

    renderAdminConfiguration() {
        // Mostrar/ocultar contenido según permisos
        const adminPanel = document.getElementById('admin-access-panel');
        const adminContent = document.getElementById('admin-content');
        
        if (this.userIsAdmin) {
            if (adminPanel) adminPanel.style.display = 'none';
            if (adminContent) adminContent.style.display = 'block';
            this.loadAdminStatistics();
            this.operationManager.renderOperationsManagement();
            this.userManager.renderUsersManagement();
        } else {
            if (adminPanel) adminPanel.style.display = 'block';
            if (adminContent) adminContent.style.display = 'none';
        }
    }

    loadAdminStatistics() {
        document.getElementById('config-tools-count').textContent = this.tools.length;
        document.getElementById('config-materials-count').textContent = this.materials.length;
        document.getElementById('config-users-count').textContent = Object.keys(this.userManager.loginUsers).length;
    }
}

// INICIAR SISTEMA
document.addEventListener('DOMContentLoaded', () => {
    window.tallerSystem = new TallerSystem();
});