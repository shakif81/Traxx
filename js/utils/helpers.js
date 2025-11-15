class Helpers {
    static formatMessage(message, params) {
        return message.replace(/{(\w+)}/g, (match, key) => params[key] || match);
    }

    static generateId(prefix = '') {
        return prefix + Date.now() + Math.random().toString(36).substr(2, 9);
    }

    static formatDate(date) {
        return new Date(date).toLocaleString('es-ES');
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    static getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    static sortByKey(array, key, ascending = true) {
        return array.sort((a, b) => {
            if (a[key] < b[key]) return ascending ? -1 : 1;
            if (a[key] > b[key]) return ascending ? 1 : -1;
            return 0;
        });
    }

    static filterBySearch(array, searchTerm, fields) {
        if (!searchTerm) return array;
        
        const term = searchTerm.toLowerCase();
        return array.filter(item => 
            fields.some(field => 
                item[field] && item[field].toString().toLowerCase().includes(term)
            )
        );
    }

    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    static isObjectEmpty(obj) {
        return Object.keys(obj).length === 0;
    }

    static getRandomColor() {
        const colors = ['var(--secondary)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--accent)'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}