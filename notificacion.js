const admin = require('firebase-admin');

async function notification (devices, title, body, extra_information) {
    const serviceAccount = {
        "type": process.env.type,
        "project_id": process.env.project_id,
        "private_key": process.env.private_key.replace(/\\n/g, '\n'), // Reemplazar saltos de línea escapados
        "client_email": process.env.client_email,
        "client_id": process.env.client_id,
        "auth_uri": process.env.auth_uri,
        "token_uri": process.env.token_uri,
        "auth_provider_x509_cert_url": process.env.auth_provider_x509_cert_url,
      };
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    const message = {
        notification: {
          title,
          body
        },
        data: {
          extra_information: extra_information
        },
        token: devices
      };
    
      try {
        const response = await admin.messaging().send(message);
        console.log("Notificación enviada:", response);
        return res.json({ code: "OK", message: "Notificación enviada", fcm_response: response });
      } catch (error) {
        console.error("Error al enviar la notificación:", error);
        return res.json({ code: "ERROR", message: error.message });
      }
}

export default notification;