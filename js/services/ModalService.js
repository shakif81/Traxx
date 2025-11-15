class ModalService {
    static createModal(options = {}) {
        const {
            title = '',
            content = '',
            size = 'medium',
            showCloseButton = true,
            buttons = []
        } = options;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        const sizeClass = this.getSizeClass(size);
        
        modal.innerHTML = `
            <div class="modal-content ${sizeClass}">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    ${showCloseButton ? '<button class="modal-close">&times;</button>' : ''}
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${buttons.length > 0 ? `
                    <div class="modal-footer">
                        ${buttons.map(btn => `
                            <button class="btn ${btn.class || 'btn-outline'}" 
                                    onclick="${btn.onclick}">
                                ${btn.icon ? `<i class="${btn.icon}"></i>` : ''}
                                ${btn.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(modal);
        this.setupModalEvents(modal);
        return modal;
    }

    static getSizeClass(size) {
        const sizes = {
            'small': 'modal-sm',
            'medium': 'modal-md',
            'large': 'modal-lg',
            'xlarge': 'modal-xl'
        };
        return sizes[size] || '';
    }

    static setupModalEvents(modal) {
        // Cerrar modal con botón X
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal(modal));
        }

        // Cerrar modal haciendo click fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });

        // Cerrar modal con ESC
        const closeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modal);
            }
        };
        document.addEventListener('keydown', closeHandler);

        // Limpiar event listener cuando se cierre el modal
        modal._closeHandler = closeHandler;
    }

    static closeModal(modal) {
        if (modal && modal.parentNode) {
            document.removeEventListener('keydown', modal._closeHandler);
            modal.parentNode.removeChild(modal);
        }
    }

    static closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            this.closeModal(modal);
        });
    }

    static createFormModal(options) {
        const { title, fields, onSubmit, submitText = 'Guardar' } = options;
        
        const formContent = fields.map(field => `
            <div class="form-group">
                <label for="${field.id}">${field.label}</label>
                ${this.renderField(field)}
            </div>
        `).join('');

        const modal = this.createModal({
            title,
            content: formContent,
            buttons: [
                {
                    text: 'Cancelar',
                    class: 'btn-outline',
                    onclick: 'ModalService.closeModal(this.closest(\'.modal-overlay\'))'
                },
                {
                    text: submitText,
                    class: 'btn-primary',
                    icon: 'fas fa-check',
                    onclick: `ModalService.handleFormSubmit(this.closest('.modal-overlay'), ${onSubmit.name})`
                }
            ]
        });

        return modal;
    }

    static renderField(field) {
        const { type, id, placeholder, value, options } = field;
        
        switch (type) {
            case 'select':
                return `
                    <select id="${id}">
                        ${options.map(opt => `
                            <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>
                                ${opt.label}
                            </option>
                        `).join('')}
                    </select>
                `;
            case 'textarea':
                return `<textarea id="${id}" placeholder="${placeholder}" rows="3">${value || ''}</textarea>`;
            default:
                return `<input type="${type}" id="${id}" placeholder="${placeholder}" value="${value || ''}">`;
        }
    }

    static handleFormSubmit(modal, onSubmit) {
        const inputs = modal.querySelectorAll('input, select, textarea');
        const formData = {};
        
        inputs.forEach(input => {
            formData[input.id] = input.value;
        });

        if (onSubmit && typeof onSubmit === 'function') {
            onSubmit(formData);
        }

        this.closeModal(modal);
    }

    static showConfirmationModal(options) {
        const {
            title = 'Confirmar acción',
            message = '¿Está seguro de que desea realizar esta acción?',
            confirmText = 'Confirmar',
            cancelText = 'Cancelar',
            onConfirm,
            onCancel
        } = options;

        const modal = this.createModal({
            title,
            content: `
                <div style="text-align: center; padding: 1rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--warning); margin-bottom: 1rem;"></i>
                    <p>${message}</p>
                </div>
            `,
            buttons: [
                {
                    text: cancelText,
                    class: 'btn-outline',
                    onclick: `ModalService.handleConfirmation(false, ${onConfirm ? onConfirm.name : 'null'}, ${onCancel ? onCancel.name : 'null'})`
                },
                {
                    text: confirmText,
                    class: 'btn-warning',
                    icon: 'fas fa-check',
                    onclick: `ModalService.handleConfirmation(true, ${onConfirm ? onConfirm.name : 'null'}, ${onCancel ? onCancel.name : 'null'})`
                }
            ]
        });

        return modal;
    }

    static handleConfirmation(confirmed, onConfirm, onCancel) {
        if (confirmed && onConfirm) {
            onConfirm();
        } else if (!confirmed && onCancel) {
            onCancel();
        }
        this.closeAllModals();
    }

    static showErrorModal(message) {
        return this.createModal({
            title: 'Error',
            content: `
                <div style="text-align: center; padding: 1rem;">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                    <p>${message}</p>
                </div>
            `,
            buttons: [{
                text: 'Cerrar',
                class: 'btn-primary',
                onclick: 'ModalService.closeModal(this.closest(\'.modal-overlay\'))'
            }]
        });
    }

    static showSuccessModal(message) {
        return this.createModal({
            title: 'Éxito',
            content: `
                <div style="text-align: center; padding: 1rem;">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success); margin-bottom: 1rem;"></i>
                    <p>${message}</p>
                </div>
            `,
            buttons: [{
                text: 'Cerrar',
                class: 'btn-primary',
                onclick: 'ModalService.closeModal(this.closest(\'.modal-overlay\'))'
            }]
        });
    }
}