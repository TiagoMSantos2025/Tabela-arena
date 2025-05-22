const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public')); // Serve arquivos estáticos (HTML, CSS, JS)

// Simulação de um banco de dados (substitua por um banco de dados real)
const users = {
    admin: {
        password: 'senha_hash_segura' // Substitua pela senha hasheada
    }
};

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (users[username] && users[username].password === password) { // Use bcrypt para comparar senhas hasheadas
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});