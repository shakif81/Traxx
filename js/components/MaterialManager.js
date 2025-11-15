class MaterialManager {
    constructor(firebaseService, uiManager) {
        this.firebaseService = firebaseService;
        this.uiManager = uiManager;
        this.materials = [];
    }

    setMaterials(materials) {
        this.materials = materials;
    }

    renderMaterials(searchTerm = '') {
        const materialsList = document.getElementById('materiales-list');
        if (!materialsList) return;

        let filteredMaterials = this.materials;

        if (searchTerm) {
            filteredMaterials = Helpers.filterBySearch(this.materials, searchTerm, ['name', 'code']);
        }

        // ORDENAR: Primero los materiales en uso por el usuario actual, luego en uso por otros, luego disponibles, luego agotados
        filteredMaterials.sort((a, b) => {
            const aIsUserMaterial = a.status === 'en-uso' && a.operator === window.tallerSystem.userName;
            const bIsUserMaterial = b.status === 'en-uso' && b.operator === window.tallerSystem.userName;
            
            if (aIsUserMaterial && !bIsUserMaterial) return -1;
            if (!aIsUserMaterial && bIsUserMaterial) return 1;
            
            const aInUse = a.status === 'en-uso';
            const bInUse = b.status === 'en-uso';
            if (aInUse && !bInUse) return -1;
            if (!aInUse && bInUse) return 1;
            
            const aAvailable = a.status === 'disponible' && a.quantity > 0;
            const bAvailable = b.status === 'disponible' && b.quantity > 0;
            if (aAvailable && !bAvailable) return -1;
            if (!aAvailable && bAvailable) return 1;
            
            return a.name.localeCompare(b.name);
        });

        if (filteredMaterials.length === 0) {
            materialsList.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--gray-500); padding: 2rem;">No se encontraron materiales.</td></tr>`;
            return;
        }

        materialsList.innerHTML = '';
        
        // Agrupar materiales por operador (para los que están en uso)
        const materialesPorOperador = {};
        const materialesDisponibles = [];
        const materialesAgotados = [];

        filteredMaterials.forEach(material => {
            if (material.status === 'en-uso' && material.operator) {
                if (!materialesPorOperador[material.operator]) {
                    materialesPorOperador[material.operator] = [];
                }
                materialesPorOperador[material.operator].push(material);
            } else if (material.quantity === 0) {
                materialesAgotados.push(material);
            } else {
                materialesDisponibles.push(material);
            }
        });

        // Función para renderizar una lista de materiales
        const renderMaterialList = (materials, title = null) => {
            if (title) {
                const headerRow = document.createElement('tr');
                headerRow.innerHTML = `
                    <td colspan="4" style="background: var(--gray-100); padding: 0.75rem 1rem; font-weight: 600; color: var(--primary); border-bottom: 2px solid var(--gray-300);">
                        <i class="fas fa-users"></i> ${title}
                    </td>
                `;
                materialsList.appendChild(headerRow);
            }

            materials.forEach(material => {
                const row = document.createElement('tr');
                const isUserMaterial = material.operator === window.tallerSystem.userName && material.status === 'en-uso';

                // Destacar fila del usuario actual
                if (isUserMaterial) {
                    row.style.background = 'linear-gradient(90deg, rgba(45, 116, 218, 0.05) 0%, rgba(255, 255, 255, 1) 50%)';
                    row.style.borderLeft = '4px solid var(--secondary)';
                } else if (material.status === 'en-uso') {
                    // Destacar otros materiales en uso
                    row.style.background = 'linear-gradient(90deg, rgba(245, 158, 11, 0.05) 0%, rgba(255, 255, 255, 1) 50%)';
                    row.style.borderLeft = '4px solid var(--warning)';
                } else if (material.quantity === 0) {
                    // Destacar materiales agotados
                    row.style.background = 'linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, rgba(255, 255, 255, 1) 50%)';
                    row.style.borderLeft = '4px solid var(--danger)';
                }

                let ubicacionHTML = '';
                
                if (material.status === 'en-uso' && material.station) {
                    const stationName = window.tallerSystem.getStationName(material.station);
                    if (isUserMaterial) {
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
                                <div class="user-avatar-small">${material.operator.split(' ').map(n => n[0]).join('').toUpperCase()}</div>
                                <span>${stationName}</span>
                            </div>
                        `;
                    }
                } else if (material.quantity === 0) {
                    ubicacionHTML = `<span style="color: var(--danger); font-weight: 600;">Almacén (Agotado)</span>`;
                } else {
                    ubicacionHTML = `<span>${material.location}</span>`;
                }

                let accionesHTML = '';
                if (material.status === 'disponible' && material.quantity > 0) {
                    accionesHTML = `
                        <div class="action-buttons">
                            <button class="btn-icon btn-icon-primary" title="Tomar material" onclick="window.tallerSystem.showTakeMaterialModal(${material.id})">
                                <i class="fas fa-hand-paper"></i>
                            </button>
                            <button class="btn-icon btn-icon-outline" title="Ver detalles" onclick="window.tallerSystem.showMaterialDetailsModal(${material.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    `;
                } else if (isUserMaterial) {
                    accionesHTML = `
                        <div class="action-buttons">
                            <button class="btn-icon btn-icon-success" title="Devolver material" onclick="window.tallerSystem.showReturnMaterialModal(${material.id})">
                                <i class="fas fa-reply"></i>
                            </button>
                            <button class="btn-icon btn-icon-outline" title="Ver detalles" onclick="window.tallerSystem.showMaterialDetailsModal(${material.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    `;
                } else if (material.status === 'en-uso') {
                    accionesHTML = `
                        <div class="action-buttons">
                            <button class="btn-icon btn-icon-outline" title="Ver detalles" onclick="window.tallerSystem.showMaterialDetailsModal(${material.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    `;
                } else if (material.quantity === 0) {
                    accionesHTML = `
                        <div class="action-buttons">
                            <button class="btn-icon btn-icon-outline" title="Ver detalles" onclick="window.tallerSystem.showMaterialDetailsModal(${material.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    `;
                }

                let materialInfoHTML = `
                    <div class="tool-info">
                        <div class="tool-icon-table" style="background: var(--accent);">
                            <i class="fas fa-flask"></i>
                        </div>
                        <div class="tool-details">
                            <div class="tool-name" style="${isUserMaterial ? 'color: var(--secondary); font-weight: 700;' : material.status === 'en-uso' ? 'color: var(--warning); font-weight: 600;' : ''}">
                                ${material.name} 
                                ${isUserMaterial ? '<span style="color: var(--success); font-size: 0.7rem; margin-left: 0.5rem;">(EN TU PODER)</span>' : 
                                material.status === 'en-uso' ? '<span style="color: var(--warning); font-size: 0.7rem; margin-left: 0.5rem;">(EN USO)</span>' : ''}
                            </div>
                            <div class="tool-status ${material.status === 'en-uso' ? 'status-in-use' : 'status-available'}">
                                <i class="fas ${material.status === 'en-uso' ? 'fa-user-check' : 'fa-check-circle'}"></i> 
                                ${material.status === 'en-uso' ? 'En Uso' : 'Disponible'}
                            </div>
                        </div>
                    </div>
                `;

                row.innerHTML = `
                    <td>${materialInfoHTML}</td>
                    <td>${material.code}</td>
                    <td>${ubicacionHTML}</td>
                    <td>${accionesHTML}</td>
                `;
                materialsList.appendChild(row);
            });
        };

        // Renderizar en este orden:
        // 1. Materiales en uso por el usuario actual
        if (materialesPorOperador[window.tallerSystem.userName]) {
            renderMaterialList(materialesPorOperador[window.tallerSystem.userName], `En uso por: ${window.tallerSystem.userName} (TÚ)`);
        }

        // 2. Materiales en uso por otros operadores
        Object.keys(materialesPorOperador).forEach(operador => {
            if (operador !== window.tallerSystem.userName) {
                renderMaterialList(materialesPorOperador[operador], `En uso por: ${operador}`);
            }
        });

        // 3. Materiales disponibles
        if (materialesDisponibles.length > 0) {
            renderMaterialList(materialesDisponibles, 'Materiales Disponibles');
        }

        // 4. Materiales agotados
        if (materialesAgotados.length > 0) {
            renderMaterialList(materialesAgotados, 'Materiales Agotados');
        }
    }

    showTakeMaterialModal(materialId) {
        const material = this.materials.find(m => m.id === materialId);
        if (!material) return;
        
        if (!window.tallerSystem.isLoggedIn) {
            this.uiManager.showNotification('Debes iniciar sesión para tomar un material.', 'warning');
            return;
        }
        
        if (material.quantity <= 0) {
            this.uiManager.showNotification('Este material está agotado.', 'error');
            return;
        }
        
        const modal = ModalService.createModal({
            title: 'Tomar Material',
            content: `
                <div class="form-group">
                    <label><i class="fas fa-flask"></i> Material seleccionado</label>
                    <div style="padding: 1rem; background: var(--gray-50); border-radius: 8px;">
                        <strong>${material.name}</strong><br>
                        <small>Código: ${material.code}</small>
                    </div>
                </div>
                <div class="form-group">
                    <label for="take-material-operation-number"><i class="fas fa-hashtag"></i> Número de Operación</label>
                    <input type="text" id="take-material-operation-number" placeholder="Ingrese el número de operación" value="${window.tallerSystem.operationNumber}">
                </div>
                <div class="form-group">
                    <label for="take-material-station"><i class="fas fa-industry"></i> Estación de Trabajo</label>
                    <select id="take-material-station">
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
                    onclick: `window.tallerSystem.materialManager.confirmTakeMaterial(${material.id}, this.closest('.modal-overlay'))`
                }
            ]
        });
    }

    async confirmTakeMaterial(materialId, modal) {
        const operationNumber = modal.querySelector('#take-material-operation-number').value;
        const station = modal.querySelector('#take-material-station').value;
        const operator = window.tallerSystem.userName;

        if (!operationNumber) {
            this.uiManager.showNotification('Ingrese el número de operación', 'warning');
            return;
        }
        if (!station) {
            this.uiManager.showNotification('Seleccione una estación', 'warning');
            return;
        }

        const materialIndex = this.materials.findIndex(m => m.id === materialId);
        
        if (this.materials[materialIndex].status !== 'disponible') {
            this.uiManager.showNotification('Este material ya no está disponible.', 'error');
            ModalService.closeModal(modal);
            this.renderMaterials();
            return;
        }

        this.materials[materialIndex].status = 'en-uso';
        this.materials[materialIndex].operator = operator;
        this.materials[materialIndex].station = station;

        window.tallerSystem.history.unshift({
            tool: material.name,
            action: 'tomada',
            operator: operator,
            operationNumber: operationNumber,
            station: window.tallerSystem.getStationName(station),
            time: new Date().toISOString(),
            numeroSerie: material.code,
            type: 'material'
        });

        window.tallerSystem.operationNumber = operationNumber;
        localStorage.setItem('taller_operation_number', window.tallerSystem.operationNumber);
        
        await window.tallerSystem.saveData();
        ModalService.closeModal(modal);
        this.uiManager.showNotification(`Material tomado: ${material.name}`, 'success');
        this.renderMaterials();
    }

    showReturnMaterialModal(materialId) {
        const material = this.materials.find(m => m.id === materialId);
        if (!material) return;

        const modal = ModalService.createModal({
            title: 'Devolver Material',
            content: `
                <div class="form-group">
                    <label><i class="fas fa-flask"></i> Material a devolver</label>
                    <div style="padding: 1rem; background: var(--gray-50); border-radius: 8px;">
                        <strong>${material.name}</strong><br>
                        <small>Código: ${material.code} | Estación: ${window.tallerSystem.getStationName(material.station)}</small>
                    </div>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-map-marker-alt"></i> Ubicación para devolución</label>
                    <div style="padding: 1rem; background: var(--success); color: white; border-radius: 8px; text-align: center;">
                        <i class="fas fa-arrow-down"></i><br>
                        <strong>${material.location}</strong><br>
                        <small>Llevar el material a esta ubicación</small>
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
                    onclick: `window.tallerSystem.materialManager.confirmReturnMaterial(${material.id}, this.closest('.modal-overlay'))`
                }
            ]
        });
    }

    async confirmReturnMaterial(materialId, modal) {
        const materialIndex = this.materials.findIndex(m => m.id === materialId);
        const operator = window.tallerSystem.userName;
        const operationNumber = window.tallerSystem.operationNumber;
        const station = this.materials[materialIndex].station;

        this.materials[materialIndex].status = 'disponible';
        this.materials[materialIndex].operator = '';
        this.materials[materialIndex].station = '';

        window.tallerSystem.history.unshift({
            tool: this.materials[materialIndex].name,
            action: 'devuelta',
            operator: operator,
            operationNumber: operationNumber,
            station: window.tallerSystem.getStationName(station),
            time: new Date().toISOString(),
            numeroSerie: this.materials[materialIndex].code,
            type: 'material'
        });
        
        await window.tallerSystem.saveData();
        ModalService.closeModal(modal);
        this.uiManager.showNotification(`Material devuelto: ${this.materials[materialIndex].name}`, 'success');
        this.renderMaterials();
    }

    showMaterialDetailsModal(materialId) {
        const material = this.materials.find(m => m.id === materialId);
        if (!material) return;

        const materialHistory = window.tallerSystem.history.filter(item => item.numeroSerie === material.code && item.type === 'material').slice(0, 3);
        
        const modal = ModalService.createModal({
            title: '<i class="fas fa-flask"></i> Detalles de Material',
            content: `
                <h4 style="color: var(--primary); margin-bottom: 1rem;">${material.name}</h4>
                
                <div style="background: var(--gray-100); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <strong>Código:</strong> ${material.code}<br>
                        <strong>Ubicación:</strong> ${material.location}<br>
                    </div>
                    <div>
                        <strong>Cantidad actual:</strong> ${material.quantity} unidades<br>
                        <strong>Estado:</strong> <span class="status-badge ${material.quantity === 0 ? 'status-maintenance' : material.status === 'en-uso' ? 'status-in-use' : 'status-available'}">
                            ${material.quantity === 0 ? 'Agotado' : material.status === 'en-uso' ? 'En Uso' : 'Disponible'}
                        </span>
                    </div>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h5 style="color: var(--primary); margin-bottom: 1rem;">Historial Reciente</h5>
                    ${materialHistory.length === 0 ? '<p style="color: var(--gray-500); text-align: center;">No hay historial registrado</p>' : 
                        materialHistory.map(item => `
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
}