const express = require("express");
const dataBase = require("mysql2");
const notification = require("./notificacion");
const route = express.Router();

let devices = ""

let data = {
    flag: false,
    id: 0
};

const dbConfig = {
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASS,
    database: process.env.DB,
    port: process.env.PORT
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
            message: "Si hay conexion con el servidor y la base de datos",
            // data: results
        }
      });
    } catch (err) {
        console.log(err);
        res.status(500).send(err.message);
    }
});

route.get('/estatus_sensor', async (req, res) => {
    try {
        if(data.flag){
            var [results] = await db.query('SELECT * FROM detalles_fuga where id_fuga = ?', [data.id]);
        }

      res.json({
        estatus: 1,
        info: {
            messgae: "Datos del sensor",
            data: {
                isActive: data.flag,
                ppm: data.flag ? 0 : 0
            }
        }
      });
    } catch (err) {
      res.status(500).json({
        estatus: 0,
        info: {
            messgae: "Ha ocurrido un error",
            data: {
                isActive: false,
                ppm: 0
            }
        }
      });
    }
});


/**
 * En esta ruta debe entrar unicamente las particulas por millon en el cuerpo d la solicitud
 */

route.post('/register_device', async (req, res) => {
    try {
        const token = req.body.DEVICEID || req.body.token;
  
        console.log("Token recibido:", token);
        if (token && !devices.includes(token)) {
            devices = token;
          console.log(`Token registrado: ${token}`);
          await db.query(`insert into devices
                    (token, estatus)
                    values
                    (?, 1);`, [token]);
          return res.json({ code: "OK", message: "Token registrado", id: 1 });
        } else {
          return res.json({ code: "ERROR", message: "Token inválido o ya registrado", id: 0 });
        }
    } catch (error) {
        console.log("Ha ocurrido un error: ", error);
        return res.json({ estatus: 0, info: { message: "Ha ocurrido un error en el servidor"}})
    }
  });
  

route.post('/fuga_gas', async (req, res) => {
    try {
        console.log("fuga_dgas", req.body)
        
        if (!data["flag"]) {
            data["flag"] = true;
            await notification(devices, "¡Se detecto una Fuga!", "Se ha detectado una fuga en tu sistma.", "Fuga");
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
        await notification(devices, "Ha finalizado una fuga", "Se ha finalizo una fuga en tu sistma.", "Fin fuga");
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