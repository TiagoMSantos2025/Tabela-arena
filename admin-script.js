// admin-script.js
const ADMIN_PASSWORD = 'coldfoxgg25'; // <<< SENHA DE ADMINISTRAÇÃO
const MATCH_IDS_STORAGE_KEY = 'coldfoxMatchIds';
const PLAYERS_STORAGE_KEY = 'coldfoxPlayers'; 
const IS_LOGGED_IN_STORAGE_KEY = 'coldfoxAdminLoggedIn';

// Elementos HTML para autenticação e layout principal
const accessMessageDiv = document.getElementById('accessMessage');
const retryLoginButton = document.getElementById('retryLoginButton');
const adminContentDiv = document.getElementById('adminContent');
const logoutButton = document.getElementById('logoutButton');
const goToTableButton = document.getElementById('goToTableButton'); 

// Elementos para gerenciar IDs de Partidas
const matchIdInput = document.getElementById('matchIdInput');
const addMatchIdButton = document.getElementById('addMatchIdButton');
const saveMatchIdsButton = document.getElementById('saveMatchIdsButton'); 
const matchIdListUl = document.getElementById('matchIdList');
const matchIdMessageDiv = document.getElementById('matchIdMessage'); 

// Elementos para gerenciar Jogadores
const playerNameInput = document.getElementById('playerNameInput');
const playerIdInput = document.getElementById('playerIdInput');
const addPlayerButton = document.getElementById('addPlayerButton');
const savePlayersButton = document.getElementById('savePlayersButton');
const playerListUl = document.getElementById('playerList');
const playerMessageDiv = document.getElementById('playerMessage');

let matchIds = []; 
let players = []; // Armazena objetos { id: '...', name: '...' }

// --- Funções de gerenciamento de IDs de Partidas ---
function loadMatchIds() {
    const storedIds = localStorage.getItem(MATCH_IDS_STORAGE_KEY);
    if (storedIds) {
        matchIds = JSON.parse(storedIds);
    }
    renderMatchIds();
}

function saveMatchIds() {
    localStorage.setItem(MATCH_IDS_STORAGE_KEY, JSON.stringify(matchIds));
    showMessage('IDs de partidas salvos com sucesso!', 'success', matchIdMessageDiv);
}

function addMatchId() {
    const id = matchIdInput.value.trim();
    if (id && !matchIds.includes(id)) {
        matchIds.push(id);
        matchIdInput.value = '';
        renderMatchIds();
        showMessage('ID adicionado temporariamente. Clique em "Salvar IDs de Partida" para persistir.', 'success', matchIdMessageDiv);
    } else if (matchIds.includes(id)) {
        showMessage('Este ID já existe na lista!', 'error', matchIdMessageDiv);
    } else {
        showMessage('Por favor, insira um ID de partida válido.', 'error', matchIdMessageDiv);
    }
}

function renderMatchIds() {
    matchIdListUl.innerHTML = '';
    if (matchIds.length === 0) {
        matchIdListUl.innerHTML = '<li class="empty-list-message">Nenhum ID de partida cadastrado.</li>';
        return;
    }
    matchIds.forEach((id, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${id}</span> <button data-index="${index}" data-type="matchId">Remover</button>`;
        matchIdListUl.appendChild(li);
    });
    // Adiciona evento de clique aos botões de remover
    matchIdListUl.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', handleRemoveItem);
    });
}

// --- Funções de gerenciamento de Jogadores ---
function loadPlayers() {
    const storedPlayers = localStorage.getItem(PLAYERS_STORAGE_KEY);
    if (storedPlayers) {
        players = JSON.parse(storedPlayers);
    }
    renderPlayers();
}

function savePlayers() {
    localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(players));
    showMessage('Jogadores salvos com sucesso!', 'success', playerMessageDiv);
}

function addPlayer() {
    const name = playerNameInput.value.trim();
    const id = playerIdInput.value.trim();

    if (name && id) {
        // Verifica se o ID já existe
        const existingPlayer = players.find(p => p.id === id);
        if (existingPlayer) {
            // Se o ID existe, atualiza o nome
            existingPlayer.name = name;
            showMessage(`Nickname do jogador com ID ${id} atualizado para "${name}". Clique em "Salvar Jogadores" para persistir.`, 'success', playerMessageDiv);
        } else {
            // Se o ID não existe, adiciona novo jogador
            players.push({ id: id, name: name });
            showMessage('Jogador adicionado temporariamente. Clique em "Salvar Jogadores" para persistir.', 'success', playerMessageDiv);
        }
        
        playerNameInput.value = '';
        playerIdInput.value = '';
        renderPlayers();
    } else {
        showMessage('Por favor, insira o nickname e o ID do jogador.', 'error', playerMessageDiv);
    }
}

function renderPlayers() {
    playerListUl.innerHTML = '';
    if (players.length === 0) {
        playerListUl.innerHTML = '<li class="empty-list-message">Nenhum jogador cadastrado.</li>';
        return;
    }
    players.forEach((player, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${player.name} (ID: ${player.id})</span> <button data-index="${index}" data-type="player">Remover</button>`;
        playerListUl.appendChild(li);
    });
    // Adiciona evento de clique aos botões de remover
    playerListUl.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', handleRemoveItem);
    });
}

// Função genérica para remover item de lista (matchId ou player)
function handleRemoveItem(event) {
    const indexToRemove = event.target.dataset.index;
    const type = event.target.dataset.type;

    if (type === 'matchId') {
        matchIds.splice(indexToRemove, 1);
        renderMatchIds();
        showMessage('ID de partida removido temporariamente. Clique em "Salvar IDs de Partida" para persistir.', 'success', matchIdMessageDiv);
    } else if (type === 'player') {
        players.splice(indexToRemove, 1);
        renderPlayers();
        showMessage('Jogador removido temporariamente. Clique em "Salvar Jogadores" para persistir.', 'success', playerMessageDiv);
    }
}

// --- Função de mensagem (adaptada para aceitar o elemento de mensagem) ---
function showMessage(msg, type, msgElement) {
    msgElement.textContent = msg;
    msgElement.className = `message ${type}`; 
    setTimeout(() => {
        msgElement.textContent = '';
        msgElement.className = 'message';
    }, 5000); 
}

// --- Eventos ---
logoutButton.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja sair da administração?')) {
        localStorage.removeItem(IS_LOGGED_IN_STORAGE_KEY);
        window.location.href = 'login.html'; 
    }
});

goToTableButton.addEventListener('click', () => {
    window.location.href = 'tabela.html';
});

// Eventos para IDs de Partida
addMatchIdButton.addEventListener('click', addMatchId);
saveMatchIdsButton.addEventListener('click', saveMatchIds);

// Eventos para Jogadores
addPlayerButton.addEventListener('click', addPlayer);
savePlayersButton.addEventListener('click', savePlayers);

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem(IS_LOGGED_IN_STORAGE_KEY);

    if (isLoggedIn === 'true') {
        adminContentDiv.style.display = 'block';
        accessMessageDiv.style.display = 'none';
        loadMatchIds(); // Carrega IDs de partidas ao entrar na admin
        loadPlayers();  // Carrega jogadores ao entrar na admin
    } else {
        adminContentDiv.style.display = 'none';
        accessMessageDiv.style.display = 'block';
        retryLoginButton.addEventListener('click', () => {
            window.location.href = 'login.html'; // Redireciona para o login
        });
    }
});