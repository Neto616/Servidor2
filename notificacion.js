async function notification(devices, title, body, extra_information) {
    initFirebase();

    const messages = devices.map(token => ({
        notification: { title, body },
        data: { extra_information },
        token: token
    }));

    try {
        const responses = await Promise.all(messages.map(msg => admin.messaging().send(msg)));
        return responses; // Devuelve un array de respuestas
    } catch (error) {
        console.error("❌ Error al enviar la notificación:", error);
        throw error;
    }
}