// Importa o módulo 'express', que é o nosso framework web.
// Ele nos ajuda a criar servidores HTTP e definir rotas de forma mais fácil.
const express = require('express');

// Importa o módulo 'sqlite3', que nos permite interagir com o banco de dados SQLite.
// '.verbose()' é usado para ativar mensagens de erro mais detalhadas, o que é útil no desenvolvimento.
const sqlite3 = require('sqlite3').verbose();

// Cria uma instância do aplicativo Express.
// 'app' será nosso objeto principal para configurar o servidor, rotas e middlewares.
const app = express();

// Define a porta em que o servidor irá escutar as requisições.
// 'process.env.PORT' é para ambientes de produção (onde a porta pode ser definida por uma variável de ambiente).
// Se não estiver em produção, ele usa a porta 3000 como padrão.
const PORT = process.env.PORT || 3000;

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

// ... e todas as outras rotas GET /tarefas, GET /tarefas/:id (a sua rota simplificada de teste), PUT, PATCH, DELETE ...
// --- Conexão com o Banco de Dados SQLite ---

// Abre uma conexão com o banco de dados.
// './tasks.db' é o caminho para o arquivo do seu banco de dados.
// Se o arquivo 'tasks.db' não existir, o sqlite3 o criará automaticamente.
// A função de callback (err) é executada assim que a tentativa de conexão termina.
const db = new sqlite3.Database('./tasks.db', (err) => {
    if (err) {
        // Se houver um erro ao abrir o banco de dados, ele será logado no console.
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        // Se a conexão for bem-sucedida, uma mensagem será logada.
        console.log('Conectado ao banco de dados SQLite.');

        // --- Criação da Tabela (se não existir) ---
        // 'db.run()' é usado para executar comandos SQL que não retornam dados (como CREATE TABLE, INSERT, UPDATE, DELETE).
        // 'CREATE TABLE IF NOT EXISTS tarefas' - cria a tabela 'tarefas' SOMENTE se ela ainda não existir.
        // Isso evita erros se você rodar o servidor várias vezes.
        db.run(`CREATE TABLE IF NOT EXISTS tarefas (
            id INTEGER PRIMARY KEY AUTOINCREMENT, -- ID único, gerado automaticamente, chave primária
            titulo TEXT NOT NULL,                -- Título da tarefa, não pode ser nulo
            descricao TEXT,                      -- Descrição da tarefa, pode ser nulo
            data_vencimento TEXT NOT NULL,       -- Data limite, não pode ser nulo (armazenaremos como texto 'YYYY-MM-DD')
            concluida INTEGER DEFAULT 0,         -- Status de conclusão (0 para false, 1 para true), padrão é 0
            data_criacao TEXT NOT NULL           -- Data de criação, não pode ser nulo (armazenaremos como texto 'YYYY-MM-DD')
        )`, (createTableErr) => {
            if (createTableErr) {
                // Se houver um erro ao criar a tabela, ele será logado.
                console.error('Erro ao criar a tabela tarefas:', createTableErr.message);
            } else {
                // Mensagem de sucesso se a tabela for verificada/criada.
                console.log('Tabela tarefas verificada/criada com sucesso.');
            }
        });
    }
});

// --- Rotas da API ---
// Aqui é onde definimos como a API vai responder a diferentes URLs e métodos HTTP.

// Exemplo de rota POST para criar uma tarefa com SQLite
app.post('/tarefas', (req, res) => {
    // Desestrutura os dados do corpo da requisição (JSON enviado pelo frontend).
    const { titulo, descricao, data_vencimento } = req.body;

    // Validação básica: verifica se 'titulo' e 'data_vencimento' foram fornecidos.
    if (!titulo || !data_vencimento) {
        // Se não forem, retorna um erro 400 (Bad Request) com uma mensagem.
        return res.status(400).json({ mensagem: 'Título e data de vencimento são obrigatórios.' });
    }

    // Gera a data de criação no formato 'YYYY-MM-DD'.
    const data_criacao = new Date().toISOString().split('T')[0];

    // Comando SQL para inserir uma nova tarefa.
    // Os '?' são placeholders para evitar injeção de SQL (segurança!).
    const sql = `INSERT INTO tarefas (titulo, descricao, data_vencimento, concluida, data_criacao) VALUES (?, ?, ?, ?, ?)`;

    // 'db.run()' executa o comando SQL.
    // O array após 'sql' contém os valores que substituirão os '?'.
    // A função de callback (err) é executada após a inserção.
    // 'function(err)' com 'this.lastID' - Note que usamos uma 'function' tradicional para ter acesso ao 'this.lastID'.
    db.run(sql, [titulo, descricao || '', data_vencimento, 0, data_criacao], function(err) {
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
            data_criacao
        });
    });
});

// Exemplo de rota GET para listar todas as tarefas com SQLite
app.get('/tarefas', (req, res) => {
    // 'db.all()' é usado para executar comandos SQL que retornam múltiplas linhas de dados (como SELECT *).
    // O segundo parâmetro é um array de parâmetros (vazio neste caso, pois não há WHERE).
    // A função de callback (err, rows) é executada com o erro (se houver) e as linhas de dados.
    db.all("SELECT * FROM tarefas", [], (err, rows) => {
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

//2. GET /tarefas/:id - Obter uma tarefa específica
app.get('/tarefas/:id', (req, res) => {
    const id = parseInt(req.params.id); // É crucial que o ID seja um número inteiro
    const sql = `SELECT * FROM tarefas WHERE id = ?`;

    db.get(sql, [id], (err, row) => {
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

// 3. PUT /tarefas/:id - Atualizar todos os campos de uma tarefa
app.put('/tarefas/:id', (req, res) => {
    const id = parseInt(req.params.id);
    // Desestrutura TODOS os campos que esperamos que o frontend envie.
    const { titulo, descricao, data_vencimento, concluida } = req.body;

    // Validação: Todos os campos são obrigatórios para um PUT completo.
    if (titulo === undefined || descricao === undefined || data_vencimento === undefined || concluida === undefined) {
        return res.status(400).json({ mensagem: 'Todos os campos (titulo, descricao, data_vencimento, concluida) são obrigatórios para atualização PUT.' });
    }

    // SQLite armazena booleanos como INTEGER (0 para false, 1 para true).
    const concluidaDB = concluida ? 1 : 0;

    const sql = `UPDATE tarefas SET titulo = ?, descricao = ?, data_vencimento = ?, concluida = ? WHERE id = ?`;

    // 'db.run()' é usado para UPDATE. O terceiro parâmetro 'function(err)' nos dá 'this.changes'.
    db.run(sql, [titulo, descricao, data_vencimento, concluidaDB, id], function(err) {
        if (err) {
            console.error('Erro ao atualizar tarefa (PUT):', err.message);
            return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
        }
        // 'this.changes' indica o número de linhas afetadas (1 se a tarefa foi encontrada e atualizada, 0 caso contrário).
        if (this.changes > 0) {
            // Retorna a tarefa atualizada (você pode buscar ela do BD novamente ou retornar o que foi enviado).
            // Para simplificar, retornamos os dados que foram enviados, com o ID.
            res.json({ id, titulo, descricao, data_vencimento, concluida });
        } else {
            res.status(404).json({ mensagem: 'Tarefa não encontrada.' });
        }
    });
});

// 4. PATCH /tarefas/:id - Atualizar parcialmente uma tarefa (ex: marcar como concluída)
app.patch('/tarefas/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const updates = req.body; // O objeto 'updates' contém apenas os campos que o cliente quer mudar.

    // 1. Primeiro, vamos buscar a tarefa existente para ter os dados atuais.
    db.get(`SELECT * FROM tarefas WHERE id = ?`, [id], (err, existingTarefa) => {
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

        const sql = `UPDATE tarefas SET titulo = ?, descricao = ?, data_vencimento = ?, concluida = ? WHERE id = ?`;

        db.run(sql, [
            updatedFields.titulo,
            updatedFields.descricao,
            updatedFields.data_vencimento,
            updatedFields.concluida,
            id
        ], function(updateErr) {
            if (updateErr) {
                console.error('Erro ao atualizar tarefa (PATCH):', updateErr.message);
                return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
            }
            if (this.changes > 0) {
                // Retorna a tarefa atualizada (convertendo 'concluida' para boolean novamente)
                res.json({ ...updatedFields, id, concluida: updatedFields.concluida === 1, data_criacao: existingTarefa.data_criacao });
            } else {
                // Isso aconteceria se o ID não fosse encontrado (embora já checado acima)
                res.status(404).json({ mensagem: 'Tarefa não encontrada após tentativa de atualização.' });
            }
        });
    });
});

// 5. DELETE /tarefas/:id - Deletar uma tarefa
app.delete('/tarefas/:id', (req, res) => {
    const id = parseInt(req.params.id);

    const sql = `DELETE FROM tarefas WHERE id = ?`;

    // 'db.run()' para DELETE.
    db.run(sql, [id], function(err) {
        if (err) {
            console.error('Erro ao deletar tarefa:', err.message);
            return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
        }
        // 'this.changes' será 1 se uma linha foi deletada, 0 se não encontrou o ID.
        if (this.changes > 0) {
            // Status 204 No Content indica sucesso na operação de deleção, sem retornar corpo.
            res.status(204).send();
        } else {
            res.status(404).json({ mensagem: 'Tarefa não encontrada.' });
        }
    });
});

// Iniciar o servidor Express.
// 'app.listen()' faz com que o servidor comece a escutar requisições na porta definida (3000).
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});