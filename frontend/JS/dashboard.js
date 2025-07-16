const API_BASE_URL = 'http://localhost:3000/tarefas'; //
const boardMainContent = document.getElementById('boardMainContent'); // Novo nome para a área principal do board
const loadingBoards = document.getElementById('loadingBoards'); // Mensagem de carregamento dos quadros
const userGreet = document.getElementById('userGreet');
const welcomeUserName = document.getElementById('welcomeUserName');
const userAvatarText = document.getElementById('userAvatarText'); // Novo para o avatar
const logoutBtn = document.getElementById('logoutBtn');
const homeLink = document.getElementById('homeLink');

// Elementos da Navbar
const navAddEventBtn = document.getElementById('navAddEventBtn'); // Renomeado
const searchBar = document.getElementById('searchBar');

// Elementos da Tela de Boas-Vindas
const welcomeScreen = document.getElementById('welcomeScreen');
const startAddingBtn = document.getElementById('startAddingBtn');
const startViewingBtn = document.getElementById('startViewingBtn');

// Elementos da Sidebar
const sidebarAllEvents = document.getElementById('sidebarAllEvents'); // Novo item da sidebar
const sidebarAddEvent = document.getElementById('sidebarAddEvent'); // Novo item da sidebar
const sidebarAddCardFixedBtn = document.getElementById('sidebarAddCardFixedBtn'); // Botão "Adicionar Cartão" na sidebar
const sidebarFilterItems = document.querySelectorAll('.sidebar-section.my-boards-section .sidebar-menu-item'); // Filtros de status na sidebar

// Modal para Adicionar Evento
const addEventModal = new bootstrap.Modal(document.getElementById('addEventModal'));
const addEventForm = document.getElementById('addEventForm');
const addEventAlerts = document.getElementById('addEventAlerts');

// Modal para Detalhes/Edição de Evento
const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
const editEventForm = document.getElementById('editEventForm');
const editId = document.getElementById('editId');
const editTitulo = document.getElementById('editTitulo');
const editData = document.getElementById('editData');
const editHoraIni = document.getElementById('editHoraIni');
const editHoraFim = document.getElementById('editHoraFim');
const editLocal = document.getElementById('editLocal');
const editDesc = document.getElementById('editDesc');
const editConcluida = document.getElementById('editConcluida');
const editEventAlerts = document.getElementById('editEventAlerts');
const deleteEventBtn = document.getElementById('deleteEventBtn');

// Variáveis de estado para filtros
let currentSearchTerm = '';
let currentStatusFilter = 'all';

// --- Funções Auxiliares ---
function getToken() {
    return localStorage.getItem('authToken');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function showAlert(message, type, targetElement) {
    targetElement.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close ${type === 'danger' ? 'btn-close-white' : ''}" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
}

// --- Funções de Navegação de Tela ---
function showWelcomeScreen() {
    welcomeScreen.classList.remove('d-none');
    boardMainContent.classList.add('d-none');
    // Remover a classe 'active' de todos os itens da sidebar
    document.querySelectorAll('.sidebar-menu-item').forEach(item => item.classList.remove('active'));
}

function showBoardContent() {
    welcomeScreen.classList.add('d-none');
    boardMainContent.classList.remove('d-none');
    // Ativar o item "Meus Quadros" na sidebar por padrão ao mostrar o board
    document.querySelectorAll('.sidebar-menu-item').forEach(item => item.classList.remove('active'));
    sidebarAllEvents.classList.add('active');
    loadAllEventsAndRenderBoards(); // Carrega os eventos ao mostrar o board
}

// --- Renderizar Quadros (Listas) e Cartões ---
async function renderBoards(eventsToRender) {
    boardMainContent.innerHTML = ''; // Limpa o conteúdo atual

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lists = {
        'today': { title: 'Hoje', events: [] },
        'this-week': { title: 'Esta Semana', events: [] },
        'later': { title: 'Mais Tarde', events: [] },
        'completed': { title: 'Concluídos', events: [] }
    };

    eventsToRender.forEach(event => {
        const eventDate = new Date(event.data_evento + 'T00:00:00');
        eventDate.setHours(0, 0, 0, 0);

        if (event.concluida) {
            lists['completed'].events.push(event);
        } else if (eventDate.getTime() === today.getTime()) {
            lists['today'].events.push(event);
        } else if (eventDate > today && eventDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
            lists['this-week'].events.push(event);
        } else {
            lists['later'].events.push(event);
        }
    });

    for (const key in lists) {
        lists[key].events.sort((a, b) => {
            const dateA = new Date(`${a.data_evento}T${a.hora_inicio}`);
            const dateB = new Date(`${b.data_evento}T${b.hora_inicio}`);
            return dateA - dateB;
        });
    }

    for (const key in lists) {
        const list = lists[key];
        const listElement = document.createElement('div');
        listElement.className = 'board-list';
        listElement.dataset.listId = key;

        listElement.innerHTML = `
            <div class="list-header">
                <h4>${list.title}</h4>
                <button class="list-options-btn"><i class="fas fa-ellipsis-h"></i></button>
            </div>
            <div class="list-cards-container" id="list-cards-${key}">
                </div>
            <button class="add-card-in-list-btn" data-bs-toggle="modal" data-bs-target="#addEventModal">
                <i class="fas fa-plus"></i> Adicionar um cartão
            </button>
        `;
        boardMainContent.appendChild(listElement);

        const cardsContainer = listElement.querySelector('.list-cards-container');
        if (list.events.length === 0) {
            cardsContainer.innerHTML = `<p class="text-white-50 text-center mt-3 small">Nenhum evento aqui.</p>`;
        } else {
            list.events.forEach(event => {
                const card = document.createElement('div');
                card.className = `list-card ${event.concluida ? 'done' : ''}`;
                card.dataset.id = event.id;
                card.innerHTML = `
                    <div class="card-title">${event.titulo}</div>
                    <div class="card-meta">
                        ${event.data_evento && event.hora_inicio ? `<span class="card-meta-item due-date"><i class="far fa-clock"></i> ${event.data_evento} ${event.hora_inicio}</span>` : ''}
                        ${event.descricao ? `<span class="card-meta-item" title="Descrição"><i class="far fa-file-alt"></i></span>` : ''}
                        ${event.local ? `<span class="card-meta-item" title="Local"><i class="fas fa-map-marker-alt"></i></span>` : ''}
                        ${event.concluida ? `<span class="card-meta-item"><i class="fas fa-check"></i></span>` : ''}
                    </div>
                `;
                cardsContainer.appendChild(card);
            });
        }
    }
}

// --- Carregar Todos os Eventos e Renderizar Quadros (com filtros) ---
async function loadAllEventsAndRenderBoards() {
    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    loadingBoards.classList.remove('d-none');
    boardMainContent.innerHTML = '';

    try {
        const response = await fetch(API_BASE_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                alert('Sessão expirada ou não autorizada. Faça login novamente.');
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }
        let allEvents = await response.json();

        // Aplicar filtro de pesquisa
        if (currentSearchTerm) {
            const lowerSearchTerm = currentSearchTerm.toLowerCase();
            allEvents = allEvents.filter(event =>
                event.titulo.toLowerCase().includes(lowerSearchTerm) ||
                (event.descricao && event.descricao.toLowerCase().includes(lowerSearchTerm)) ||
                (event.local && event.local.toLowerCase().includes(lowerSearchTerm))
            );
        }

        // Aplicar filtro de status da sidebar
        if (currentStatusFilter !== 'all') {
            allEvents = allEvents.filter(event => (event.concluida === true && currentStatusFilter === 'completed') || (event.concluida === false && currentStatusFilter === 'pending'));
        }

        loadingBoards.classList.add('d-none');
        if (allEvents.length === 0) {
            boardMainContent.innerHTML = '<p class="text-center text-white-50 mt-5">Nenhum compromisso encontrado com os filtros aplicados.</p>';
            return;
        }

        renderBoards(allEvents);

    } catch (error) {
        console.error('Erro ao carregar compromissos:', error);
        loadingBoards.classList.remove('d-none');
        loadingBoards.innerHTML = `Erro ao carregar compromissos: ${error.message}. Verifique sua conexão ou se a API está rodando.`;
    }
}

// --- Adicionar Novo Evento (Modal) ---
addEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
        showAlert('Você precisa estar logado para adicionar um compromisso.', 'danger', addEventAlerts);
        return;
    }

    const newEvent = {
        titulo: document.getElementById('inputTitulo').value,
        data_evento: document.getElementById('inputData').value,
        hora_inicio: document.getElementById('inputHoraIni').value,
        hora_fim: document.getElementById('inputHoraFim').value || null,
        local: document.getElementById('inputLocal').value || null,
        descricao: document.getElementById('inputDesc').value || null
    };

    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newEvent)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensagem || 'Erro ao adicionar compromisso.');
        }

        showAlert('Compromisso adicionado com sucesso!', 'success', addEventAlerts);
        addEventForm.reset();
        addEventModal.hide();
        await loadAllEventsAndRenderBoards(); // Recarrega todos os eventos para atualizar os quadros
    } catch (error) {
        console.error('Erro ao adicionar compromisso:', error);
        showAlert(error.message, 'danger', addEventAlerts);
    }
});

// --- Lógica para Abrir Modal de Detalhes do Cartão ---
boardMainContent.addEventListener('click', async (e) => {
    const card = e.target.closest('.list-card');
    if (!card) return;

    const eventId = card.dataset.id;
    const token = getToken();

    if (!token) {
        alert('Você precisa estar logado para visualizar detalhes.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${eventId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const event = await response.json();

        if (!response.ok) {
            throw new Error(event.mensagem || 'Erro ao carregar detalhes do compromisso.');
        }

        // Preenche o modal com os dados do evento
        editId.value = event.id;
        editTitulo.value = event.titulo;
        editData.value = event.data_evento;
        editHoraIni.value = event.hora_inicio;
        editHoraFim.value = event.hora_fim || '';
        editLocal.value = event.local || '';
        editDesc.value = event.descricao || '';
        editConcluida.checked = event.concluida;
        editEventAlerts.innerHTML = ''; // Limpa alertas anteriores

        detailModal.show(); // Exibe o modal de detalhes/edição

    } catch (error) {
        console.error('Erro ao buscar detalhes:', error);
        showAlert(error.message, 'danger', loadingBoards);
    }
});

// --- Salvar Edições do Modal de Detalhes ---
editEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = getToken();
    const id = editId.value;

    const updatedEvent = {
        titulo: editTitulo.value,
        data_evento: editData.value,
        hora_inicio: editHoraIni.value,
        hora_fim: editHoraFim.value || null,
        local: editLocal.value || null,
        descricao: editDesc.value || null,
        concluida: editConcluida.checked
    };

    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT', // PUT para atualização completa
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedEvent)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.mensagem || 'Erro ao salvar alterações.');
        }

        showAlert('Compromisso atualizado com sucesso!', 'success', editEventAlerts);
        await loadAllEventsAndRenderBoards(); // Recarrega todos os eventos
        setTimeout(() => detailModal.hide(), 1500); // Esconde modal após sucesso
    } catch (error) {
        console.error('Erro ao salvar edições:', error);
        showAlert(error.message, 'danger', editEventAlerts);
    }
});

// --- Excluir Evento do Modal de Detalhes ---
deleteEventBtn.addEventListener('click', async () => {
    const id = editId.value;
    const token = getToken();

    if (confirm('Tem certeza que deseja excluir este compromisso?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.mensagem || 'Erro ao excluir compromisso.');
            }

            showAlert('Compromisso excluído com sucesso!', 'success', editEventAlerts);
            await loadAllEventsAndRenderBoards(); // Recarrega todos os eventos
            setTimeout(() => detailModal.hide(), 1500); // Esconde modal após sucesso
        } catch (error) {
            console.error('Erro ao excluir:', error);
            showAlert(error.message, 'danger', editEventAlerts);
        }
    }
});

// --- Lógica de Pesquisa ---
searchBar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        currentSearchTerm = searchBar.value;
        showBoardContent(); // Isso vai chamar loadAllEventsAndRenderBoards com o novo termo
    }
});

// --- Lógica de Logout ---
logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});

// --- Eventos de Navegação e Sidebar ---
homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    showWelcomeScreen();
});

navAddEventBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addEventModal.show();
    addEventForm.reset();
    addEventAlerts.innerHTML = '';
});

sidebarAllEvents.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.sidebar-menu-item').forEach(item => item.classList.remove('active'));
    sidebarAllEvents.classList.add('active'); // Ativa o item "Meus Quadros"
    currentStatusFilter = 'all'; // Limpa filtro de status
    showBoardContent(); // Exibe o board com todos os eventos
});

sidebarAddEvent.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.sidebar-menu-item').forEach(item => item.classList.remove('active'));
    sidebarAddEvent.classList.add('active'); // Ativa o item "Adicionar Evento"
    addEventModal.show();
    addEventForm.reset();
    addEventAlerts.innerHTML = '';
});

sidebarAddCardFixedBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addEventModal.show();
});

startAddingBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addEventModal.show();
});

startViewingBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showBoardContent();
});

// Event listeners para os filtros de status na sidebar
sidebarFilterItems.forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.sidebar-menu-item').forEach(el => el.classList.remove('active'));
        this.classList.add('active');
        currentStatusFilter = this.dataset.filterStatus;
        showBoardContent(); // Recarrega os boards com o novo filtro de status
    });
});


// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    if (user && user.username) {
        userGreet.textContent = user.username;
        welcomeUserName.textContent = user.username;
        userAvatarText.textContent = user.username.charAt(0).toUpperCase(); // Primeira letra do nome no avatar
        showWelcomeScreen();
    } else {
        window.location.href = 'login.html';
    }
});