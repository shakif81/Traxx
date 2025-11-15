class FirebaseService {
    constructor() {
        this.db = null;
        this.unsubscribe = null;
        this.init();
    }

    init() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
            this.db = firebase.firestore();
            console.log('✅ Firebase inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error);
            throw error;
        }
    }

    async getData(documentPath = 'tallerData/herramientas') {
        try {
            const doc = await this.db.doc(documentPath).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error('❌ Error obteniendo datos:', error);
            throw error;
        }
    }

    async saveData(data, documentPath = 'tallerData/herramientas') {
        try {
            await this.db.doc(documentPath).set({
                ...data,
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log('✅ Datos guardados en Firebase');
        } catch (error) {
            console.error('❌ Error guardando datos:', error);
            throw error;
        }
    }

    async createInitialData(defaultData, documentPath = 'tallerData/herramientas') {
        try {
            await this.saveData(defaultData, documentPath);
            console.log('✅ Datos iniciales creados en Firebase');
        } catch (error) {
            console.error('❌ Error creando datos iniciales:', error);
            throw error;
        }
    }

    setupRealtimeListener(callback, documentPath = 'tallerData/herramientas') {
        try {
            this.unsubscribe = this.db.doc(documentPath).onSnapshot(
                (doc) => {
                    if (doc.exists) {
                        callback(doc.data());
                    } else {
                        callback(null);
                    }
                },
                (error) => {
                    console.error('❌ Error en listener:', error);
                    callback(null, error);
                }
            );
            return this.unsubscribe;
        } catch (error) {
            console.error('❌ Error configurando listener:', error);
            throw error;
        }
    }

    unsubscribeListener() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    async addDocument(collectionPath, data) {
        try {
            const docRef = await this.db.collection(collectionPath).add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error('❌ Error añadiendo documento:', error);
            throw error;
        }
    }

    async updateDocument(documentPath, data) {
        try {
            await this.db.doc(documentPath).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('❌ Error actualizando documento:', error);
            throw error;
        }
    }

    async deleteDocument(documentPath) {
        try {
            await this.db.doc(documentPath).delete();
        } catch (error) {
            console.error('❌ Error eliminando documento:', error);
            throw error;
        }
    }
}