const API_BASE_AUTH_URL = 'http://localhost:3000'; // Sua URL base da API
const loginForm = document.getElementById('loginForm'); //
const registerForm = document.getElementById('registerForm');
const showRegisterBtn = document.getElementById('showRegister');
const showLoginBtn = document.getElementById('showLogin');
const loginAlerts = document.getElementById('loginAlerts');
const registerAlerts = document.getElementById('registerAlerts');

// Função para mostrar alertas
function showAlert(message, type, targetElement) {
    targetElement.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
}

// Alternar entre formulários de Login e Registro
showRegisterBtn.addEventListener('click', () => {
    loginForm.classList.add('d-none');
    registerForm.classList.remove('d-none');
    loginAlerts.innerHTML = ''; // Limpa alertas ao alternar
    registerAlerts.innerHTML = '';
});

showLoginBtn.addEventListener('click', () => {
    registerForm.classList.add('d-none');
    loginForm.classList.remove('d-none');
    loginAlerts.innerHTML = ''; // Limpa alertas ao alternar
    registerAlerts.innerHTML = '';
});

// Lógica de Registro
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUser').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPass').value;

    try {
        const response = await fetch(`${API_BASE_AUTH_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(data.mensagem, 'success', registerAlerts);
            registerForm.reset(); // Limpa o formulário
            // Opcional: Alternar para o formulário de login após o registro bem-sucedido
            showLoginBtn.click();
        } else {
            showAlert(data.mensagem || 'Erro ao registrar.', 'danger', registerAlerts);
        }
    } catch (error) {
        console.error('Erro de rede ou servidor ao registrar:', error);
        showAlert('Erro de conexão. Tente novamente mais tarde.', 'danger', registerAlerts);
    }
});

// Lógica de Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPass').value;

    try {
        const response = await fetch(`${API_BASE_AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.token); // Armazena o token
            localStorage.setItem('user', JSON.stringify(data.user)); // Armazena info do usuário
            window.location.href = 'dashboard.html'; // Redireciona para o dashboard
        } else {
            showAlert(data.mensagem || 'Credenciais inválidas.', 'danger', loginAlerts);
        }
    } catch (error) {
        console.error('Erro de rede ou servidor ao fazer login:', error);
        showAlert('Erro de conexão. Tente novamente mais tarde.', 'danger', loginAlerts);
    }
});