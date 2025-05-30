function umbralMdw(req, res, next){
    try {
        
    } catch (error) {
        console.log("[Umbral MDW] Ha ocurrido un error: ", error);
        return res.json({ estatus: 0, info: {
            message: "Ha sucedido un error"
        }});
    }
}