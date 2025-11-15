class OperationManager {
    constructor(firebaseService, uiManager) {
        this.firebaseService = firebaseService;
        this.uiManager = uiManager;
        this.operations = {};
    }

    setOperations(operations) {
        this.operations = operations;
    }

    renderOperacionesPage() {
        this.uiManager.updateLastSyncTime();
        this.renderOperacionesList();
    }

    renderOperacionesList() {
        const operacionesList = document.getElementById('operaciones-list');
        if (!operacionesList) return;

        // Verificar si hay operaciones
        if (!this.operations || Object.keys(this.operations).length === 0) {
            operacionesList.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--gray-500);">
                    <i class="fas fa-cogs" style="font-size: 4rem; margin-bottom: 1rem;"></i>
                    <h3>No hay operaciones disponibles</h3>
                    <p>El administrador aún no ha configurado operaciones en el sistema.</p>
                </div>
            `;
            return;
        }

        const searchTerm = document.getElementById('operaciones-search').value.toLowerCase();
        const filterValue = document.getElementById('operaciones-filter').value;

        operacionesList.innerHTML = '';

        Object.keys(this.operations).forEach(opKey => {
            const operacion = this.operations[opKey];
            
            // Aplicar filtros
            if (searchTerm && !operacion.name.toLowerCase().includes(searchTerm) && 
                !operacion.description.toLowerCase().includes(searchTerm) &&
                !operacion.code.toLowerCase().includes(searchTerm)) {
                return;
            }

            // Determinar categoría y color
            let categoria = 'general';
            let color = 'var(--secondary)';
            let icono = 'fas fa-cogs';

            if (operacion.name.toLowerCase().includes('seccionador') || operacion.name.toLowerCase().includes('eléctrico')) {
                categoria = 'mantenimiento';
                color = 'var(--warning)';
                icono = 'fas fa-bolt';
            } else if (operacion.name.toLowerCase().includes('ensamblaje') || operacion.name.toLowerCase().includes('qb0300')) {
                categoria = 'ensamblaje';
                color = 'var(--success)';
                icono = 'fas fa-puzzle-piece';
            } else if (operacion.name.toLowerCase().includes('calibración') || operacion.name.toLowerCase().includes('calibracion')) {
                categoria = 'calibracion';
                color = 'var(--accent)';
                icono = 'fas fa-tachometer-alt';
            }

            // Aplicar filtro de categoría
            if (filterValue !== 'todas' && categoria !== filterValue) {
                return;
            }

            // Crear tarjeta de operación
            const operacionCard = document.createElement('div');
            operacionCard.className = 'task-card';
            operacionCard.style.cursor = 'pointer';
            operacionCard.style.borderLeft = `4px solid ${color}`;
            operacionCard.addEventListener('click', () => this.showOperacionDetails(opKey));

            // Verificar si hay tareas activas para esta operación
            const tareasActivas = window.tallerSystem.tasks.filter(task => 
                task.operationNumber === operacion.code && 
                task.status === 'en-progreso'
            ).length;

            operacionCard.innerHTML = `
                <div class="task-header">
                    <div class="task-title">
                        <i class="${icono}" style="color: ${color};"></i> ${operacion.name}
                    </div>
                    <div class="task-status ${tareasActivas > 0 ? 'task-status-en-progreso' : 'task-status-pendiente'}">
                        ${tareasActivas > 0 ? `${tareasActivas} activa(s)` : 'Disponible'}
                    </div>
                </div>
                
                <div class="task-details">
                    <div>
                        <strong>Código:</strong> ${operacion.code}<br>
                        <strong>Categoría:</strong> <span style="color: ${color}; text-transform: capitalize;">${categoria}</span>
                    </div>
                    <div>
                        <strong>Documentos:</strong> ${operacion.documents ? operacion.documents.length : 0}<br>
                        <strong>Pasos:</strong> ${operacion.steps ? operacion.steps.length : 0}
                    </div>
                </div>

                <div style="margin-top: 1rem;">
                    <p style="color: var(--gray-600); font-size: 0.9rem; margin-bottom: 1rem;">
                        ${operacion.description}
                    </p>
                </div>

                <div class="task-actions">
                    <button class="btn-task btn-task-primary" onclick="event.stopPropagation(); window.tallerSystem.operationManager.verInstruccionesOperacion('${opKey}')">
                        <i class="fas fa-file-alt"></i> Ver Instrucciones
                    </button>
                    <button class="btn-task btn-task-success" onclick="event.stopPropagation(); window.tallerSystem.operationManager.crearTareaDesdeOperacion('${opKey}')">
                        <i class="fas fa-play"></i> Iniciar Operación
                    </button>
                </div>
            `;

            operacionesList.appendChild(operacionCard);
        });

        // Si no hay resultados después de filtrar
        if (operacionesList.children.length === 0) {
            operacionesList.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--gray-500);">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>No se encontraron operaciones</h3>
                    <p>Intenta con otros términos de búsqueda o ajusta los filtros.</p>
                </div>
            `;
        }
    }

    verInstruccionesOperacion(operationKey) {
        this.showOperationInstructions(operationKey);
    }

    async crearTareaDesdeOperacion(operationKey) {
        if (!window.tallerSystem.isLoggedIn) {
            this.uiManager.showNotification('Debes iniciar sesión para crear una tarea', 'warning');
            return;
        }

        const operacion = this.operations[operationKey];
        if (!operacion) {
            this.uiManager.showNotification('Operación no encontrada', 'error');
            return;
        }

        // Crear nueva tarea basada en la operación
        const nuevaTarea = {
            id: Date.now(),
            name: operacion.name,
            operationNumber: operacion.code,
            description: operacion.description,
            tools: operacion.herramientasRequeridas || [],
            status: 'pendiente',
            assignedTo: window.tallerSystem.userName,
            createdAt: new Date().toISOString(),
            startedAt: null,
            completedAt: null,
            operacionId: operationKey
        };

        window.tallerSystem.tasks.push(nuevaTarea);
        await window.tallerSystem.saveData();

        this.uiManager.showNotification(`Tarea "${operacion.name}" creada correctamente`, 'success');
        
        // Opcional: Redirigir a la página de tareas
        setTimeout(() => {
            window.tallerSystem.uiManager.showPage('tareas');
        }, 1500);
    }

    showOperacionDetails(operationKey) {
        const operacion = this.operations[operationKey];
        if (!operacion) return;

        const modal = ModalService.createModal({
            title: '<i class="fas fa-info-circle"></i> Detalles de la Operación',
            content: `
                <div style="background: linear-gradient(135deg, var(--secondary), var(--accent)); color: white; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem;">
                    <h2 style="margin: 0; font-size: 1.5rem;">${operacion.name}</h2>
                    <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">Código: ${operacion.code}</p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                    <div>
                        <h4 style="color: var(--primary); margin-bottom: 0.75rem;">Información General</h4>
                        <div style="background: var(--gray-50); padding: 1rem; border-radius: 8px;">
                            <p><strong>Descripción:</strong><br>${operacion.description}</p>
                            <p><strong>Documentos disponibles:</strong> ${operacion.documents ? operacion.documents.length : 0}</p>
                            <p><strong>Pasos definidos:</strong> ${operacion.steps ? operacion.steps.length : 0}</p>
                        </div>
                    </div>

                    <div>
                        <h4 style="color: var(--primary); margin-bottom: 0.75rem;">Acciones Rápidas</h4>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <button class="btn btn-primary" onclick="window.tallerSystem.operationManager.verInstruccionesOperacion('${operationKey}'); ModalService.closeModal(this.closest('.modal-overlay'));">
                                <i class="fas fa-file-alt"></i> Ver Instrucciones Completas
                            </button>
                            <button class="btn btn-success" onclick="window.tallerSystem.operationManager.crearTareaDesdeOperacion('${operationKey}'); ModalService.closeModal(this.closest('.modal-overlay'));">
                                <i class="fas fa-play"></i> Crear Tarea para esta Operación
                            </button>
                            <button class="btn btn-outline" onclick="ModalService.closeModal(this.closest('.modal-overlay'))">
                                <i class="fas fa-times"></i> Cerrar
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 style="color: var(--primary); margin-bottom: 0.75rem;">Pasos Principales</h4>
                    <div style="background: var(--gray-50); padding: 1rem; border-radius: 8px;">
                        ${operacion.steps ? operacion.steps.slice(0, 3).map((step, index) => `
                            <div style="display: flex; align-items: flex-start; margin-bottom: 0.5rem;">
                                <div style="background: var(--secondary); color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; margin-right: 0.75rem; flex-shrink: 0;">
                                    ${index + 1}
                                </div>
                                <span style="font-size: 0.9rem;">${step}</span>
                            </div>
                        `).join('') : '<p>No hay pasos definidos para esta operación.</p>'}
                        ${operacion.steps && operacion.steps.length > 3 ? 
                            `<p style="text-align: center; color: var(--gray-600); margin-top: 0.5rem;">
                                ... y ${operacion.steps.length - 3} pasos más
                            </p>` : ''
                        }
                    </div>
                </div>
            `,
            size: 'large'
        });
    }

    showOperationInstructions(operationType) {
        const operations = {
            'seccionador': {
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

        const operation = operations[operationType];
        if (!operation) return;

        const modal = ModalService.createModal({
            title: `<i class="fas fa-file-alt"></i> ${operation.name}`,
            content: `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                    <!-- Columna izquierda: Información -->
                    <div>
                        <h4 style="color: var(--primary); margin-bottom: 1rem;">Información de la Operación</h4>
                        <div style="background: var(--gray-100); padding: 1rem; border-radius: 8px;">
                            <p><strong>Código:</strong> ${operation.code}</p>
                            <p><strong>Descripción:</strong> ${operation.description}</p>
                            <p><strong>Documentos:</strong> ${operation.documents.length} disponibles</p>
                        </div>

                        <h4 style="color: var(--primary); margin-top: 1.5rem; margin-bottom: 1rem;">Pasos de la Operación</h4>
                        <div style="background: var(--gray-50); padding: 1rem; border-radius: 8px;">
                            ${operation.steps.map((step, index) => `
                                <div style="display: flex; align-items: flex-start; margin-bottom: 0.75rem;">
                                    <div style="background: var(--secondary); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; margin-right: 0.75rem; flex-shrink: 0;">
                                        ${index + 1}
                                    </div>
                                    <span>${step}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Columna derecha: Documentación -->
                    <div>
                        <h4 style="color: var(--primary); margin-bottom: 1rem;">Documentación</h4>
                        <div style="background: var(--gray-100); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                            <p style="margin-bottom: 1rem;">Selecciona un documento para verlo o descargarlo:</p>
                            
                            ${operation.documents.map(doc => `
                                <div class="tool-requirement" style="cursor: pointer; transition: all 0.3s;" onclick="window.tallerSystem.operationManager.openDocument('${doc.url}', '${doc.name}')">
                                    <div class="tool-icon-table" style="background: var(--danger);">
                                        <i class="fas fa-file-pdf"></i>
                                    </div>
                                    <div>
                                        <strong>${doc.name}</strong><br>
                                        <small style="color: var(--gray-600);">Formato PDF</small>
                                    </div>
                                    <div style="margin-left: auto;">
                                        <i class="fas fa-download" style="color: var(--secondary);"></i>
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <!-- Espacio para futuras imágenes -->
                        <h4 style="color: var(--primary); margin-bottom: 1rem;">Imágenes de Referencia</h4>
                        <div style="background: var(--gray-100); padding: 1rem; border-radius: 8px; text-align: center;">
                            <i class="fas fa-images" style="font-size: 2rem; color: var(--gray-400); margin-bottom: 0.5rem;"></i>
                            <p style="color: var(--gray-600);">Las imágenes de referencia se cargarán próximamente</p>
                        </div>
                    </div>
                </div>
            `,
            size: 'xlarge',
            buttons: [
                {
                    text: 'Cerrar',
                    class: 'btn-outline',
                    onclick: 'ModalService.closeModal(this.closest(\'.modal-overlay\'))'
                },
                {
                    text: 'Iniciar esta Operación',
                    class: 'btn-primary',
                    icon: 'fas fa-play',
                    onclick: `window.tallerSystem.operationManager.startOperationFromInstructions('${operationType}')`
                }
            ]
        });
    }

    openDocument(url, docName) {
        if (url === '#') {
            this.uiManager.showNotification(`Documento "${docName}" - La funcionalidad de PDF estará disponible próximamente`, 'info');
        } else {
            window.open(url, '_blank');
        }
    }

    startOperationFromInstructions(operationType) {
        this.uiManager.showNotification(`Iniciando ${operationType} - Redirigiendo a Tareas...`, 'success');
        
        // Cerrar modal
        ModalService.closeAllModals();
        
        // Navegar a la página de tareas
        window.tallerSystem.uiManager.showPage('tareas');
        
        // Aquí podrías automatizar la creación de una tarea relacionada
        setTimeout(() => {
            this.uiManager.showNotification(`Busca la tarea relacionada con ${operationType} en la lista`, 'info');
        }, 1000);
    }

    renderOperationsManagement() {
        const operationsList = document.getElementById('operations-list');
        if (!operationsList) {
            console.log('❌ operations-list no encontrado en el DOM');
            return;
        }

        console.log('🔄 Renderizando operaciones:', this.operations);

        // Verificar si existen operaciones
        if (!this.operations || Object.keys(this.operations).length === 0) {
            console.log('ℹ️ No hay operaciones configuradas');
            operationsList.innerHTML = `
                <div style="text-align: center; padding: 1rem; color: var(--gray-500);">
                    <i class="fas fa-file-alt"></i><br>
                    No hay operaciones configuradas<br>
                    <small>Crea la primera operación usando el botón "Añadir Nueva Operación"</small>
                </div>
            `;
            return;
        }

        operationsList.innerHTML = '';
        
        Object.keys(this.operations).forEach(opKey => {
            const op = this.operations[opKey];
            console.log('📋 Renderizando operación:', op);
            
            const opItem = document.createElement('div');
            opItem.className = 'tool-requirement';
            opItem.innerHTML = `
                <div style="flex: 1;">
                    <strong>${op.name}</strong><br>
                    <small>Código: ${op.code} | ${op.description}</small>
                </div>
                <div class="action-buttons">
                    <button class="btn-icon btn-icon-outline" title="Editar" onclick="window.tallerSystem.operationManager.editOperation('${opKey}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-icon-danger" title="Eliminar" onclick="window.tallerSystem.operationManager.deleteOperation('${opKey}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            operationsList.appendChild(opItem);
        });

        // Actualizar el contador
        const count = Object.keys(this.operations).length;
        document.getElementById('config-operations-count').textContent = count;
        console.log('✅ Operaciones renderizadas:', count);
    }

    showAddOperationModal() {
        if (!window.tallerSystem.userIsAdmin) {
            this.uiManager.showNotification('Acceso denegado. Se requiere permisos de administrador.', 'error');
            return;
        }

        const modal = ModalService.createFormModal({
            title: '<i class="fas fa-plus"></i> Añadir Nueva Operación',
            fields: [
                {
                    type: 'text',
                    id: 'new-op-name',
                    label: 'Nombre de la Operación',
                    placeholder: 'Ej: Operación Transformador'
                },
                {
                    type: 'text',
                    id: 'new-op-code',
                    label: 'Código de Operación',
                    placeholder: 'Ej: 200'
                },
                {
                    type: 'textarea',
                    id: 'new-op-description',
                    label: 'Descripción',
                    placeholder: 'Descripción detallada de la operación...'
                }
            ],
            onSubmit: this.confirmAddOperation.bind(this),
            submitText: 'Crear Operación'
        });
    }

    async confirmAddOperation(formData) {
        const { 'new-op-name': name, 'new-op-code': code, 'new-op-description': description } = formData;

        if (!name || !code) {
            this.uiManager.showNotification('El nombre y código son obligatorios', 'error');
            return;
        }

        console.log('🆕 Creando nueva operación:', { name, code, description });

        // Asegurar que operations existe
        if (!this.operations) {
            console.log('⚠️ Operations no existía, inicializando...');
            this.operations = {};
        }

        // Crear ID único
        const operationId = 'op_' + Date.now();
        const newOperation = {
            id: operationId,
            name: name,
            code: code,
            description: description,
            documents: [
                { name: 'Manual de Procedimiento', type: 'pdf', url: '#' },
                { name: 'Diagramas Técnicos', type: 'pdf', url: '#' }
            ],
            steps: [
                'Paso 1: Preparar el área de trabajo',
                'Paso 2: Revisar herramientas requeridas',
                'Paso 3: Ejecutar procedimiento según especificaciones',
                'Paso 4: Verificar resultados',
                'Paso 5: Documentar el proceso'
            ]
        };

        console.log('📝 Nueva operación a guardar:', newOperation);

        // Añadir a operations
        this.operations[operationId] = newOperation;

        try {
            console.log('💾 Intentando guardar en Firebase...');
            await window.tallerSystem.saveData();
            console.log('✅ Operación guardada exitosamente');
            
            this.uiManager.showNotification(`Operación "${name}" creada correctamente`, 'success');
            this.renderOperationsManagement();
        } catch (error) {
            console.error('❌ Error al guardar operación:', error);
            this.uiManager.showNotification('Error al guardar la operación: ' + error.message, 'error');
        }
    }

    editOperation(operationKey) {
        this.uiManager.showNotification(`Editando operación: ${operationKey}`, 'info');
    }

    deleteOperation(operationKey) {
        if (!window.tallerSystem.userIsAdmin) {
            this.uiManager.showNotification('Acceso denegado.', 'error');
            return;
        }

        if (confirm(`¿Está seguro de que desea eliminar la operación ${operationKey}?`)) {
            this.uiManager.showNotification(`Operación ${operationKey} eliminada`, 'success');
            this.renderOperationsManagement();
        }
    }
}