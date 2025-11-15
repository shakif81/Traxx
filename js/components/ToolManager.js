class ToolManager {
    constructor(firebaseService, uiManager) {
        this.firebaseService = firebaseService;
        this.uiManager = uiManager;
        this.tools = [];
    }

    setTools(tools) {
        this.tools = tools;
    }

    renderToolsInHerramientasSection(searchTerm = '') {
        const toolList = document.getElementById('herramientas-tool-list');
        if (!toolList) return;

        let filteredTools = this.tools;

        if (searchTerm) {
            filteredTools = Helpers.filterBySearch(this.tools, searchTerm, ['name', 'numeroSerie']);
        }

        // Ordenar herramientas
        filteredTools.sort((a, b) => {
            const isAUserTool = a.operator === window.tallerSystem.userName;
            const isBUserTool = b.operator === window.tallerSystem.userName;

            if (isAUserTool && !isBUserTool) return -1;
            if (!isAUserTool && isBUserTool) return 1;
            if (a.status === 'en-uso' && b.status !== 'en-uso') return -1;
            if (a.status !== 'en-uso' && b.status === 'en-uso') return 1;
            return a.name.localeCompare(b.name);
        });

        if (filteredTools.length === 0) {
            toolList.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--gray-500); padding: 2rem;">No se encontraron herramientas.</td></tr>`;
            return;
        }

        toolList.innerHTML = '';
        
        filteredTools.forEach(tool => {
            const row = document.createElement('tr');
            const isUserTool = tool.operator === window.tallerSystem.userName && tool.status === 'en-uso';

            if (isUserTool) {
                row.style.background = 'linear-gradient(90deg, rgba(45, 116, 218, 0.05) 0%, rgba(255, 255, 255, 1) 50%)';
                row.style.borderLeft = '4px solid var(--secondary)';
            }

            let statusClass = 'status-available';
            let statusText = 'Disponible';
            let statusIcon = 'fas fa-check-circle';
            if (tool.status === 'en-uso') {
                statusClass = 'status-in-use';
                statusText = 'En Uso';
                statusIcon = 'fas fa-user-check';
            } else if (tool.status === 'mantenimiento') {
                statusClass = 'status-maintenance';
                statusText = 'Mantenimiento';
                statusIcon = 'fas fa-toolbox';
            }

            let ubicacionHTML = '';

            if (tool.status === 'en-uso' && tool.station) {
                if (tool.station.startsWith('Tarea: ')) {
                    const taskName = tool.station.replace('Tarea: ', '');
                    ubicacionHTML = `
                        <div class="user-badge" style="background: rgba(245, 158, 11, 0.1); padding: 0.5rem; border-radius: 8px; border: 1px solid var(--warning);">
                            <div class="user-avatar-small" style="background: var(--warning);">${tool.operator.split(' ').map(n => n[0]).join('').toUpperCase()}</div>
                            <span style="color: var(--warning); font-weight: 600;">
                                ${taskName} <span style="color: var(--warning); font-size: 0.7rem; margin-left: 0.5rem;">(EN TAREA)</span>
                            </span>
                        </div>
                    `;
                } else {
                    const stationName = window.tallerSystem.getStationName(tool.station);
                    if (isUserTool) {
                        ubicacionHTML = `
                            <div class="user-badge" style="background: rgba(45, 116, 218, 0.1); padding: 0.5rem; border-radius: 8px; border: 1px solid var(--secondary);">
                                <div class="user-avatar-small" style="background: var(--secondary);">${window.tallerSystem.userName.split(' ').map(n => n[0]).join('').toUpperCase()}</div>
                                <span style="color: var(--secondary); font-weight: 600;">
                                    ${stationName} <span style="color: var(--success); font-size: 0.7rem; margin-left: 0.5rem;">(TÚ)</span>
                                </span>
                            </div>
                        `;
                    } else {
                        ubicacionHTML = `
                            <div class="user-badge">
                                <div class="user-avatar-small">${tool.operator.split(' ').map(n => n[0]).join('').toUpperCase()}</div>
                                <span>${stationName}</span>
                            </div>
                        `;
                    }
                }
            } else if (tool.status === 'mantenimiento') {
                ubicacionHTML = `<span style="color: var(--danger); font-weight: 600;">Taller</span>`;
            } else {
                ubicacionHTML = `<span>${tool.location}</span>`;
            }

            let accionesHTML = '';
            if (tool.status === 'disponible') {
                accionesHTML = `
                    <div class="action-buttons">
                        <button class="btn-icon btn-icon-primary" title="Tomar herramienta" onclick="window.tallerSystem.showTakeToolModal(${tool.id})">
                            <i class="fas fa-hand-paper"></i>
                        </button>
                        <button class="btn-icon btn-icon-outline" title="Ver detalles" onclick="window.tallerSystem.showToolDetailsModal(${tool.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                `;
            } else if (isUserTool) {
                accionesHTML = `
                    <div class="action-buttons">
                        <button class="btn-icon btn-icon-success" title="Devolver herramienta" onclick="window.tallerSystem.showReturnToolModal(${tool.id})">
                            <i class="fas fa-reply"></i>
                        </button>
                        <button class="btn-icon btn-icon-outline" title="Ver detalles" onclick="window.tallerSystem.showToolDetailsModal(${tool.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                `;
            } else if (tool.status === 'en-uso') {
                const userInQueue = window.tallerSystem.colaEspera.some(item => item.toolId === tool.id && item.operator === window.tallerSystem.userName);
                if (!userInQueue) {
                    accionesHTML = `
                        <div class="action-buttons">
                            <button class="btn-icon btn-icon-warning" title="Unirse a la cola" onclick="window.tallerSystem.showJoinQueueModal(${tool.id})">
                                <i class="fas fa-users"></i>
                            </button>
                            <button class="btn-icon btn-icon-outline" title="Ver detalles" onclick="window.tallerSystem.showToolDetailsModal(${tool.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    `;
                } else {
                    const queueItem = window.tallerSystem.colaEspera.find(item => item.toolId === tool.id && item.operator === window.tallerSystem.userName);
                    accionesHTML = `
                        <div class="action-buttons">
                            <button class="btn-icon btn-icon-danger" title="Cancelar reserva en cola" onclick="window.tallerSystem.cancelQueueReservation(${tool.id}, '${tool.name}')">
                                <i class="fas fa-times"></i>
                            </button>
                            <button class="btn-icon btn-icon-outline" title="Ver detalles" onclick="window.tallerSystem.showToolDetailsModal(${tool.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    `;
                }
            } else if (tool.status === 'mantenimiento') {
                accionesHTML = `
                    <div class="action-buttons">
                        <button class="btn-icon btn-icon-outline" title="Ver detalles" onclick="window.tallerSystem.showToolDetailsModal(${tool.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                `;
            }
            
            row.innerHTML = `
                <td>
                    <div class="tool-info">
                        <div class="tool-icon-table">
                            <i class="${tool.icon}"></i>
                        </div>
                        <div class="tool-details">
                            <div class="tool-name" style="${isUserTool ? 'color: var(--secondary); font-weight: 700;' : ''}">
                                ${tool.name} ${isUserTool ? '<span style="color: var(--success); font-size: 0.7rem; margin-left: 0.5rem;">(EN TU PODER)</span>' : ''}
                            </div>
                            <div class="tool-status ${statusClass}">
                                <i class="${statusIcon}"></i> ${statusText}
                            </div>
                        </div>
                    </div>
                </td>
                <td>${tool.numeroSerie}</td>
                <td>${ubicacionHTML}</td>
                <td>${accionesHTML}</td>
            `;
            toolList.appendChild(row);
        });
    }

    showTakeToolModal(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;
        
        if (!window.tallerSystem.isLoggedIn) {
            this.uiManager.showNotification('Debes iniciar sesión para tomar una herramienta.', 'warning');
            return;
        }
        
        const modal = ModalService.createModal({
            title: 'Tomar Herramienta',
            content: `
                <div class="form-group">
                    <label><i class="fas fa-tools"></i> Herramienta seleccionada</label>
                    <div style="padding: 1rem; background: var(--gray-50); border-radius: 8px;">
                        <strong>${tool.name}</strong><br>
                        <small>Serie: ${tool.numeroSerie} | Grupo: ${tool.grupo}</small>
                    </div>
                </div>
                <div class="form-group">
                    <label for="take-operation-number"><i class="fas fa-hashtag"></i> Número de Operación</label>
                    <input type="text" id="take-operation-number" placeholder="Ingrese el número de operación" value="${window.tallerSystem.operationNumber}">
                </div>
                <div class="form-group">
                    <label for="take-station"><i class="fas fa-industry"></i> Estación de Trabajo</label>
                    <select id="take-station">
                        <option value="">Seleccione una estación</option>
                        ${window.tallerSystem.stations.map(station => 
                            `<option value="${station.id}">${station.name}</option>`
                        ).join('')}
                    </select>
                </div>
            `,
            buttons: [
                {
                    text: 'Cancelar',
                    class: 'btn-outline',
                    onclick: 'ModalService.closeModal(this.closest(\'.modal-overlay\'))'
                },
                {
                    text: 'Confirmar Toma',
                    class: 'btn-primary',
                    icon: 'fas fa-check',
                    onclick: `window.tallerSystem.toolManager.confirmTakeTool(${tool.id}, this.closest('.modal-overlay'))`
                }
            ]
        });
    }

    async confirmTakeTool(toolId, modal) {
        const operationNumber = modal.querySelector('#take-operation-number').value;
        const station = modal.querySelector('#take-station').value;
        const operator = window.tallerSystem.userName;

        if (!operationNumber) {
            this.uiManager.showNotification('Ingrese el número de operación', 'warning');
            return;
        }
        if (!station) {
            this.uiManager.showNotification('Seleccione una estación', 'warning');
            return;
        }

        const toolIndex = this.tools.findIndex(t => t.id === toolId);
        this.tools[toolIndex].status = 'en-uso';
        this.tools[toolIndex].operator = operator;
        this.tools[toolIndex].station = station;

        window.tallerSystem.history.unshift({
            tool: this.tools[toolIndex].name,
            action: 'tomada',
            operator: operator,
            operationNumber: operationNumber,
            station: window.tallerSystem.getStationName(station),
            time: new Date().toISOString(),
            numeroSerie: this.tools[toolIndex].numeroSerie
        });

        window.tallerSystem.operationNumber = operationNumber;
        localStorage.setItem('taller_operation_number', window.tallerSystem.operationNumber);

        await window.tallerSystem.saveData();
        ModalService.closeModal(modal);
        this.uiManager.showNotification(`Herramienta tomada: ${this.tools[toolIndex].name}`, 'success');
        this.renderToolsInHerramientasSection();
    }

    showReturnToolModal(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        const modal = ModalService.createModal({
            title: 'Devolver Herramienta',
            content: `
                <div class="form-group">
                    <label><i class="fas fa-tools"></i> Herramienta a devolver</label>
                    <div style="padding: 1rem; background: var(--gray-50); border-radius: 8px;">
                        <strong>${tool.name}</strong><br>
                        <small>Serie: ${tool.numeroSerie} | Estación: ${window.tallerSystem.getStationName(tool.station)}</small>
                    </div>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-map-marker-alt"></i> Ubicación para devolución</label>
                    <div style="padding: 1rem; background: var(--success); color: white; border-radius: 8px; text-align: center;">
                        <i class="fas fa-arrow-down"></i><br>
                        <strong>${tool.location}</strong><br>
                        <small>Llevar la herramienta a esta ubicación</small>
                    </div>
                </div>
            `,
            buttons: [
                {
                    text: 'Cancelar',
                    class: 'btn-outline',
                    onclick: 'ModalService.closeModal(this.closest(\'.modal-overlay\'))'
                },
                {
                    text: 'Confirmar Devolución',
                    class: 'btn-success',
                    icon: 'fas fa-check',
                    onclick: `window.tallerSystem.toolManager.confirmReturnTool(${tool.id}, this.closest('.modal-overlay'))`
                }
            ]
        });
    }

    async confirmReturnTool(toolId, modal) {
        const toolIndex = this.tools.findIndex(t => t.id === toolId);
        const operator = window.tallerSystem.userName;
        const operationNumber = window.tallerSystem.operationNumber;
        const station = this.tools[toolIndex].station;

        this.tools[toolIndex].status = 'disponible';
        this.tools[toolIndex].operator = '';
        this.tools[toolIndex].station = '';

        window.tallerSystem.history.unshift({
            tool: this.tools[toolIndex].name,
            action: 'devuelta',
            operator: operator,
            operationNumber: operationNumber,
            station: window.tallerSystem.getStationName(station),
            time: new Date().toISOString(),
            numeroSerie: this.tools[toolIndex].numeroSerie
        });

        await window.tallerSystem.saveData();
        ModalService.closeModal(modal);
        this.uiManager.showNotification(`Herramienta devuelta: ${this.tools[toolIndex].name}`, 'success');
        this.renderToolsInHerramientasSection();
    }

    showToolDetailsModal(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        const toolHistory = window.tallerSystem.history.filter(item => item.numeroSerie === tool.numeroSerie).slice(0, 3);
        const grupoTools = this.tools.filter(t => t.grupo === tool.grupo);
        const disponibles = grupoTools.filter(t => t.status === 'disponible').length;
        
        const modal = ModalService.createModal({
            title: `<i class="${tool.icon}"></i> Detalles de Herramienta`,
            content: `
                <h4 style="color: var(--primary); margin-bottom: 1rem;">${tool.name}</h4>
                
                <div style="background: var(--gray-100); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <strong>Grupo:</strong> ${tool.grupo}<br>
                        <strong>Ubicación:</strong> ${tool.location}<br>
                        <strong>Tipo:</strong> ${tool.isTorque ? 'Dinamométrica' : 'Manual'}
                    </div>
                    <div>
                        <strong>Estado:</strong> <span class="status-badge ${tool.status === 'disponible' ? 'status-available' : tool.status === 'en-uso' ? 'status-in-use' : 'status-maintenance'}">${tool.status}</span><br>
                        <strong>En grupo:</strong> ${disponibles}/${grupoTools.length} disp.
                    </div>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h5 style="color: var(--primary); margin-bottom: 1rem;">Historial Reciente</h5>
                    ${toolHistory.length === 0 ? '<p style="color: var(--gray-500); text-align: center;">No hay historial registrado</p>' : 
                        toolHistory.map(item => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--gray-50); border-radius: 8px; margin-bottom: 0.5rem;">
                                <div>
                                    <strong>${item.operator}</strong><br>
                                    <small style="color: var(--gray-600);">${new Date(item.time).toLocaleString()}</small>
                                </div>
                                <span class="status-badge ${item.action === 'tomada' ? 'status-in-use' : 'status-available'}" style="font-size: 0.7rem;">
                                    ${item.action}
                                </span>
                            </div>
                        `).join('') 
                    }
                </div>
            `,
            buttons: [{
                text: 'Cerrar',
                class: 'btn-outline',
                onclick: 'ModalService.closeModal(this.closest(\'.modal-overlay\'))'
            }]
        });
    }

    showJoinQueueModal(toolId) {
        const tool = this.tools.find(t => t.id === toolId);
        if (!tool) return;

        if (!window.tallerSystem.isLoggedIn) {
            this.uiManager.showNotification('Debes iniciar sesión para unirte a la cola.', 'warning');
            return;
        }
        
        const modal = ModalService.createModal({
            title: '<i class="fas fa-users"></i> Unirse a la Cola',
            content: `
                <div class="queue-modal-info">
                    Estás solicitando la herramienta: <strong>${tool.name}</strong> (Serie: ${tool.numeroSerie})
                </div>
                <div class="form-group">
                    <label for="queue-operation-number"><i class="fas fa-hashtag"></i> Número de Operación</label>
                    <input type="text" id="queue-operation-number" placeholder="Ingrese el número de operación" value="${window.tallerSystem.operationNumber}">
                </div>
                <div class="form-group">
                    <label for="queue-station-modal"><i class="fas fa-industry"></i> Estación de Trabajo</label>
                    <select id="queue-station-modal">
                        <option value="">Seleccione su estación</option>
                        ${window.tallerSystem.stations.map(station => 
                            `<option value="${station.id}">${station.name}</option>`
                        ).join('')}
                    </select>
                </div>
            `,
            buttons: [
                {
                    text: 'Cancelar',
                    class: 'btn-outline',
                    onclick: 'ModalService.closeModal(this.closest(\'.modal-overlay\'))'
                },
                {
                    text: 'Unirse a la Cola',
                    class: 'btn-warning',
                    icon: 'fas fa-users',
                    onclick: `window.tallerSystem.toolManager.confirmJoinQueue(${tool.id}, this.closest('.modal-overlay'))`
                }
            ]
        });
    }

    async confirmJoinQueue(toolId, modal) {
        const operationNumber = modal.querySelector('#queue-operation-number').value;
        const station = modal.querySelector('#queue-station-modal').value;

        if (!operationNumber) {
            this.uiManager.showNotification('Ingrese el número de operación', 'warning');
            return;
        }
        if (!station) {
            this.uiManager.showNotification('Seleccione una estación', 'warning');
            return;
        }

        const alreadyInQueue = window.tallerSystem.colaEspera.some(item => 
            item.toolId === toolId && item.operator === window.tallerSystem.userName 
        );

        if (alreadyInQueue) {
            this.uiManager.showNotification('Ya estás en la cola de espera para esta herramienta', 'warning');
            return;
        }

        window.tallerSystem.colaEspera.push({
            toolId: toolId,
            toolName: this.tools.find(t => t.id === toolId).name,
            toolSerial: this.tools.find(t => t.id === toolId).numeroSerie,
            operator: window.tallerSystem.userName,
            operationNumber: operationNumber,
            station: station,
            time: new Date().toISOString()
        });

        window.tallerSystem.operationNumber = operationNumber;
        localStorage.setItem('taller_operation_number', window.tallerSystem.operationNumber);

        await window.tallerSystem.saveData();
        ModalService.closeModal(modal);
        this.uiManager.showNotification(`Te has unido a la cola de espera para ${this.tools.find(t => t.id === toolId).name}`, 'success');
    }

    async cancelQueueReservation(toolId, toolName) {
        const index = window.tallerSystem.colaEspera.findIndex(item => 
            item.toolId === toolId && item.operator === window.tallerSystem.userName 
        );

        if (index !== -1) {
            window.tallerSystem.colaEspera.splice(index, 1);
            await window.tallerSystem.saveData();
            this.uiManager.showNotification(`Has cancelado tu reserva en la cola para ${toolName}`, 'info');
        }
    }
}