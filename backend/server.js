// Importa o módulo 'express', que é o nosso framework web.
// Ele nos ajuda a criar servidores HTTP e definir rotas de forma mais fácil.
const express = require('express');

// Importa o módulo 'sqlite3', que nos permite interagir com o banco de dados SQLite.
// '.verbose()' é usado para ativar mensagens de erro mais detalhadas, o que é útil no desenvolvimento.
const sqlite3 = require('sqlite3').verbose();

const cors = require('cors'); //é um mecanismo de segurança necessário para que um navegador permita que um 
// site em um domínio (o frontend, por exemplo, http://localhost:5500) faça requisições para um domínio diferente 
// (sua API, http://localhost:3000).
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // <<< ADICIONE ESTA LINHA AQUI
// Cria uma instância do aplicativo Express.
// 'app' será nosso objeto principal para configurar o servidor, rotas e middlewares.
const app = express();

// --- Middleware de Autenticação ---
// Esta função irá verificar o JWT em cada requisição para rotas protegidas.
const authenticateToken = (req, res, next) => {
    // O token geralmente é enviado no cabeçalho 'Authorization' como 'Bearer SEU_TOKEN'
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Pega o token após "Bearer "

    if (token == null) {
        // Se não há token, retorna 401 Unauthorized
        return res.status(401).json({ mensagem: 'Token de autenticação ausente.' });
    }

    // Verifica o token com a chave secreta
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // Se o token for inválido ou expirou, retorna 403 Forbidden
            return res.status(403).json({ mensagem: 'Token de autenticação inválido ou expirado.' });
        }
        // Se o token for válido, as informações do usuário são anexadas ao objeto de requisição
        req.user = user; // Agora, qualquer rota seguinte terá acesso a req.user.id, req.user.username, etc.
        next(); // Continua para a próxima função (a rota propriamente dita)
    });
};
// Define a porta em que o servidor irá escutar as requisições.
// 'process.env.PORT' é para ambientes de produção (onde a porta pode ser definida por uma variável de ambiente).
// Se não estiver em produção, ele usa a porta 3000 como padrão.
const PORT = process.env.PORT || 3000;  
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_muito_segura_e_longa'; // <<< ADICIONE ESTA LINHA

// --- Middleware ---
// Um middleware é uma função que tem acesso aos objetos de requisição (req), resposta (res)
// e à próxima função middleware no ciclo de requisição-resposta do aplicativo.
// Ele pode executar código, fazer alterações nos objetos de req e res,
// e finalizar o ciclo de requisição-resposta ou chamar o próximo middleware.

// Este middleware 'express.json()' é crucial!
// Ele faz com que o Express entenda e analise corpos de requisição que vêm em formato JSON.
// Por exemplo, quando o frontend envia dados para criar uma nova tarefa,
// eles virão em JSON, e este middleware os transformará em um objeto JavaScript acessível via 'req.body'.
app.use(express.json());

app.use(cors());
// ... e todas as outras rotas GET /tarefas, GET /tarefas/:id (a sua rota simplificada de teste), PUT, PATCH, DELETE ...
// --- Conexão com o Banco de Dados SQLite ---

// Abre uma conexão com o banco de dados.
// './tasks.db' é o caminho para o arquivo do seu banco de dados.
// Se o arquivo 'tasks.db' não existir, o sqlite3 o criará automaticamente.
// A função de callback (err) é executada assim que a tentativa de conexão termina.
// ... (código antes da conexão com o BD) ...

// --- Conexão com o Banco de Dados SQLite ---

// Abre uma conexão com o banco de dados.
const db = new sqlite3.Database('./tasks.db', (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');

        // 1. Criação da Tabela tarefas
        db.run(`CREATE TABLE IF NOT EXISTS tarefas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descricao TEXT,
            data_evento TEXT NOT NULL,        
            hora_inicio TEXT NOT NULL,         
            hora_fim TEXT,                   
            local TEXT,                        
            data_vencimento TEXT NOT NULL,
            concluida INTEGER DEFAULT 0,
            data_criacao TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES usuarios(id)
        )`, (createTableErr) => {
            if (createTableErr) {
                console.error('Erro ao criar a tabela tarefas:', createTableErr.message);
            } else {
                console.log('Tabela tarefas verificada/criada com sucesso.');

                // 2. Criação da Tabela usuarios (APENAS AQUI, DENTRO DO CALLBACK DE SUCESSO DE 'tarefas')
                // Isso garante que a tabela 'tarefas' já foi criada antes de tentar criar 'usuarios'.
                db.run(`CREATE TABLE IF NOT EXISTS usuarios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL
                )`, (createUsersTableErr) => {
                    if (createUsersTableErr) {
                        console.error('Erro ao criar a tabela usuarios:', createUsersTableErr.message);
                    } else {
                        console.log('Tabela usuarios verificada/criada com sucesso.');
                    }
                });
            }
        });
    }
});

// POSTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT

app.post('/tarefas', authenticateToken, (req, res) => {
    // Desestrutura os dados do corpo da requisição (JSON enviado pelo frontend).
    const { titulo, descricao, data_vencimento } = req.body;
    const user_id = req.user.id;

    // Validação básica: verifica se 'titulo' e 'data_vencimento' foram fornecidos.
    if (!titulo || !data_vencimento) {
        // Se não forem, retorna um erro 400 (Bad Request) com uma mensagem.
        return res.status(400).json({ mensagem: 'Título e data de vencimento são obrigatórios.' });
    }

    // Gera a data de criação no formato 'YYYY-MM-DD'.
    const data_criacao = new Date().toISOString().split('T')[0];

    // Comando SQL para inserir uma nova tarefa.
    // Os '?' são placeholders para evitar injeção de SQL (segurança!).
    const sql = `INSERT INTO tarefas (titulo, descricao, data_vencimento, concluida, data_criacao, user_id) VALUES (?, ?, ?, ?, ?, ?)`;

    // 'db.run()' executa o comando SQL.
    // O array após 'sql' contém os valores que substituirão os '?'.
    // A função de callback (err) é executada após a inserção.
    // 'function(err)' com 'this.lastID' - Note que usamos uma 'function' tradicional para ter acesso ao 'this.lastID'.
    db.run(sql, [titulo, descricao || '', data_vencimento, 0, data_criacao, user_id], function(err) {
        if (err) {
            // Se houver erro na inserção, loga e retorna um erro 500 (Internal Server Error).
            console.error('Erro ao inserir tarefa:', err.message);
            return res.status(500).json({ mensagem: 'Erro interno do servidor ao criar tarefa.' });
        }
        // Retorna a tarefa criada com o ID gerado pelo banco de dados (this.lastID).
        // 201 Created é o status HTTP para sucesso na criação de um recurso.
        res.status(201).json({
            id: this.lastID, // ID gerado automaticamente pelo SQLite
            titulo,
            descricao: descricao || '',
            data_vencimento,
            concluida: false, // Voltamos como false para o frontend (no BD é 0)
            data_criacao,
            user_id
        });
    });
});


// POSTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
// RREGISTERRRRRRRRRR

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // 1. Validação básica de entrada
    if (!username || !email || !password) {
        return res.status(400).json({ mensagem: 'Usuário, e-mail e senha são obrigatórios.' });
    }

    try {
        // 2. Gera o hash da senha de forma segura
        // '10' é o "saltRounds", que define a complexidade do hash. Um valor de 10-12 é comum.
        const password_hash = await bcrypt.hash(password, 10);

        // 3. Comando SQL para inserir o novo usuário no banco de dados
        const sql = `INSERT INTO usuarios (username, email, password_hash) VALUES (?, ?, ?)`;
        
        // 4. Executa a inserção no banco de dados
        db.run(sql, [username, email, password_hash], function(err) {
            if (err) {
                // Se houver um erro, verifica se é por violação de unicidade (usuário/email já existe)
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ mensagem: 'Usuário ou e-mail já registrado.' }); // 409 Conflict
                }
                console.error('Erro ao registrar usuário:', err.message);
                return res.status(500).json({ mensagem: 'Erro interno do servidor ao registrar usuário.' });
            }
            // 5. Retorna sucesso com o ID do novo usuário
            res.status(201).json({ id: this.lastID, username, email, mensagem: 'Usuário registrado com sucesso!' });
        });
    } catch (error) {
        // Captura erros no processo de hashing da senha
        console.error('Erro no processo de hash da senha:', error.message);
        return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
});

// POOOOOOOOOOOOOOOOOOOOOOOSTTTTTTTT
//LOGINNNNNNNNNNNNNNNN

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ mensagem: 'E-mail e senha são obrigatórios.' });
    }

    // 1. Busca o usuário pelo e-mail no banco de dados
    const sql = `SELECT * FROM usuarios WHERE email = ?`;
    db.get(sql, [email], async (err, user) => {
        if (err) {
            console.error('Erro ao buscar usuário para login:', err.message);
            return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
        }
        if (!user) {
            // Se o usuário não for encontrado, não revelamos se foi o email ou a senha
            // para evitar dicas a possíveis atacantes.
            return res.status(401).json({ mensagem: 'Credenciais inválidas.' }); // 401 Unauthorized
        }

        // 2. Compara a senha fornecida com o hash salvo no banco de dados
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ mensagem: 'Credenciais inválidas.' }); // 401 Unauthorized
        }

        // 3. Se a senha for válida, gera um JWT
        // O payload do JWT deve conter informações que identifiquem o usuário (ex: id do usuário).
        // NÃO inclua informações sensíveis como a senha!
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: '1h' } // O token expira em 1 hora
        );

        // 4. Retorna o token e algumas informações do usuário (sem a senha hash!)
        res.json({
            mensagem: 'Login bem-sucedido!',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    });
});



// GETTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT

app.get('/tarefas', authenticateToken, (req, res) => { // <<< ADICIONE authenticateToken aqui
    const user_id = req.user.id; // <<< PEGANDO O ID DO USUÁRIO AUTENTICADO
    // 'db.all()' é usado para executar comandos SQL que retornam múltiplas linhas de dados (como SELECT *).
    // O segundo parâmetro é um array de parâmetros (vazio neste caso, pois não há WHERE).
    // A função de callback (err, rows) é executada com o erro (se houver) e as linhas de dados.
    db.all("SELECT * FROM tarefas WHERE user_id = ?", [user_id], (err, rows) => {
        if (err) {
            // Se houver erro na busca, loga e retorna um erro 500.
            console.error('Erro ao buscar tarefas:', err.message);
            return res.status(500).json({ mensagem: 'Erro interno do servidor ao buscar tarefas.' });
        }
        // Mapeia as linhas retornadas do banco de dados.
        // O SQLite armazena booleanos como INTEGER (0 ou 1).
        // Convertemos 'concluida' de 0/1 para false/true para facilitar o uso no frontend.
        const tarefasFormatadas = rows.map(tarefa => ({
            ...tarefa, // Copia todas as outras propriedades da tarefa
            concluida: tarefa.concluida === 1 // Converte 0 para false, 1 para true
        }));
        res.json(tarefasFormatadas); // Retorna a lista de tarefas como JSON.
    });
});

//2. GETTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT ID

app.get('/tarefas/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id); // É crucial que o ID seja um número inteiro
    const user_id = req.user.id;
    const sql = `SELECT * FROM tarefas WHERE id = ? AND user_id = ?`;

    db.get(sql, [id, user_id], (err, row) => {
        if (err) {
            console.error('Erro ao buscar tarefa por ID:', err.message);
            return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
        }
        if (row) {
            const tarefaFormatada = { ...row, concluida: row.concluida === 1 };
            res.json(tarefaFormatada);
        } else {
            res.status(404).json({ mensagem: 'Tarefa não encontrada.' });
        }
    });
});

// 3. PUTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT

app.put('/tarefas/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const user_id = req.user.id;
    // Desestrutura TODOS os campos que esperamos que o frontend envie.
    const { titulo, descricao, data_vencimento, concluida } = req.body;

    // Validação: Todos os campos são obrigatórios para um PUT completo.
    if (titulo === undefined || descricao === undefined || data_vencimento === undefined || concluida === undefined) {
        return res.status(400).json({ mensagem: 'Todos os campos (titulo, descricao, data_vencimento, concluida) são obrigatórios para atualização PUT.' });
    }

    // SQLite armazena booleanos como INTEGER (0 para false, 1 para true).
    const concluidaDB = concluida ? 1 : 0;

    const sql = `UPDATE tarefas SET titulo = ?, descricao = ?, data_vencimento = ?, concluida = ? WHERE id = ? AND user_id = ?`;

    // 'db.run()' é usado para UPDATE. O terceiro parâmetro 'function(err)' nos dá 'this.changes'.
    db.run(sql, [titulo, descricao, data_vencimento, concluidaDB, id, user_id], function(err) {
        if (err) {
            console.error('Erro ao atualizar tarefa (PUT):', err.message);
            return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
        }
        // 'this.changes' indica o número de linhas afetadas (1 se a tarefa foi encontrada e atualizada, 0 caso contrário).
        if (this.changes > 0) {
            // Retorna a tarefa atualizada (você pode buscar ela do BD novamente ou retornar o que foi enviado).
            // Para simplificar, retornamos os dados que foram enviados, com o ID.
            res.json({ id, titulo, descricao, data_vencimento, concluida, user_id });
        } else {
            res.status(404).json({ mensagem: 'Tarefa não encontrada ou não pertence a este usuário.' });
        }
    });
});

// 4. PATCHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH

app.patch('/tarefas/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const user_id = req.user.id;
    const updates = req.body; // O objeto 'updates' contém apenas os campos que o cliente quer mudar.

    // 1. Primeiro, vamos buscar a tarefa existente para ter os dados atuais.
    db.get(`SELECT * FROM tarefas WHERE id = ? AND user_id = ?`, [id, user_id], (err, existingTarefa) => {
        if (err) {
            console.error('Erro ao buscar tarefa para PATCH:', err.message);
            return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
        }
        if (!existingTarefa) {
            return res.status(404).json({ mensagem: 'Tarefa não encontrada.' });
        }

        // 2. Cria um objeto com os novos valores, mesclando os existentes com os atualizados.
        // Cuidado especial com 'concluida': se for enviado, converte para 0 ou 1.
        const updatedFields = {
            titulo: updates.titulo !== undefined ? updates.titulo : existingTarefa.titulo,
            descricao: updates.descricao !== undefined ? updates.descricao : existingTarefa.descricao,
            data_vencimento: updates.data_vencimento !== undefined ? updates.data_vencimento : existingTarefa.data_vencimento,
            concluida: updates.concluida !== undefined ? (updates.concluida ? 1 : 0) : existingTarefa.concluida // Converte booleano
        };

        const sql = `UPDATE tarefas SET titulo = ?, descricao = ?, data_vencimento = ?, concluida = ? WHERE id = ? AND user_id = ?`;

        db.run(sql, [
            updatedFields.titulo,
            updatedFields.descricao,
            updatedFields.data_vencimento,
            updatedFields.concluida,
            id,
            user_id
        ], function(updateErr) {
            if (updateErr) {
                console.error('Erro ao atualizar tarefa (PATCH):', updateErr.message);
                return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
            }
            if (this.changes > 0) {
                // Retorna a tarefa atualizada (convertendo 'concluida' para boolean novamente)
                res.json({ ...updatedFields, id, concluida: updatedFields.concluida === 1, data_criacao: existingTarefa.data_criacao, user_id });
            } else {
                // Isso aconteceria se o ID não fosse encontrado (embora já checado acima)
                res.status(404).json({ mensagem: 'Tarefa não encontrada após tentativa de atualização.' });
            }
        });
    });
});

// 5. DELETEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE

app.delete('/tarefas/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const user_id = req.user.id;

    const sql = `DELETE FROM tarefas WHERE id = ?  AND user_id = ?`;

    // 'db.run()' para DELETE.
    db.run(sql, [id, user_id], function(err) {
        if (err) {
            console.error('Erro ao deletar tarefa:', err.message);
            return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
        }
        // 'this.changes' será 1 se uma linha foi deletada, 0 se não encontrou o ID.
        if (this.changes > 0) {
            // Status 204 No Content indica sucesso na operação de deleção, sem retornar corpo.
            res.status(204).send();
        } else {
            res.status(404).json({ mensagem: 'Tarefa não encontrada ou não pertence a este usuário.' });
        }
    });
});

// Iniciar o servidor Express.
// 'app.listen()' faz com que o servidor comece a escutar requisições na porta definida (3000).
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});