class TaskManager {
    constructor(firebaseService, uiManager) {
        this.firebaseService = firebaseService;
        this.uiManager = uiManager;
        this.tasks = [];
    }

    setTasks(tasks) {
        this.tasks = tasks;
    }

    renderTasks() {
        const tasksList = document.getElementById('tasks-list');
        if (!tasksList) return;

        // Ocultar el botón de añadir tarea
        const addTaskBtn = document.getElementById('add-task-btn');
        if (addTaskBtn) {
            addTaskBtn.style.display = 'none';
        }

        if (this.tasks.length === 0) {
            tasksList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--gray-500);">
                    <i class="fas fa-tasks" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>No hay tareas disponibles en este momento.</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = '';
        
        // Ordenar tareas: pendientes primero, luego en progreso, luego completadas
        const sortedTasks = [...this.tasks].sort((a, b) => {
            const statusOrder = { 'pendiente': 0, 'en-progreso': 1, 'completada': 2 };
            return statusOrder[a.status] - statusOrder[b.status];
        });

        sortedTasks.forEach(task => {
            const taskCard = document.createElement('div');
            taskCard.className = 'task-card';
            
            let statusClass = 'task-status-pendiente';
            let statusText = 'Pendiente';
            
            if (task.status === 'en-progreso') {
                statusClass = 'task-status-en-progreso';
                statusText = 'En Progreso';
            } else if (task.status === 'completada') {
                statusClass = 'task-status-completada';
                statusText = 'Completada';
            }

            let toolsHTML = '';
            if (task.tools && task.tools.length > 0) {
                toolsHTML = `
                    <div class="task-tools">
                        <h4>Herramientas requeridas: ${task.tools.length}</h4>
                        ${task.tools.map(tool => {
                            const toolStatus = this.checkToolAvailability(tool.numeroSerie);
                            return `
                                <div class="tool-requirement">
                                    <div class="tool-status-indicator ${toolStatus.available ? 'tool-status-disponible' : 'tool-status-no-disponible'}"></div>
                                    <div>
                                        <strong>${tool.name}</strong> (Serie: ${tool.numeroSerie})
                                        <br>
                                        <small>${toolStatus.available ? 'Disponible' : 'No disponible'} - ${toolStatus.message}</small>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else {
                toolsHTML = `
                    <div class="task-tools">
                        <h4>Herramientas requeridas: 0</h4>
                        <p style="color: var(--gray-500); text-align: center; padding: 1rem;">
                            No se han seleccionado herramientas para esta tarea.
                        </p>
                    </div>
                `;
            }

            let actionsHTML = '';
            if (task.status === 'pendiente') {
                actionsHTML = `
                    <div class="task-actions">
                        <button class="btn-task btn-task-primary" onclick="window.tallerSystem.taskManager.selectToolsForTask(${task.id})">
                            <i class="fas fa-tools"></i> Seleccionar Herramientas
                        </button>
                        <button class="btn-task btn-task-outline" onclick="window.tallerSystem.taskManager.startTask(${task.id})">
                            <i class="fas fa-play"></i> Iniciar Tarea
                        </button>
                    </div>
                `;
            } else if (task.status === 'en-progreso') {
                actionsHTML = `
                    <div class="task-actions">
                        <button class="btn-task btn-task-success" onclick="window.tallerSystem.taskManager.completeTask(${task.id})">
                            <i class="fas fa-check"></i> Completar Tarea
                        </button>
                        <button class="btn-task btn-task-outline" onclick="window.tallerSystem.taskManager.cancelTask(${task.id})">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                `;
            } else if (task.status === 'completada') {
                actionsHTML = `
                    <div class="task-actions">
                        <button class="btn-task btn-task-outline" onclick="window.tallerSystem.taskManager.deleteTask(${task.id})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                `;
            }

            // Determinar el título basado en el nombre de la tarea
            let titleHTML = task.name;
            if (task.name.includes("Seccionador")) {
                titleHTML = `<i class="fas fa-bolt"></i> ${task.name}`;
            } else if (task.name.includes("Operación")) {
                titleHTML = `<i class="fas fa-cogs"></i> ${task.name}`;
            }

            taskCard.innerHTML = `
                <div class="task-header">
                    <div class="task-title">${titleHTML}</div>
                    <div class="task-status ${statusClass}">${statusText}</div>
                </div>
                <div class="task-details">
                    <div>
                        <strong>Operación:</strong> ${task.operationNumber}<br>
                        <strong>Descripción:</strong> ${task.description}<br>
                        <strong>Tiempo estimado:</strong> 1.45h
                    </div>
                    <div>
                        <strong>Asignado a:</strong> ${task.assignedTo || 'No asignado'}<br>
                        <strong>Herramientas:</strong> ${task.tools ? task.tools.length : 0} requeridas<br>
                        <strong>Prioridad:</strong> <span style="color: var(--warning);">Media</span>
                    </div>
                </div>
                ${toolsHTML}
                ${actionsHTML}
            `;
            
            tasksList.appendChild(taskCard);
        });
    }

    checkToolAvailability(serialNumber) {
        const tool = window.tallerSystem.tools.find(t => t.numeroSerie === serialNumber);
        
        if (!tool) {
            return {
                available: false,
                message: 'Herramienta no encontrada en el inventario'
            };
        }
        
        if (tool.status === 'disponible') {
            return {
                available: true,
                message: 'Disponible para uso'
            };
        } else if (tool.status === 'en-uso') {
            // Verificar si está siendo usada en una tarea
            const taskUsingTool = this.tasks.find(t => 
                t.status === 'en-progreso' && 
                t.tools && 
                t.tools.some(toolItem => toolItem.numeroSerie === serialNumber)
            );
            
            if (taskUsingTool) {
                return {
                    available: false,
                    message: `En uso en tarea: ${taskUsingTool.name}`
                };
            } else {
                return {
                    available: false,
                    message: `En uso por ${tool.operator}`
                };
            }
        } else if (tool.status === 'mantenimiento') {
            return {
                available: false,
                message: 'En mantenimiento'
            };
        }
        
        return {
            available: false,
            message: 'Estado desconocido'
        };
    }

    showAddTaskModal() {
        const modal = ModalService.createFormModal({
            title: '<i class="fas fa-plus"></i> Crear Nueva Tarea',
            fields: [
                {
                    type: 'text',
                    id: 'task-name',
                    label: 'Nombre de la Tarea',
                    placeholder: 'Ej: Operación 150 - Seccionador'
                },
                {
                    type: 'text',
                    id: 'task-operation',
                    label: 'Número de Operación',
                    placeholder: 'Ej: 150',
                    value: '150'
                },
                {
                    type: 'textarea',
                    id: 'task-description',
                    label: 'Descripción',
                    placeholder: 'Descripción detallada de la tarea...'
                },
                {
                    type: 'date',
                    id: 'task-due-date',
                    label: 'Fecha Límite (Opcional)'
                }
            ],
            onSubmit: this.confirmAddTask.bind(this),
            submitText: 'Crear Tarea'
        });
    }

    async confirmAddTask(formData) {
        const { 'task-name': name, 'task-operation': operationNumber, 'task-description': description, 'task-due-date': dueDate } = formData;

        if (!name || !operationNumber) {
            this.uiManager.showNotification('El nombre y número de operación son obligatorios', 'error');
            return;
        }

        const newTask = {
            id: Date.now(),
            name,
            operationNumber,
            description,
            dueDate: dueDate || null,
            tools: [],
            status: 'pendiente',
            assignedTo: window.tallerSystem.userName,
            createdAt: new Date().toISOString(),
            startedAt: null,
            completedAt: null
        };

        this.tasks.push(newTask);
        await window.tallerSystem.saveData();
        this.uiManager.showNotification(`Tarea "${name}" creada correctamente`, 'success');
        this.renderTasks();
    }

    selectToolsForTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const modal = ModalService.createModal({
            title: `<i class="fas fa-tools"></i> Seleccionar Herramientas para: ${task.name}`,
            content: `
                <div class="form-group">
                    <label for="tool-search">Buscar Herramienta</label>
                    <input type="text" id="tool-search" placeholder="Buscar por nombre o número de serie...">
                </div>
                <div style="max-height: 300px; overflow-y: auto; margin-bottom: 1rem;">
                    <table class="tools-table">
                        <thead>
                            <tr>
                                <th>Herramienta</th>
                                <th>Número de Serie</th>
                                <th>Estado</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody id="tool-selection-list">
                            ${window.tallerSystem.tools.map(tool => `
                                <tr>
                                    <td>
                                        <div class="tool-info">
                                            <div class="tool-icon-table">
                                                <i class="${tool.icon}"></i>
                                            </div>
                                            <div class="tool-details">
                                                <div class="tool-name">${tool.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>${tool.numeroSerie}</td>
                                    <td>
                                        <span class="tool-status ${tool.status === 'disponible' ? 'status-available' : tool.status === 'en-uso' ? 'status-in-use' : 'status-maintenance'}">
                                            ${tool.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button class="btn-icon btn-icon-primary" onclick="window.tallerSystem.taskManager.addToolToTask(${taskId}, '${tool.numeroSerie}', '${tool.name.replace(/'/g, "\\'")}')">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="form-group">
                    <label>Herramientas Seleccionadas</label>
                    <div id="selected-tools-list" style="margin-bottom: 1rem;">
                        ${task.tools && task.tools.length > 0 ? 
                            task.tools.map(tool => `
                                <div class="tool-requirement">
                                    <div class="tool-status-indicator tool-status-disponible"></div>
                                    <div>
                                        <strong>${tool.name}</strong> (Serie: ${tool.numeroSerie})
                                    </div>
                                    <button class="btn-icon btn-icon-outline" onclick="window.tallerSystem.taskManager.removeToolFromTask(${taskId}, '${tool.numeroSerie}')" style="margin-left: auto;">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            `).join('') : 
                            '<p style="color: var(--gray-500);">No se han seleccionado herramientas</p>'
                        }
                    </div>
                </div>
            `,
            buttons: [{
                text: 'Cerrar',
                class: 'btn-outline',
                onclick: 'ModalService.closeModal(this.closest(\'.modal-overlay\'))'
            }]
        });

        // Filtro de búsqueda
        const searchInput = modal.querySelector('#tool-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const rows = modal.querySelectorAll('#tool-selection-list tr');
                
                rows.forEach(row => {
                    const toolName = row.querySelector('.tool-name').textContent.toLowerCase();
                    const serialNumber = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
                    
                    if (toolName.includes(searchTerm) || serialNumber.includes(searchTerm)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
        }
    }

    async addToolToTask(taskId, serialNumber, toolName) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Verificar si la herramienta ya está en la lista
        if (task.tools && task.tools.some(tool => tool.numeroSerie === serialNumber)) {
            this.uiManager.showNotification('Esta herramienta ya está en la lista', 'warning');
            return;
        }

        // Inicializar array de herramientas si no existe
        if (!task.tools) {
            task.tools = [];
        }

        // Añadir herramienta a la lista
        task.tools.push({
            numeroSerie: serialNumber,
            name: toolName
        });

        await window.tallerSystem.saveData();
        this.uiManager.showNotification(`Herramienta ${toolName} añadida a la tarea`, 'success');
        this.renderTasks();
        
        // Cerrar y reabrir el modal para actualizar la lista
        ModalService.closeAllModals();
        this.selectToolsForTask(taskId);
    }

    async removeToolFromTask(taskId, serialNumber) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || !task.tools) return;

        const index = task.tools.findIndex(tool => tool.numeroSerie === serialNumber);
        if (index !== -1) {
            task.tools.splice(index, 1);
            await window.tallerSystem.saveData();
            this.uiManager.showNotification('Herramienta removida de la tarea', 'info');
            this.renderTasks();
            
            // Cerrar y reabrir el modal para actualizar la lista
            ModalService.closeAllModals();
            this.selectToolsForTask(taskId);
        }
    }

    async startTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Verificar si hay herramientas asignadas a la tarea
        if (!task.tools || task.tools.length === 0) {
            this.uiManager.showNotification('No se pueden iniciar tareas sin herramientas asignadas', 'warning');
            return;
        }

        // Verificar disponibilidad de herramientas
        const unavailableTools = [];
        task.tools.forEach(tool => {
            const availability = this.checkToolAvailability(tool.numeroSerie);
            if (!availability.available) {
                unavailableTools.push({
                    tool: tool.name,
                    reason: availability.message
                });
            }
        });

        if (unavailableTools.length > 0) {
            let message = 'No se puede iniciar la tarea. Las siguientes herramientas no están disponibles:\n';
            unavailableTools.forEach(tool => {
                message += `- ${tool.tool}: ${tool.reason}\n`;
            });
            
            this.uiManager.showNotification(message, 'error');
            return;
        }

        // Bloquear todas las herramientas de la tarea
        task.tools.forEach(tool => {
            const toolIndex = window.tallerSystem.tools.findIndex(t => t.numeroSerie === tool.numeroSerie);
            if (toolIndex !== -1) {
                window.tallerSystem.tools[toolIndex].status = 'en-uso';
                window.tallerSystem.tools[toolIndex].operator = window.tallerSystem.userName;
                window.tallerSystem.tools[toolIndex].station = 'Tarea: ' + task.name;
                
                // Registrar en el historial
                window.tallerSystem.history.unshift({
                    tool: window.tallerSystem.tools[toolIndex].name,
                    action: 'tomada',
                    operator: window.tallerSystem.userName,
                    operationNumber: task.operationNumber,
                    station: 'Tarea: ' + task.name,
                    time: new Date().toISOString(),
                    numeroSerie: tool.numeroSerie,
                    taskId: task.id,
                    taskName: task.name
                });
            }
        });

        // Actualizar estado de la tarea
        task.status = 'en-progreso';
        task.startedAt = new Date().toISOString();
        task.assignedTo = window.tallerSystem.userName;

        await window.tallerSystem.saveData();
        this.uiManager.showNotification(`Tarea "${task.name}" iniciada - Herramientas bloqueadas`, 'success');
        this.renderTasks();
        window.tallerSystem.toolManager.renderToolsInHerramientasSection();
    }

    async completeTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Liberar todas las herramientas de la tarea
        if (task.tools && task.tools.length > 0) {
            task.tools.forEach(tool => {
                const toolIndex = window.tallerSystem.tools.findIndex(t => t.numeroSerie === tool.numeroSerie);
                if (toolIndex !== -1 && window.tallerSystem.tools[toolIndex].status === 'en-uso') {
                    window.tallerSystem.tools[toolIndex].status = 'disponible';
                    window.tallerSystem.tools[toolIndex].operator = '';
                    window.tallerSystem.tools[toolIndex].station = '';
                    
                    // Registrar en el historial
                    window.tallerSystem.history.unshift({
                        tool: window.tallerSystem.tools[toolIndex].name,
                        action: 'devuelta',
                        operator: window.tallerSystem.userName,
                        operationNumber: task.operationNumber,
                        station: 'Tarea completada: ' + task.name,
                        time: new Date().toISOString(),
                        numeroSerie: tool.numeroSerie,
                        taskId: task.id,
                        taskName: task.name
                    });
                }
            });
        }

        task.status = 'completada';
        task.completedAt = new Date().toISOString();

        await window.tallerSystem.saveData();
        this.uiManager.showNotification(`Tarea "${task.name}" completada - Herramientas liberadas`, 'success');
        this.renderTasks();
        window.tallerSystem.toolManager.renderToolsInHerramientasSection();
    }

    async cancelTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Liberar todas las herramientas de la tarea
        if (task.tools && task.tools.length > 0) {
            task.tools.forEach(tool => {
                const toolIndex = window.tallerSystem.tools.findIndex(t => t.numeroSerie === tool.numeroSerie);
                if (toolIndex !== -1 && window.tallerSystem.tools[toolIndex].status === 'en-uso') {
                    window.tallerSystem.tools[toolIndex].status = 'disponible';
                    window.tallerSystem.tools[toolIndex].operator = '';
                    window.tallerSystem.tools[toolIndex].station = '';
                    
                    // Registrar en el historial
                    window.tallerSystem.history.unshift({
                        tool: window.tallerSystem.tools[toolIndex].name,
                        action: 'devuelta',
                        operator: window.tallerSystem.userName,
                        operationNumber: task.operationNumber,
                        station: 'Tarea cancelada: ' + task.name,
                        time: new Date().toISOString(),
                        numeroSerie: tool.numeroSerie,
                        taskId: task.id,
                        taskName: task.name
                    });
                }
            });
        }

        task.status = 'pendiente';
        task.startedAt = null;
        
        await window.tallerSystem.saveData();
        this.uiManager.showNotification(`Tarea "${task.name}" cancelada - Herramientas liberadas`, 'info');
        this.renderTasks();
        window.tallerSystem.toolManager.renderToolsInHerramientasSection();
    }

    async deleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.tasks = this.tasks.filter(t => t.id !== taskId);
        await window.tallerSystem.saveData();
        this.uiManager.showNotification(`Tarea "${task.name}" eliminada`, 'info');
        this.renderTasks();
    }

    exportTaskData(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const taskData = {
            ...task,
            tools: task.tools.map(tool => {
                const toolInfo = window.tallerSystem.tools.find(t => t.numeroSerie === tool.numeroSerie);
                return {
                    ...tool,
                    toolInfo: toolInfo || null
                };
            })
        };

        const dataStr = JSON.stringify(taskData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `tarea-${task.operationNumber}-${task.name.replace(/\s+/g, '-')}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.uiManager.showNotification(`Datos de la tarea "${task.name}" exportados`, 'success');
    }
}