// login.js - para a página de login
const CORRECT_USERNAME = 'admin'; // <<< Usuário de login
const CORRECT_PASSWORD = 'coldfoxgg25'; // <<< Senha de login (MESMA DA ADMIN)
const ADMIN_LOGGED_IN_KEY = 'coldfoxAdminLoggedIn'; // Chave para indicar login do admin

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const loginMessage = document.getElementById('loginMessage');

function showMessage(msg, type) {
    loginMessage.textContent = msg;
    loginMessage.className = `message ${type}`;
    setTimeout(() => {
        loginMessage.textContent = '';
        loginMessage.className = 'message';
    }, 5000);
}

function handleLogin() {
    const enteredUsername = usernameInput.value.trim();
    const enteredPassword = passwordInput.value.trim();

    if (enteredUsername === CORRECT_USERNAME && enteredPassword === CORRECT_PASSWORD) {
        // Se o login for bem-sucedido, define a flag de admin logado no localStorage
        localStorage.setItem(ADMIN_LOGGED_IN_KEY, 'true');
        showMessage('Login bem-sucedido! Redirecionando...', 'success');
        setTimeout(() => {
            window.location.href = 'admin.html'; // Redireciona para a página de administração
        }, 1000);
    } else {
        showMessage('Usuário ou senha incorretos.', 'error');
    }
}

// Event Listeners
loginButton.addEventListener('click', handleLogin);
passwordInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleLogin();
    }
});

// Limpa o estado de login se o usuário chegou aqui sem um login anterior
// Ou, se o usuário já estiver logado (para o admin), redireciona direto
document.addEventListener('DOMContentLoaded', () => {
    // Garante que o input de username tenha foco ao carregar a página
    usernameInput.focus();
});