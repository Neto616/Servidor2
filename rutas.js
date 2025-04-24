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
            await db.query(`
                DROP PROCEDURE IF EXISTS generar_fugas;
            `);
            await db.query(`
                CREATE PROCEDURE generar_fugas()
                BEGIN
                    DECLARE i INT DEFAULT 1;
                    DECLARE inicio DATETIME;
                    DECLARE fin DATETIME;
    
                    WHILE i <= 100 DO
                        SET inicio = DATE_ADD('2025-04-20 11:00:00', INTERVAL FLOOR(RAND() * 3000) SECOND);
                        SET fin = DATE_ADD(inicio, INTERVAL FLOOR(10 + RAND() * 60) SECOND); -- Duración entre 10 y 70 segundos
    
                        INSERT INTO fuga_gas(tiempo_inicial, tiempo_final)
                        VALUES (inicio, fin);
    
                        SET i = i + 1;
                    END WHILE;
                END;
            `);
            await db.query(`
                DROP PROCEDURE IF EXISTS generar_detalles;
            `);
            await db.query(`
                CREATE PROCEDURE generar_detalles()
                BEGIN
                    DECLARE done INT DEFAULT FALSE;
                    DECLARE fuga_id INT;
                    DECLARE tiempo_i DATETIME;
                    DECLARE tiempo_f DATETIME;
                    DECLARE detalle_count INT;
                    DECLARE detalle_i INT;
                    DECLARE tiempo_actual DATETIME;
                    DECLARE ppm_value INT;
    
                    DECLARE cur CURSOR FOR
                        SELECT id, tiempo_inicial, tiempo_final FROM fuga_gas;
    
                    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
                    OPEN cur;
    
                    read_loop: LOOP
                        FETCH cur INTO fuga_id, tiempo_i, tiempo_f;
                        IF done THEN
                            LEAVE read_loop;
                        END IF;
    
                        -- Definir cantidad aleatoria de detalles entre 10 y 20
                        SET detalle_count = FLOOR(10 + RAND() * 11);
                        SET detalle_i = 1;
    
                        WHILE detalle_i <= detalle_count DO
                            -- Generar tiempo aleatorio entre inicio y fin
                            SET tiempo_actual = DATE_ADD(tiempo_i, INTERVAL FLOOR(RAND() * TIMESTAMPDIFF(SECOND, tiempo_i, tiempo_f)) SECOND);
                            -- Generar ppm aleatorio entre 3000 y 8000
                            SET ppm_value = FLOOR(3000 + RAND() * 5000);
    
                            INSERT INTO detalles_fuga (id_fuga, tiempo, ppm)
                            VALUES (fuga_id, tiempo_actual, ppm_value);
    
                            SET detalle_i = detalle_i + 1;
                        END WHILE;
    
                    END LOOP;
    
                    CLOSE cur;
                END;
            `);
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
    console.log("El resultado es: ", results)
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
        console.log(req.body)
        
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