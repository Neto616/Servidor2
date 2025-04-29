require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require("path")
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use(require(path.join(__dirname, "./rutas.js")))

// app.post('/servidorpost', async (req, res) => {
//     try {
//         const sql = 'INSERT INTO sensor (dato, segundo) VALUES (?, ?)';
//         const values = [req.body.dato, req.body.segundo];

//         const [result] = await db.query(sql, values);

//         res.json({ message: 'Datos insertados con éxito', id: result.insertId });
//     } catch (err) {
//         console.error('Error al insertar datos:', err);
//         res.status(500).json({ error: 'Error al insertar datos en la base de datos' });
//     }
// });

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
