const admin = require('firebase-admin');

let initialized = false;

function initFirebase() {
    if (!initialized) {
        const serviceAccount = {
            type: process.env.type,
            project_id: process.env.project_id,
            private_key: process.env.private_key.replace(/\\n/g, '\n'),
            client_email: process.env.client_email,
            client_id: process.env.client_id,
            auth_uri: process.env.auth_uri,
            token_uri: process.env.token_uri,
            auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
        };

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        initialized = true;
    }
}

async function notification(deviceToken, title, body, extra_information) {
    initFirebase();
    console.log("Enviando notificación al dispositivo:", deviceToken);

    const message = {
//        notification: { title, body },
        data: { 
            title, 
            body, 
            extra_information 
        },
        token: deviceToken, // Usa 'token' directamente y espera un string
    };

    try {
        const response = await admin.messaging().send(message);
        console.log("Notificación enviada exitosamente:", response);
        return response;
    } catch (error) {
        console.error("❌ Error al enviar la notificación:", error);
        throw error;
    }
}

module.exports = notification;
