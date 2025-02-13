const express = require('express');
const bodyParser = require('body-parser');
const Database = require('mysql2');
const app = express();
const port = 3000;

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'Neto_616',
    database: 'tscu'
};



const db = Database.createConnection(dbConfig).promise();
db.connect();

app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/servidorget', async (req, res) => {
  try {
    const results = await db.query('SELECT * FROM sensor');
    res.json(results);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post('/servidorpost', async (req, res) => {
    try {
        const sql = 'INSERT INTO sensor (dato, segundo) VALUES (?, ?)';
        const values = [req.body.dato, req.body.segundo];

        const result = await db.query(sql, values);

        res.json({ message: 'Datos insertados con �xito', id: result.insertId });
    } catch (err) {
        console.error('Error al insertar datos:', err);
        res.status(500).json({ error: 'Error al insertar datos en la base de datos' });
    }
});


app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
