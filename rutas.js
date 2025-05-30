const express = require("express");
const mysql = require("mysql2");
const notification = require("./notificacion");
const route = express.Router();

let devices = ""

let data = {
    flag: false,
    id: 0
};

const dbUrl = process.env.DB_URL;
const parsed = new URL(dbUrl);

const db = mysql.createPool({
  host: parsed.hostname,
  user: parsed.username,
  password: parsed.password,
  database: parsed.pathname.replace("/", ""),
  port: parsed.port,
  ssl: { rejectUnauthorized: false }
}).promise();

// Middleware
async function umbralMdw(req, res, next){
    try {
        if (Object.keys(req.body).length === 0) return res.json({ estatus: 0, info: {message: "No trae valor ha guardar"}});

        const [resultado] = await db.execute("select ppm_limite_inicial, ppm_limite_final, gas from configuraciones");
        console.log("El resultado de la consulta es: ", resultado);
        if(req.body.valor < resultado[0].ppm_limite_inicial) 
            return res.json({ estatus: -1, info: {message: "No entra en el umbra minimo"}});


        return next();
    } catch (error) {
        console.log("[Umbral MDW] Ha ocurrido un error: ", error);
        return res.json({ estatus: 0, info: {
            message: "Ha sucedido un error"
        }});
    }
}


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
            message: "Datos del sensor",
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
            message: "Ha ocurrido un error",
            data: {
                isActive: false,
                ppm: 0
            }
        }
      });
    }
});


/**
 * En esta ruta debe entrar unicamente las particulas por millon en el cuerpo de la solicitud
 */
route.post('/configuracion', async (req, res) => {
    try {
        const { ppmLimiteInicial, ppmLimiteFinal, nombreGas } = req.body;
        if(!ppmLimiteFinal || !ppmLimiteInicial || !nombreGas) return res.json({ estatus: 0, info: { message: "No se permiten datos vacios" }})
        await db.query(`
            update configuraciones
            set ppm_limite_inicial = ?,
            ppm_limite_final = ?,
            gas = ?,
            estatus = 1    
        `, [ppmLimiteInicial, ppmLimiteFinal, nombreGas]);

        return res.json({ estatus: 1, info: {
            message: "Se ha actualizado la configuración del detector de gas"
        }})
    } catch (error) {
        console.log("[Configuracion POST] ", error);
        return res.json({ estatus: 0, info: {
            message: "Ha ocurrido un error"
        }})
    }
})

// Ruta para almacenar los dispositivos que recibiran las notificaciones al haber una fuga de gas
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

// Guarda las fugas que se detechtan 
route.post('/fuga_gas', [umbralMdw],async (req, res) => {
    try {
        if(!req.body) return res.json({ estatus: 0, 
            info: {
                message: "No se permiten datos vacios"
            }});
        console.log("fuga_dgas", req.body)
        
        if (!data["flag"]) {
            data["flag"] = true;
            if(devices.length) await notification(devices, "¡Se detecto una Fuga!", "Se ha detectado una fuga en tu sistma.", "Fuga");

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

// Finaliza la fuga que se detecto por ultima vez
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