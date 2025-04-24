const express = require("express");
const dataBase = require("mysql2");
const route = express.Router();

let data = {
    flag: false,
    id: 0
};

const dbConfig = {
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASS,
    database: process.env.DB
};

const db = dataBase.createPool(dbConfig).promise();

route.get('/crear-datos-prueba', async (req, res) => {
    try {
        const { pass } = req.query;

        if(pass === "nestorTeAmo"){
            await db.query(`CALL generar_fugas();`);
            await db.query(`CALL generar_detalles();`);
            return res.status(200).json({ estatus: 1, info: "Se generaron los datos porque tienes la contraseña" });

        }

        return res.status(200).json({ estatus: 1, info: "No tienes la contraseña no puedes generar datos de prueba" });

    } catch (err) {
        res.status(500).send(err.message);
    }
});

route.get('/', async (req, res) => {
    try {
      const [results] = await db.query('SELECT * FROM fuga_gas');
    console.log("[Inicio] El resultado es: ", results)
      res.json({
        estatus: 1,
        info: {
            messgae: "Si hay conexion con el servidor y la base de datos",
            data: results
        }
      });
    } catch (err) {
      res.status(500).send(err.message);
    }
});

/**
 * En esta ruta debe entrar unicamente las particulas por millon en el cuerpo d la solicitud
 */

route.post('/fuga_gas', async (req, res) => {
    try {
        console.log("fuga_dgas", req.body)
        
        if (!data["flag"]) {
            data["flag"] = true;
            
            await db.query(
                `insert into fuga_gas
                (tiempo_inicial)
                values
                (now());`);
    
            const [rows] = await db.query("select LAST_INSERT_ID() as id;");

            data["id"] = rows[0].id;
        }

        await db.query(
            `insert into detalles_fuga
             (id_fuga, tiempo, ppm)
             values
             (?, now(), ?)`
            ,[data["id"], ...Object.values(req.body)]);

        console.log(data);

        return res.json({
            estatus: 1, 
            info: {
                message: "Se guardaron los datos de la fuga",
                data
            }
        });
    } catch (error) {
        data = {
            flag: false,
            id: 0
        };

        console.error(error);
        return res.json({ 
            estatus: 0, 
            info: {
                message: "Ha ocurrido un error: "+error
            }
        })
    }
})

route.put('/fin_fuga', async (req, res) => {
    try {
        if(!data["flag"]){
            return res.json({ 
                estatus: 2, 
                info: {
                    message: "No se puede finalizar una fuga si no fue iniciada"
                }
            })
        }

        await db.query(
            `update fuga_gas
            set tiempo_final = now()
            where id = ?`,
        [data["id"]]);

        console.log(data);
        data = {
            flag: false,
            id: 0
        }
        return res.json({
            estatus: 1,
            info: {
                message: "Se ha finalizado la fuga"
            }
        })
    } catch (error) {
        data = {
            flag: false,
            id: 0
        }
        console.log(error);
        return res.json({ 
            estatus: 0,
            info: {
                message: "Ha ocurrido un error: "+error
            } 
        });
    }
})

module.exports = route;