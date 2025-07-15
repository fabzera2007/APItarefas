// script.js

const API_BASE_URL = 'http://localhost:3000/tarefas'; // URL base da sua API (onde o backend está rodando)
const tarefasLista = document.getElementById('tarefas-lista');
const formAdicionarTarefa = document.getElementById('form-adicionar-tarefa');
const inputTitulo = document.getElementById('input-titulo');
const inputDataVencimento = document.getElementById('input-data-vencimento');
const inputDescricao = document.getElementById('input-descricao');

// --- Função para buscar e exibir todas as tarefas ---
async function carregarTarefas() {
    tarefasLista.innerHTML = '<li>Carregando tarefas...</li>'; // Mensagem enquanto carrega
    try {
        const response = await fetch(API_BASE_URL); // Faz uma requisição GET para sua API
        if (!response.ok) { // Verifica se a resposta foi bem-sucedida (status 2xx)
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }
        const tarefas = await response.json(); // Converte a resposta para JSON

        tarefasLista.innerHTML = ''; // Limpa a lista antes de adicionar as tarefas

        if (tarefas.length === 0) {
            tarefasLista.innerHTML = '<li>Nenhuma tarefa encontrada. Adicione uma!</li>';
            return;
        }

        tarefas.forEach(tarefa => {
            const li = document.createElement('li');
            li.className = tarefa.concluida ? 'tarefa-concluida' : ''; // Adiciona classe CSS se concluída

            li.innerHTML = `
                <div>
                    <strong>${tarefa.titulo}</strong> (Vence em: ${tarefa.data_vencimento})
                    <p>${tarefa.descricao || 'Sem descrição'}</p>
                </div>
                <div>
                    <button class="btn-toggle" data-id="${tarefa.id}" data-concluida="${tarefa.concluida}">
                        ${tarefa.concluida ? 'Desmarcar' : 'Concluir'}
                    </button>
                    <button class="btn-delete" data-id="${tarefa.id}">Excluir</button>
                </div>
            `;
            tarefasLista.appendChild(li);
        });
    } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
        // Mensagem de erro mais detalhada para o usuário, sugerindo o que verificar
        tarefasLista.innerHTML = `<li>Erro ao carregar tarefas: ${error.message}. <br>Verifique se a API está rodando em ${API_BASE_URL} e se o CORS está configurado corretamente.</li>`;
    }
}

// --- Função para adicionar uma nova tarefa ---
formAdicionarTarefa.addEventListener('submit', async (event) => {
    event.preventDefault(); // Impede o comportamento padrão de recarregar a página

    const novaTarefa = {
        titulo: inputTitulo.value,
        data_vencimento: inputDataVencimento.value,
        descricao: inputDescricao.value
    };

    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST', // Método HTTP POST
            headers: {
                'Content-Type': 'application/json' // Indica que estamos enviando JSON
            },
            body: JSON.stringify(novaTarefa) // Converte o objeto JS para string JSON
        });

        if (!response.ok) {
            // Tenta pegar a mensagem de erro do corpo da resposta da API
            const errorData = await response.json().catch(() => ({ mensagem: 'Formato de erro desconhecido.' }));
            throw new Error(`Erro ao adicionar tarefa: ${response.status} - ${errorData.mensagem || 'Erro desconhecido'}`);
        }

        // Limpa o formulário após sucesso
        inputTitulo.value = '';
        inputDataVencimento.value = '';
        inputDescricao.value = '';
        await carregarTarefas(); // Recarrega a lista de tarefas para mostrar a nova
    } catch (error) {
        console.error('Erro ao adicionar tarefa:', error);
        alert(error.message); // Exibe o erro para o usuário
    }
});

// --- Lógica para deletar ou marcar/desmarcar tarefa (usando delegação de eventos) ---
tarefasLista.addEventListener('click', async (event) => {
    const target = event.target; // O elemento clicado

    // Lógica para o botão Excluir
    if (target.classList.contains('btn-delete')) {
        const id = target.dataset.id; // Pega o ID da tarefa do atributo data-id do botão
        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
            try {
                const response = await fetch(`${API_BASE_URL}/${id}`, {
                    method: 'DELETE' // Método HTTP DELETE
                });

                if (!response.ok) {
                    throw new Error(`Erro ao excluir tarefa! Status: ${response.status}`);
                }
                await carregarTarefas(); // Recarrega a lista para remover a tarefa excluída
            } catch (error) {
                console.error('Erro ao excluir tarefa:', error);
                alert(error.message);
            }
        }
    }

    // Lógica para o botão Concluir/Desmarcar
    if (target.classList.contains('btn-toggle')) {
        const id = target.dataset.id;
        // O atributo data-concluida no HTML é uma string ('true' ou 'false'), precisa converter para boolean
        const concluidaAtual = target.dataset.concluida === 'true'; 

        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'PATCH', // Método HTTP PATCH para atualização parcial
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ concluida: !concluidaAtual }) // Inverte o status (true vira false, false vira true)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ mensagem: 'Formato de erro desconhecido.' }));
                throw new Error(`Erro ao ${concluidaAtual ? 'desmarcar' : 'concluir'} tarefa: ${response.status} - ${errorData.mensagem || 'Erro desconhecido'}`);
            }
            await carregarTarefas(); // Recarrega a lista para refletir a mudança de status
        } catch (error) {
            console.error('Erro ao marcar/desmarcar tarefa:', error);
            alert(error.message);
        }
    }
});


// --- Carrega as tarefas quando a página é carregada ---
// Isso garante que a função carregarTarefas() seja chamada assim que o HTML estiver pronto
document.addEventListener('DOMContentLoaded', carregarTarefas);