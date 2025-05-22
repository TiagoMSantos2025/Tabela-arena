// script.js (para a página da tabela principal - agora tabela.html)

const MATCH_IDS_STORAGE_KEY = 'coldfoxMatchIds';
const PLAYERS_STORAGE_KEY = 'coldfoxPlayers'; // Chave para jogadores cadastrados

// Elementos HTML
const matchDetailsTableBody = document.getElementById('matchDetailsTableBody');
const refreshButton = document.getElementById('refreshButton');
const shareWhatsappButton = document.getElementById('shareWhatsappButton');
const logoutTableButton = document.getElementById('logoutTableButton');

let playerScores = {};
let registeredPlayers = {}; // Objeto para armazenar jogadores cadastrados {id: 'nickname'}

// --- Funções de Autenticação da Página da Tabela ---
// O botão "Sair da Tabela" agora redireciona para a página de login.
function logoutFromTable() {
    if (confirm('Tem certeza que deseja sair da tabela?')) {
        window.location.href = 'login.html';
    }
}

// --- Funções de formatação (mantidas as mesmas)
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} min ${remainingSeconds > 0 ? remainingSeconds + ' seg' : ''}`;
}

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return date.toLocaleDateString('pt-BR', options);
}

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    return date.toLocaleTimeString('pt-BR', options);
}

function getDayOfWeek(timestamp) {
    const date = new Date(timestamp * 1000);
    const options = { weekday: 'long' };
    return date.toLocaleDateString('pt-BR', options);
}

// Função para identificar o vencedor
function getWinner(radiantWin) {
    return radiantWin ? 'Radiant' : 'Dire';
}

// --- NOVA FUNÇÃO: CALCULAR PONTUAÇÃO K/D/A (5 a 30) ---
function calculatePlayerScore(kills, deaths, assists) {
    // Esta é uma fórmula adaptável. Você pode ajustar os pesos e os limites.
    // Quanto maior K e A, melhor; quanto maior D, pior.

    // Pontuação base (antes da normalização)
    // Ajuste estes pesos conforme o que você considera mais importante e o range de valores que espera.
    // Ex: Se Kills são muito mais importantes, aumente o peso de kills.
    let scoreRaw = (kills * 1.5) + (assists * 0.75) - (deaths * 1.0);

    // Ajuste esses valores para o que você espera de pontuação bruta mínima e máxima
    // em uma partida típica para mapear corretamente para 5-30.
    // Ex: uma partida ruim pode ter scoreRaw de -10, uma muito boa de 60.
    const minExpectedRawScore = -10; // Ex: 0 Kills, 20 Deaths, 0 Assists -> 0 + 0 - 20 = -20. Vamos usar -10 como um "piso" razoável.
    const maxExpectedRawScore = 60;  // Ex: 30 Kills, 0 Deaths, 20 Assists -> (30*1.5) + (20*0.75) - (0*1.0) = 45 + 15 - 0 = 60.

    // Escalar para o intervalo [0, 1]
    let normalizedScore = (scoreRaw - minExpectedRawScore) / (maxExpectedRawScore - minExpectedRawScore);

    // Limitar para garantir que fique entre 0 e 1, caso a pontuação bruta saia do esperado
    normalizedScore = Math.max(0, Math.min(1, normalizedScore));

    // Escalar para o intervalo [5, 30]
    const finalScore = 5 + (normalizedScore * (30 - 5)); // (30-5) é o tamanho do intervalo (25)

    // Arredondar para o número inteiro mais próximo
    return Math.round(finalScore);
}


// --- Funções de carregamento de dados ---
async function loadPlayers() {
    const storedPlayers = localStorage.getItem(PLAYERS_STORAGE_KEY);
    if (storedPlayers) {
        registeredPlayers = JSON.parse(storedPlayers);
    }
}

async function loadAllMatchDetails() {
    refreshButton.disabled = true;
    shareWhatsappButton.disabled = true;
    matchDetailsTableBody.innerHTML = `<tr><td colspan=\"14\" style=\"text-align:center; color:var(--text-muted);\">Carregando detalhes das partidas...</td></tr>`;

    await loadPlayers(); // Carrega os jogadores cadastrados primeiro
    const matchIds = JSON.parse(localStorage.getItem(MATCH_IDS_STORAGE_KEY) || '[]');

    if (matchIds.length === 0) {
        matchDetailsTableBody.innerHTML = `<tr><td colspan=\"14\" style=\"text-align:center; color:var(--text-muted);\">Nenhum ID de partida configurado. Por favor, adicione IDs na área de administração.</td></tr>`;
        refreshButton.disabled = false;
        shareWhatsappButton.disabled = false;
        return;
    }

    matchDetailsTableBody.innerHTML = ''; // Limpa a tabela antes de adicionar novos dados

    try {
        const fetchPromises = matchIds.map(id =>
            fetch(`https://api.opendota.com/api/matches/${id}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erro HTTP! Status: ${response.status} para o ID ${id}`);
                    }
                    return response.json();
                })
                .catch(error => {
                    console.error(`Falha ao buscar partida ${id}:`, error);
                    return null; // Retorna null para partidas que falharam
                })
        );

        const allMatchDetails = await Promise.all(fetchPromises);
        const validMatchDetails = allMatchDetails.filter(detail => detail !== null);

        if (validMatchDetails.length === 0) {
            matchDetailsTableBody.innerHTML = `<tr><td colspan=\"14\" style=\"color:var(--error-color); text-align:center;\">Nenhum detalhe de partida válido pôde ser carregado. Verifique os IDs ou sua conexão.</td></tr>`;
            return;
        }

        // Ordenar as partidas pela data (timestamp) em ordem decrescente (mais recente primeiro)
        validMatchDetails.sort((a, b) => b.start_time - a.start_time);

        validMatchDetails.forEach(match => {
            const radiantWin = match.radiant_win;
            const winner = getWinner(radiantWin);
            const radiantScore = match.radiant_score;
            const direScore = match.dire_score;

            // Para cada jogador na partida
            match.players.forEach(player => {
                const playerId = player.account_id;
                const playerName = registeredPlayers[playerId] || `ID: ${playerId}`; // Usa o nickname cadastrado ou o ID

                const kills = player.kills;
                const deaths = player.deaths;
                const assists = player.assists;

                // --- CALCULA A NOVA PONTUAÇÃO K/D/A AQUI ---
                const playerEvalScore = calculatePlayerScore(kills, deaths, assists);

                const heroId = player.hero_id;
                const heroName = "Carregando..."; // Será atualizado por outra função

                // Cria a linha da tabela
                const row = `
                    <tr>
                        <td data-label="Colocação"></td>
                        <td data-label="Dia da Semana">${getDayOfWeek(match.start_time)}</td>
                        <td data-label="ID Partida">${match.match_id}</td>
                        <td data-label="Data">${formatDate(match.start_time)}</td>
                        <td data-label="Hora">${formatTime(match.start_time)}</td>
                        <td data-label="Tempo de Partida">${formatDuration(match.duration)}</td>
                        <td data-label="Vencedor">${winner}</td>
                        <td data-label="Placar">${radiantScore} - ${direScore}</td>
                        <td data-label="Jogador">${playerName}</td>
                        <td data-label="K">${kills}</td>
                        <td data-label="D">${deaths}</td>
                        <td data-label="A">${assists}</td>
                        <td data-label="Pontos">${playerEvalScore}</td> <td data-label="Heróis" class="hero-name" data-hero-id="${heroId}">${heroName}</td>
                    </tr>
                `;
                matchDetailsTableBody.insertAdjacentHTML('beforeend', row);
            });
        });

        // Carregar nomes dos heróis após todas as linhas serem adicionadas
        loadHeroNames();

    } catch (error) {
        console.error("Erro geral ao carregar detalhes das partidas:", error);
        matchDetailsTableBody.innerHTML = `<tr><td colspan=\"14\" style=\"color:var(--error-color); text-align:center;\">Erro ao carregar os detalhes das partidas: ${error.message}. Verifique o console para mais detalhes.</td></tr>`;
    } finally {
        refreshButton.disabled = false;
        shareWhatsappButton.disabled = false;
    }
}

// Função para buscar e exibir nomes de heróis (mantida como está)
async function loadHeroNames() {
    try {
        const response = await fetch('https://api.opendota.com/api/heroes');
        if (!response.ok) {
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }
        const heroes = await response.json();
        const heroMap = {};
        heroes.forEach(hero => {
            heroMap[hero.id] = hero.localized_name;
        });

        document.querySelectorAll('.hero-name').forEach(element => {
            const heroId = element.dataset.heroId;
            element.textContent = heroMap[heroId] || 'Desconhecido';
        });

    } catch (error) {
        console.error("Erro ao carregar nomes de heróis:", error);
        document.querySelectorAll('.hero-name').forEach(element => {
            if (element.textContent === 'Carregando...') {
                element.textContent = 'Erro Herói';
            }
        });
    }
}


// Função para compartilhar no WhatsApp
function shareOnWhatsApp() {
    const pageUrl = window.location.href;
    const message = `Confira os detalhes do Campeonato Mensal ColdFox de Dota 2! Acesse a tabela de partidas aqui: ${pageUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}


// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    loadAllMatchDetails();
});

// Adiciona um evento de clique ao botão de atualização
refreshButton.addEventListener('click', loadAllMatchDetails);

// Adiciona um evento de clique ao botão de compartilhamento
shareWhatsappButton.addEventListener('click', shareOnWhatsApp);

// Adiciona evento de clique ao botão de "Sair da Tabela"
logoutTableButton.addEventListener('click', logoutFromTable);