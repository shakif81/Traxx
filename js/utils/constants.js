// CONFIGURACIÓN FIREBASE
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBZvSfAi2AO_FF1rqDqKDH6-VDFrbeCdhg",
    authDomain: "taller-herramientas-79e58.firebaseapp.com",
    projectId: "taller-herramientas-79e58",
    storageBucket: "taller-herramientas-79e58.firebasestorage.app",
    messagingSenderId: "1010208693381",
    appId: "1:1010208693381:web:cd5736b779a41d2c4eddec"
};

// CONSTANTES DEL SISTEMA
const SYSTEM_CONSTANTS = {
    DEFAULT_USERS: {
        'op1': { password: '1234', role: 'Operario 1', isAdmin: false },
        'admin': { password: '1234', role: 'Administrador', isAdmin: true }
    },
    STATUS_COLORS: {
        'disponible': 'var(--success)',
        'en-uso': 'var(--warning)',
        'mantenimiento': 'var(--danger)'
    },
    OPERATION_TYPES: {
        'mantenimiento': { color: 'var(--warning)', icon: 'fas fa-bolt' },
        'ensamblaje': { color: 'var(--success)', icon: 'fas fa-puzzle-piece' },
        'calibracion': { color: 'var(--accent)', icon: 'fas fa-tachometer-alt' },
        'general': { color: 'var(--secondary)', icon: 'fas fa-cogs' }
    }
};

// MENSJES DEL SISTEMA
const SYSTEM_MESSAGES = {
    LOGIN_ERROR: 'Usuario o contraseña incorrectos.',
    LOGIN_SUCCESS: 'Bienvenido, {user}',
    LOGOUT_SUCCESS: 'Sesión cerrada correctamente.',
    SAVE_SUCCESS: 'Datos guardados correctamente.',
    SAVE_ERROR: 'Error al guardar datos.',
    TOOL_TAKEN: 'Herramienta tomada: {tool}',
    TOOL_RETURNED: 'Herramienta devuelta: {tool}',
    MATERIAL_TAKEN: 'Material tomado: {material}',
    MATERIAL_RETURNED: 'Material devuelto: {material}',
    QUEUE_JOINED: 'Te has unido a la cola de espera para {tool}',
    QUEUE_CANCELLED: 'Has cancelado tu reserva en la cola para {tool}',
    TASK_CREATED: 'Tarea "{task}" creada correctamente',
    TASK_STARTED: 'Tarea "{task}" iniciada - Herramientas bloqueadas',
    TASK_COMPLETED: 'Tarea "{task}" completada - Herramientas liberadas',
    TASK_CANCELLED: 'Tarea "{task}" cancelada - Herramientas liberadas',
    OPERATION_CREATED: 'Operación "{operation}" creada correctamente',
    ACCESS_DENIED: 'Acceso denegado. Se requiere permisos de administrador.',
    NO_TOOLS_ASSIGNED: 'No se pueden iniciar tareas sin herramientas asignadas'
};