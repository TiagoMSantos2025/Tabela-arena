// admin-script.js
const ADMIN_PASSWORD = 'Arenacold29'; // Senha para a área de administração
const ADMIN_ACCESS_KEY = 'coldfoxAdminLoggedIn'; // Chave para armazenar o status de login na sessionStorage
const MATCH_IDS_STORAGE_KEY = 'coldfoxMatchIds';
const PLAYER_NAMES_STORAGE_KEY = 'coldfoxPlayerNames';

// Elementos HTML da seção de partidas
const matchIdInput = document.getElementById('matchIdInput');
const addMatchIdButton = document.getElementById('addMatchIdButton');
const saveMatchIdsButton = document.getElementById('saveMatchIdsButton');
const matchIdMessage = document.getElementById('matchIdMessage');
const matchIdsList = document.getElementById('matchIdsList');

// Elementos HTML da seção de jogadores
const newPlayerNameInput = document.getElementById('newPlayerNameInput');
const newPlayerIdInput = document.getElementById('newPlayerIdInput');
const addPlayerButton = document.getElementById('addPlayerButton');
const savePlayerNamesButton = document.getElementById('savePlayerNamesButton');
const playerMessage = document.getElementById('playerMessage');
const playerList = document.getElementById('playerList');

let matchIds = [];
let playerNames = []; // [{ name: "Nome", id: 12345 }]

// --- Funções de Acesso/Logout da Administração ---
function checkAdminAccess() {
    const hasAccess = sessionStorage.getItem(ADMIN_ACCESS_KEY) === 'true';

    if (!hasAccess) {
        let enteredPassword = prompt('Por favor, digite a senha de administrador para acessar esta página:');
        
        if (enteredPassword === ADMIN_PASSWORD) {
            sessionStorage.setItem(ADMIN_ACCESS_KEY, 'true');
            // Não há necessidade de recarregar ou redirecionar se o login foi bem-sucedido
            // A página já está carregada e o acesso foi concedido.
            // Apenas continue a execução do script para carregar os dados.
        } else {
            alert('Senha incorreta! Você será redirecionado para a página de login.');
            window.location.href = 'login.html'; // Redireciona para a página de login
        }
    }
    // Se já tem acesso (hasAccess é true) ou acabou de logar, o script continua normalmente
}

function revokeAdminAccess() {
    sessionStorage.removeItem(ADMIN_ACCESS_KEY);
    window.location.href = 'login.html'; // Sempre redireciona para login ao fazer logout
}

// Restante do código (loadMatchIds, saveMatchIds, renderMatchIds, addMatchId, removeMatchId,
// loadPlayerNames, savePlayerNames, renderPlayerNames, addPlayer, removePlayer e Event Listeners)
// permanece EXATAMENTE como na última versão que te enviei.
// Não é necessário copiar e colar tudo de novo, apenas a função checkAdminAccess se você já tem o resto.


// --- Funções de Gerenciamento de IDs de Partida ---
function loadMatchIds() {
    const storedMatchIds = localStorage.getItem(MATCH_IDS_STORAGE_KEY);
    if (storedMatchIds) {
        matchIds = JSON.parse(storedMatchIds);
    } else {
        matchIds = [];
    }
    renderMatchIds();
}

function saveMatchIds() {
    localStorage.setItem(MATCH_IDS_STORAGE_KEY, JSON.stringify(matchIds));
    matchIdMessage.className = 'message success';
    matchIdMessage.textContent = 'IDs de partida salvos com sucesso!';
    matchIdMessage.style.display = 'block';
    setTimeout(() => { matchIdMessage.style.display = 'none'; }, 3000);
}

function renderMatchIds() {
    matchIdsList.innerHTML = '';
    if (matchIds.length === 0) {
        matchIdsList.innerHTML = '<li>Nenhum ID de partida cadastrado.</li>';
        return;
    }
    matchIds.forEach(id => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${id}</span>
            <button class="button-danger" data-id="${id}">Remover</button>
        `;
        matchIdsList.appendChild(li);
    });
}

function addMatchId() {
    const id = matchIdInput.value.trim();
    if (id && !matchIds.includes(id)) {
        matchIds.push(id);
        matchIdInput.value = '';
        renderMatchIds();
        saveMatchIds(); // Salva automaticamente ao adicionar
    } else if (id && matchIds.includes(id)) {
        matchIdMessage.className = 'message error';
        matchIdMessage.textContent = 'Este ID de partida já foi adicionado.';
        matchIdMessage.style.display = 'block';
    } else {
        matchIdMessage.className = 'message error';
        matchIdMessage.textContent = 'Por favor, insira um ID de partida válido.';
        matchIdMessage.style.display = 'block';
    }
    setTimeout(() => { matchIdMessage.style.display = 'none'; }, 3000);
}

function removeMatchId(idToRemove) {
    matchIds = matchIds.filter(id => id !== idToRemove);
    renderMatchIds();
    saveMatchIds(); // Salva automaticamente ao remover
}

// --- Funções de Gerenciamento de Jogadores ---
function loadPlayerNames() {
    const storedPlayerNames = localStorage.getItem(PLAYER_NAMES_STORAGE_KEY);
    if (storedPlayerNames) {
        playerNames = JSON.parse(storedPlayerNames);
    } else {
        playerNames = [];
    }
    renderPlayerNames();
}

function savePlayerNames() {
    localStorage.setItem(PLAYER_NAMES_STORAGE_KEY, JSON.stringify(playerNames));
    playerMessage.className = 'message success';
    playerMessage.textContent = 'Jogadores salvos com sucesso!';
    playerMessage.style.display = 'block';
    setTimeout(() => { playerMessage.style.display = 'none'; }, 3000);
}

function renderPlayerNames() {
    playerList.innerHTML = '';
    if (playerNames.length === 0) {
        playerList.innerHTML = '<li>Nenhum jogador registrado.</li>';
        return;
    }
    playerNames.forEach(player => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${player.name} (ID: ${player.id})</span>
            <button class="button-danger" data-id="${player.id}">Remover</button>
        `;
        playerList.appendChild(li);
    });
}

function addPlayer() {
    const name = newPlayerNameInput.value.trim();
    const id = parseInt(newPlayerIdInput.value.trim()); // Converte para número

    if (name && !isNaN(id) && id > 0) {
        // Verifica se o ID já existe
        if (playerNames.some(p => p.id === id)) {
            playerMessage.className = 'message error';
            playerMessage.textContent = 'Este ID de jogador já está registrado.';
            playerMessage.style.display = 'block';
            setTimeout(() => { playerMessage.style.display = 'none'; }, 3000);
            return;
        }
        playerNames.push({ name: name, id: id });
        newPlayerNameInput.value = '';
        newPlayerIdInput.value = '';
        renderPlayerNames();
        savePlayerNames(); // Salva automaticamente ao adicionar
    } else {
        playerMessage.className = 'message error';
        playerMessage.textContent = 'Por favor, insira um nome e um ID de jogador válidos.';
        playerMessage.style.display = 'block';
    }
    setTimeout(() => { playerMessage.style.display = 'none'; }, 3000);
}

function removePlayer(idToRemove) {
    playerNames = playerNames.filter(player => player.id !== parseInt(idToRemove)); // Converte para número antes de comparar
    renderPlayerNames();
    savePlayerNames(); // Salva automaticamente ao remover
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess(); // Esta função agora lida com o prompt e o redirecionamento
    // As próximas linhas só serão executadas se o acesso for concedido
    loadMatchIds();
    loadPlayerNames();

    document.getElementById('logoutAdminButton').addEventListener('click', revokeAdminAccess);

    addMatchIdButton.addEventListener('click', addMatchId);
    saveMatchIdsButton.addEventListener('click', saveMatchIds);
    matchIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addMatchId();
        }
    });

    matchIdsList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && e.target.textContent === 'Remover') {
            removeMatchId(e.target.dataset.id);
        }
    });

    addPlayerButton.addEventListener('click', addPlayer);
    savePlayerNamesButton.addEventListener('click', savePlayerNames);
    newPlayerIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addPlayer();
        }
    });

    playerList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && e.target.textContent === 'Remover') {
            removePlayer(e.target.dataset.id);
        }
    });
});