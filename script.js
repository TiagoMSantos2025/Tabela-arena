// script.js (para a página da tabela principal - tabela.html)
const MATCH_IDS_STORAGE_KEY = 'coldfoxMatchIds';
const TABLE_ACCESS_KEY = 'coldfoxTableLoggedIn';
const PLAYER_NAMES_STORAGE_KEY = 'coldfoxPlayerNames'; 
const PLAYER_SCORES_STORAGE_KEY = 'coldfoxPlayerScores'; // A chave para armazenar pontos por partida
const TOTAL_PLAYER_SCORES_KEY = 'coldfoxTotalPlayerScores'; // Chave para armazenar pontuações totais

const PLAYER_DOTA_IDS = {
    // Substitua pelos IDs reais dos jogadores. Use a OpenDota API para encontrá-los
    // Exemplo: 'Nome do Jogador 1': 123456789,
    //          'Nome do Jogador 2': 987654321
};

// Mapeamento de heróis: Inicialmente vazio, será preenchido dinamicamente
let HERO_ID_TO_NAME = {};

// Elementos HTML que eram da seção de gerenciamento manual (já removidos do HTML, referências são nulas)
const matchPlayersSection = null; 
const searchMatchIdInput = null;
const searchMatchButton = null;
const matchSearchMessage = null;
const savePlayerScoresButton = null;
const currentMatchIdDisplay = null;
const matchPlayersMessage = null;
const matchPlayersList = null;

// Elementos HTML ainda úteis
const saveScoresMessage = document.getElementById('saveScoresMessage'); // Para mensagens de atualização da tabela
const updateTableButton = document.getElementById('updateTableButton'); 
const totalScoresSummary = document.getElementById('totalScoresSummary'); // Novo elemento para o resumo

// NOVAS REFERÊNCIAS PARA OS BOTÕES DE COMPARTILHAMENTO
const shareWhatsappButton = document.getElementById('shareWhatsappButton');
const shareDiscordButton = document.getElementById('shareDiscordButton');
const shareMessage = document.getElementById('shareMessage'); // Para mensagens de feedback ao usuário


let playerNames = []; 
let playerScores = {}; // Armazena as pontuações por match_id e account_id (pontos por partida individual)
let totalPlayerScores = {}; // Objeto para armazenar a soma total de pontos por jogador

// --- Funções de Acesso/Logout ---
function checkTableAccess() {
    const hasAccess = sessionStorage.getItem(TABLE_ACCESS_KEY) === 'true';
    if (!hasAccess) {
        window.location.href = 'login.html';
    }
}

function revokeTableAccess() {
    sessionStorage.removeItem(TABLE_ACCESS_KEY);
    window.location.href = 'login.html';
}

// --- Funções Auxiliares de Formatação ---
function formatMatchDuration(durationInSeconds) {
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    return `${minutes}m ${seconds}s`;
}

function formatMatchDateTime(timestamp) {
    const date = new Date(timestamp * 1000);
    const optionsDate = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: false };
    const formattedDate = date.toLocaleDateString('pt-BR', optionsDate);
    const formattedTime = date.toLocaleTimeString('pt-BR', optionsTime);
    return { date: formattedDate, time: formattedTime, dayOfWeek: date.toLocaleDateString('pt-BR', { weekday: 'long' }) };
}

// --- Funções de Cálculo de Pontos ---
function calculateKDA(kills, deaths, assists) {
    const effectiveDeaths = Math.max(1, deaths); // Evita divisão por zero
    return (kills + assists) / effectiveDeaths;
}

function scalePoints(kdaValue, minKDA, maxKDA, minPoints, maxPoints) {
    if (maxKDA === minKDA) { // Se todos os KDAs são iguais, retorna a pontuação mínima
        return minPoints; 
    }
    const normalizedKDA = (kdaValue - minKDA) / (maxKDA - minKDA);
    const scaledPoints = normalizedKDA * (maxPoints - minPoints) + minPoints;
    
    // Garante que os pontos fiquem dentro do limite min/max e sejam inteiros
    return Math.max(minPoints, Math.min(maxPoints, Math.round(scaledPoints)));
}

// --- Funções de Acesso a Dados Locais e API ---
function loadPlayerNames() {
    const storedPlayerNames = localStorage.getItem(PLAYER_NAMES_STORAGE_KEY);
    if (storedPlayerNames) {
        playerNames = JSON.parse(storedPlayerNames);
    } else {
        playerNames = [];
    }
}

function savePlayerNames() {
    localStorage.setItem(PLAYER_NAMES_STORAGE_KEY, JSON.stringify(playerNames));
}

function loadPlayerScores() {
    const storedPlayerScores = localStorage.getItem(PLAYER_SCORES_STORAGE_KEY);
    if (storedPlayerScores) {
        playerScores = JSON.parse(storedPlayerScores);
    } else {
        playerScores = {};
    }
}

function loadTotalPlayerScores() {
    const storedTotalScores = localStorage.getItem(TOTAL_PLAYER_SCORES_KEY);
    if (storedTotalScores) {
        totalPlayerScores = JSON.parse(storedTotalScores);
    } else {
        totalPlayerScores = {};
    }
}

function saveTotalPlayerScores() {
    localStorage.setItem(TOTAL_PLAYER_SCORES_KEY, JSON.stringify(totalPlayerScores));
}

// NOVO: Função para buscar a lista de heróis da OpenDota API
async function fetchHeroList() {
    const API_URL = 'https://api.opendota.com/api/heroes';
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            console.error(`Erro HTTP ao buscar lista de heróis! Status: ${response.status}`);
            return {};
        }
        const heroes = await response.json();
        const heroMap = {};
        heroes.forEach(hero => {
            heroMap[hero.id] = hero.localized_name;
        });
        return heroMap;
    } catch (error) {
        console.error('Erro ao buscar lista de heróis:', error);
        return {};
    }
}


async function fetchMatchDetails(matchId) {
    const API_URL = `https://api.opendota.com/api/matches/${matchId}`;
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            if (response.status === 429) { // Too Many Requests (limite de requisições)
                console.warn(`Rate limit hit for match ${matchId}. Consider adding fewer matches or waiting.`);
            } else {
                console.error(`Erro HTTP ao buscar partida ${matchId}! Status: ${response.status}`);
            }
            return null; // Retorna nulo em caso de erro para não quebrar o processo
        }
        return await response.json();
    } catch (error) {
        console.error(`Erro ao buscar partida ${matchId}:`, error);
        return null;
    }
}

// --- Função Principal: Carrega e Processa Todas as Partidas Automaticamente ---
async function loadAllMatchDetails() {
    // NOVO: Garante que a lista de heróis seja carregada antes de processar as partidas
    if (Object.keys(HERO_ID_TO_NAME).length === 0) { // Carrega apenas se estiver vazio
        HERO_ID_TO_NAME = await fetchHeroList();
        if (Object.keys(HERO_ID_TO_NAME).length === 0) {
            console.warn('Não foi possível carregar a lista de heróis. Os heróis podem aparecer como "ID: X".');
        }
    }


    const matchIds = JSON.parse(localStorage.getItem(MATCH_IDS_STORAGE_KEY) || '[]');
    loadPlayerNames(); 
    loadPlayerScores(); // Pontos por partida (para referência/cálculo inicial)

    const tableBody = document.getElementById('matchDetailsTableBody');
    tableBody.innerHTML = '<tr><td colspan="13">Carregando detalhes das partidas...</td></tr>'; // Ajuste o colspan para o total de colunas

    if (matchIds.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="13">Nenhum ID de partida para exibir. Por favor, adicione-os na <a href="admin.html">Área de Administração</a>.</td></tr>'; // Ajuste o colspan
        // Também limpa o resumo de pontos totais se não houver partidas
        if (totalScoresSummary) totalScoresSummary.textContent = 'Nenhum dado de partida para calcular pontos totais.';
        return;
    }

    const allMatchDetailsData = []; // Para armazenar os dados de cada jogador em cada partida para renderização
    const newPlayerScoresPerMatch = { ...playerScores }; // Copia para atualizar e guardar pontos por partida
    const recalculatedTotalScores = {}; // Objeto para acumular os pontos totais para esta execução

    for (const matchId of matchIds) {
        const data = await fetchMatchDetails(matchId);
        if (data) {
            const { date: formattedDate, time: formattedTime, dayOfWeek } = formatMatchDateTime(data.start_time);
            const duration = formatMatchDuration(data.duration);
            const radiantWin = data.radiant_win;
            const radiantScore = data.radiant_score;
            const direScore = data.dire_score;

            // Calcula KDA min/max para escalonamento de pontos nesta partida
            const kdaValues = data.players.map(p => calculateKDA(p.kills, p.deaths, p.assists));
            const minKDA = kdaValues.length > 0 ? Math.min(...kdaValues) : 0;
            const maxKDA = kdaValues.length > 0 ? Math.max(...kdaValues) : 0;

            data.players.forEach(player => {
                const accountId = player.account_id;
                let playerNameDisplay = `ID: ${accountId}`; // Fallback para jogador

                // Lógica de nome de jogador: prioriza nomes conhecidos ou da API
                const localPlayer = playerNames.find(p => p.id === accountId);
                if (localPlayer) {
                    playerNameDisplay = localPlayer.name;
                } else if (player.personaname) {
                    playerNameDisplay = player.personaname;
                    // Adiciona/atualiza o nome do jogador na lista local se não existir
                    const existingPlayerIndex = playerNames.findIndex(p => p.id === accountId);
                    if (existingPlayerIndex === -1) {
                        playerNames.push({ name: player.personaname, id: accountId });
                    } else if (playerNames[existingPlayerIndex].name !== player.personaname) {
                        playerNames[existingPlayerIndex].name = player.personaname; 
                    }
                } else {
                    // Tenta encontrar o nome do jogador no PLAYER_DOTA_IDS como último recurso
                    for (const nameKey in PLAYER_DOTA_IDS) {
                        if (PLAYER_DOTA_IDS[nameKey] === accountId) {
                            playerNameDisplay = nameKey;
                            break;
                        }
                    }
                }
                
                const playerKDA = calculateKDA(player.kills, player.deaths, player.assists);
                const autoCalculatedPoints = scalePoints(playerKDA, minKDA, maxKDA, 5, 30);
                
                // Armazena pontos por partida individualmente
                if (!newPlayerScoresPerMatch[matchId]) {
                    newPlayerScoresPerMatch[matchId] = {};
                }
                const pointsForThisMatch = typeof newPlayerScoresPerMatch[matchId][accountId] !== 'undefined'
                                        ? newPlayerScoresPerMatch[matchId][accountId]
                                        : autoCalculatedPoints;
                newPlayerScoresPerMatch[matchId][accountId] = pointsForThisMatch;


                // Acumula a pontuação total para cada jogador
                if (!recalculatedTotalScores[accountId]) {
                    recalculatedTotalScores[accountId] = 0;
                }
                recalculatedTotalScores[accountId] += pointsForThisMatch;

                // Determina o vencedor/perdedor da partida para o jogador
                const playerWon = (player.isRadiant && radiantWin) || (!player.isRadiant && !radiantWin);
                const matchResult = playerWon ? 'VENCEU' : 'PERDEU';


                // NOVO: Lógica para nome do herói
                const heroName = HERO_ID_TO_NAME[player.hero_id] || `ID: ${player.hero_id}`;

                // Adiciona os dados do jogador/partida para a lista de renderização
                allMatchDetailsData.push({
                    dayOfWeek: dayOfWeek,
                    matchId: data.match_id,
                    date: formattedDate,
                    time: formattedTime,
                    duration: duration,
                    winner: matchResult, // Usa 'VENCEU' ou 'PERDEU'
                    score: `${radiantScore} - ${direScore}`,
                    playerName: playerNameDisplay,
                    kills: player.kills,
                    deaths: player.deaths,
                    assists: player.assists,
                    points: pointsForThisMatch, // Pontos feitos NESTA PARTIDA
                    hero: heroName // Usa o nome do herói obtido dinamicamente
                });
            });
        }
    }

    // Salva as pontuações por partida individual e nomes dos jogadores
    playerScores = newPlayerScoresPerMatch; 
    localStorage.setItem(PLAYER_SCORES_STORAGE_KEY, JSON.stringify(playerScores));
    savePlayerNames(); 

    // Salva as pontuações totais calculadas
    totalPlayerScores = recalculatedTotalScores; 
    saveTotalPlayerScores();


    // --- Renderização da Tabela de DETALHES DAS PARTIDAS ---
    // Ordena os detalhes da partida por data (partidas mais recentes primeiro)
    allMatchDetailsData.sort((a, b) => {
        // Converte as strings de data "DD/MM/YYYY" para objetos Date para comparação
        const [dayA, monthA, yearA] = a.date.split('/').map(Number);
        const [dayB, monthB, yearB] = b.date.split('/').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        
        // Se as datas são iguais, ordena pelo ID da partida (garante ordem consistente)
        if (dateA.getTime() === dateB.getTime()) {
            return b.matchId - a.matchId; // ID de partida maior primeiro
        }
        return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
    });


    tableBody.innerHTML = ''; // Limpa o corpo da tabela antes de preencher

    if (allMatchDetailsData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="13">Nenhum detalhe de partida para exibir.</td></tr>';
        return;
    }

    allMatchDetailsData.forEach((matchPlayerData, index) => {
        const row = tableBody.insertRow();
        
        // Aplica as classes de cores alternadas
        if ((index + 1) % 2 !== 0) { // Posição ímpar (1º, 3º, 5º...)
            row.classList.add('ranking-odd');
        } else { // Posição par (2º, 4º, 6º...)
            row.classList.add('ranking-even');
        }
        
        row.insertCell(0).setAttribute('data-label', 'Dia da semana'); row.cells[0].textContent = matchPlayerData.dayOfWeek;
        row.insertCell(1).setAttribute('data-label', 'ID Partida'); row.cells[1].textContent = matchPlayerData.matchId;
        row.insertCell(2).setAttribute('data-label', 'Data'); row.cells[2].textContent = matchPlayerData.date;
        row.insertCell(3).setAttribute('data-label', 'Hora'); row.cells[3].textContent = matchPlayerData.time;
        row.insertCell(4).setAttribute('data-label', 'Tempo de partida'); row.cells[4].textContent = matchPlayerData.duration;
        row.insertCell(5).setAttribute('data-label', 'Vencedor'); row.cells[5].textContent = matchPlayerData.winner;
        row.insertCell(6).setAttribute('data-label', 'Placar'); row.cells[6].textContent = matchPlayerData.score;
        row.insertCell(7).setAttribute('data-label', 'Jogador'); row.cells[7].textContent = matchPlayerData.playerName;
        row.insertCell(8).setAttribute('data-label', 'K'); row.cells[8].textContent = matchPlayerData.kills;
        row.insertCell(9).setAttribute('data-label', 'D'); row.cells[9].textContent = matchPlayerData.deaths;
        row.insertCell(10).setAttribute('data-label', 'A'); row.cells[10].textContent = matchPlayerData.assists;
        row.insertCell(11).setAttribute('data-label', 'Pontos (Nesta Partida)'); row.cells[11].textContent = matchPlayerData.points;
        row.insertCell(12).setAttribute('data-label', 'Heróis'); row.cells[12].textContent = matchPlayerData.hero;
    });

    // --- Renderização do Resumo de Pontos Totais ---
    if (totalScoresSummary) {
        let summaryHtml = '<h3>Top Jogadores por Pontos Totais:</h3><ul>';
        // Converte o objeto totalPlayerScores em um array para ordenar
        const sortedTotalPlayers = Object.keys(totalPlayerScores).map(accountId => {
            const playerNameEntry = playerNames.find(p => p.id === parseInt(accountId));
            let playerNameDisplay = `ID: ${accountId}`;
            if (playerNameEntry) {
                playerNameDisplay = playerNameEntry.name;
            } else {
                for (const nameKey in PLAYER_DOTA_IDS) {
                    if (PLAYER_DOTA_IDS[nameKey] === parseInt(accountId)) {
                        playerNameDisplay = nameKey;
                        break;
                    }
                }
            }
            return { name: playerNameDisplay, totalPoints: totalPlayerScores[accountId] };
        }).sort((a, b) => b.totalPoints - a.totalPoints); // Ordena do maior para o menor

        if (sortedTotalPlayers.length > 0) {
            sortedTotalPlayers.forEach((player, index) => {
                // Aplica as mesmas cores de linha no resumo, se desejar
                const className = ((index + 1) % 2 !== 0) ? 'ranking-odd' : 'ranking-even';
                summaryHtml += `<li class="${className}">${index + 1}º - ${player.name}: ${player.totalPoints} pontos</li>`;
            });
        } else {
            summaryHtml += '<li>Nenhum jogador com pontuação total encontrada.</li>';
        }
        summaryHtml += '</ul>';
        totalScoresSummary.innerHTML = summaryHtml;
    }
}

// --- Funções de Compartilhamento ---

// Função para gerar o texto de compartilhamento do resumo do ranking
function generateRankingSummaryText() {
    let text = "🏆 Ranking do Campeonato ColdFox 🏆\n\n";
    
    // Obter o resumo dos pontos totais (já está em totalPlayerScores)
    // Converte o objeto totalPlayerScores em um array para ordenar
    const sortedTotalPlayers = Object.keys(totalPlayerScores).map(accountId => {
        const playerNameEntry = playerNames.find(p => p.id === parseInt(accountId));
        let playerNameDisplay = `ID: ${accountId}`;
        if (playerNameEntry) {
            playerNameDisplay = playerNameEntry.name;
        } else {
            for (const nameKey in PLAYER_DOTA_IDS) {
                if (PLAYER_DOTA_IDS[nameKey] === parseInt(accountId)) {
                    playerNameDisplay = nameKey;
                    break;
                }
            }
        }
        return { name: playerNameDisplay, totalPoints: totalPlayerScores[accountId] };
    }).sort((a, b) => b.totalPoints - a.totalPoints); // Ordena do maior para o menor

    if (sortedTotalPlayers.length > 0) {
        sortedTotalPlayers.slice(0, 5).forEach((player, index) => { // Compartilha os top 5, por exemplo
            text += `${index + 1}º - ${player.name}: ${player.totalPoints} pontos\n`;
        });
        if (sortedTotalPlayers.length > 5) {
            text += `\n...e muito mais!\n`;
        }
    } else {
        text += "Nenhum dado de ranking disponível ainda.\n";
    }

    text += `\nConfira o ranking completo em: ${window.location.href}`;
    return encodeURIComponent(text); // Codifica para URL
}

// Função de Compartilhamento no WhatsApp
function shareOnWhatsapp() {
    const shareText = generateRankingSummaryText();
    const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}`;
    window.open(whatsappUrl, '_blank');
}

// Função de Compartilhamento no Discord (copia o texto para a área de transferência)
function shareOnDiscord() {
    const shareText = decodeURIComponent(generateRankingSummaryText()); // Decodifica para copiar o texto original
    
    // Usa a API Clipboard para copiar texto
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText)
            .then(() => {
                shareMessage.className = 'message success';
                shareMessage.textContent = 'Ranking copiado para a área de transferência! Cole no Discord.';
                shareMessage.style.display = 'block';
                setTimeout(() => { shareMessage.style.display = 'none'; }, 5000);
            })
            .catch(err => {
                console.error('Erro ao copiar texto: ', err);
                shareMessage.className = 'message error';
                shareMessage.textContent = 'Erro ao copiar ranking. Por favor, copie manualmente.';
                shareMessage.style.display = 'block';
                setTimeout(() => { shareMessage.style.display = 'none'; }, 5000);
            });
    } else {
        // Fallback para navegadores sem a API Clipboard (menos comum hoje em dia)
        const textArea = document.createElement("textarea");
        textArea.value = shareText;
        textArea.style.position = "fixed";  // Evita rolagem para o fundo
        textArea.style.left = "-9999px"; // Fora da tela
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            shareMessage.className = 'message success';
            shareMessage.textContent = 'Ranking copiado para a área de transferência! Cole no Discord.';
            shareMessage.style.display = 'block';
            setTimeout(() => { shareMessage.style.display = 'none'; }, 5000);
        } catch (err) {
            console.error('Fallback: Erro ao copiar texto: ', err);
            shareMessage.className = 'message error';
            shareMessage.textContent = 'Erro ao copiar ranking. Por favor, copie manualmente.';
            shareMessage.style.display = 'block';
            setTimeout(() => { shareMessage.style.display = 'none'; }, 5000);
        }
        document.body.removeChild(textArea);
    }
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => { // Adicionado 'async' aqui
    checkTableAccess();
    await loadAllMatchDetails(); // Aguarda o carregamento completo dos detalhes, incluindo heróis

    const logoutTableButton = document.getElementById('logoutTableButton');
    if (logoutTableButton) {
        logoutTableButton.addEventListener('click', revokeTableAccess);
    }
    
    // O botão de "Atualizar Tabela" ainda é útil para forçar um recarregamento e re-cálculo
    if (updateTableButton) {
        updateTableButton.addEventListener('click', async () => { // Adicionado 'async' aqui
            saveScoresMessage.className = 'message info';
            saveScoresMessage.textContent = 'Atualizando detalhes das partidas... Por favor, aguarde.';
            saveScoresMessage.style.display = 'block';
            
            // Limpa o cache de heróis para garantir a atualização
            HERO_ID_TO_NAME = {}; 
            await loadAllMatchDetails();

            saveScoresMessage.className = 'message success';
            saveScoresMessage.textContent = 'Detalhes das partidas e resumo de pontos totais atualizados!';
            saveScoresMessage.style.display = 'block';
            setTimeout(() => { saveScoresMessage.style.display = 'none'; }, 3000);
        });
    }

    // NOVOS EVENT LISTENERS PARA OS BOTÕES DE COMPARTILHAMENTO
    if (shareWhatsappButton) {
        shareWhatsappButton.addEventListener('click', shareOnWhatsapp);
    }
    if (shareDiscordButton) {
        shareDiscordButton.addEventListener('click', shareOnDiscord);
    }
});