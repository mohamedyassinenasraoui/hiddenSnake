// Configuration
const CONFIG = {
    gridSize: 20,
    cellSize: 30,
    fps: 10,
    secretCode: 'NIRD',
    longPressDuration: 2000
};

// État du jeu
const gameState = {
    snake: [],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: null,
    score: 0,
    level: 1,
    size: 3,
    gameOver: false,
    paused: false,
    particles: [],
    theme: 'default',
    musicContext: null,
    musicAnalyser: null,
    musicData: null
};

// Initialisation
let canvas, ctx;
let gridWidth, gridHeight;
let lastTime = 0;
let longPressTimer = null;
let secretInput = '';
let particlesBg = [];

// Niveaux thématiques
const themes = [
    {
        name: 'Classic',
        snakeColor: '#00ff96',
        foodColor: '#ff0066',
        bgColor: '#0a0a0a',
        gridColor: '#1a1a1a'
    },
    {
        name: 'Neon',
        snakeColor: '#00ffff',
        foodColor: '#ff00ff',
        bgColor: '#0a0a1a',
        gridColor: '#1a1a2a'
    },
    {
        name: 'Fire',
        snakeColor: '#ff6600',
        foodColor: '#ffff00',
        bgColor: '#1a0a0a',
        gridColor: '#2a1a1a'
    },
    {
        name: 'Ice',
        snakeColor: '#00ccff',
        foodColor: '#ffffff',
        bgColor: '#0a0a1a',
        gridColor: '#1a1a2a'
    }
];

// Messages du compagnon IA
const companionMessages = [
    "Salut ! Je suis ton compagnon IA. Bonne chance !",
    "Excellent mouvement ! Continue comme ça !",
    "Attention au mur !",
    "Tu t'améliores !",
    "Niveau suivant bientôt !",
    "Super score !",
    "Évite de te mordre la queue !",
    "Tu es sur la bonne voie !",
    "N'oublie pas les mini-puzzles !",
    "La musique s'adapte à ton jeu !"
];

// Mini-puzzles
const puzzles = [
    {
        id: 1,
        title: "Puzzle Mathématique",
        question: "Quel est le résultat de 7 + 5 ?",
        answer: "12",
        reward: "Taille +1"
    },
    {
        id: 2,
        title: "Puzzle Logique",
        question: "Quelle est la lettre suivante : A, C, E, G, ?",
        answer: "I",
        reward: "Taille +2"
    },
    {
        id: 3,
        title: "Puzzle Séquence",
        question: "Quel nombre complète : 2, 4, 8, 16, ?",
        answer: "32",
        reward: "Taille +3"
    }
];

let currentPuzzle = null;
let puzzleTriggered = false;

// Initialisation au chargement
window.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initSecretActivation();
    initParticles();
    initMusic();
    updateUI();
});

function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Taille du canvas
    gridWidth = Math.floor(window.innerWidth / CONFIG.cellSize);
    gridHeight = Math.floor(window.innerHeight / CONFIG.cellSize);
    canvas.width = gridWidth * CONFIG.cellSize;
    canvas.height = gridHeight * CONFIG.cellSize;
    
    // Ajuster la taille du canvas pour le pixel art
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
}

function initSecretActivation() {
    const logo = document.getElementById('logo');
    const secretInput = document.getElementById('secretInput');
    
    // Clic long sur le logo
    logo.addEventListener('mousedown', startLongPress);
    logo.addEventListener('mouseup', cancelLongPress);
    logo.addEventListener('mouseleave', cancelLongPress);
    logo.addEventListener('touchstart', startLongPress);
    logo.addEventListener('touchend', cancelLongPress);
    
    // Saisie secrète
    secretInput.addEventListener('input', (e) => {
        const input = e.target.value.toUpperCase();
        if (input === CONFIG.secretCode) {
            activateGame();
        }
    });
    
    // Particules de fond
    createBackgroundParticles();
}

function startLongPress(e) {
    e.preventDefault();
    longPressTimer = setTimeout(() => {
        activateGame();
        cancelLongPress();
    }, CONFIG.longPressDuration);
}

function cancelLongPress() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

function activateGame() {
    const startScreen = document.getElementById('startScreen');
    const gameScreen = document.getElementById('gameScreen');
    
    startScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    initGame();
    gameLoop();
    startMusic();
}

function initGame() {
    // Initialiser le serpent au centre
    const centerX = Math.floor(gridWidth / 2);
    const centerY = Math.floor(gridHeight / 2);
    
    gameState.snake = [];
    for (let i = 0; i < gameState.size; i++) {
        gameState.snake.push({ x: centerX - i, y: centerY });
    }
    
    gameState.direction = { x: 1, y: 0 };
    gameState.nextDirection = { x: 1, y: 0 };
    gameState.score = 0;
    gameState.level = 1;
    gameState.gameOver = false;
    gameState.paused = false;
    gameState.particles = [];
    gameState.theme = themes[0];
    puzzleTriggered = false;
    
    spawnFood();
    updateUI();
    
    // Contrôles clavier
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keydown', handlePauseKey);
    
    // Boutons pause
    document.getElementById('resumeBtn').addEventListener('click', togglePause);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('quitBtn').addEventListener('click', quitGame);
    
    // Puzzle
    document.getElementById('puzzleClose').addEventListener('click', closePuzzle);
}

function handleKeyPress(e) {
    if (gameState.paused || gameState.gameOver) return;
    
    const key = e.key.toLowerCase();
    const dir = gameState.direction;
    
    // Empêcher le mouvement inverse
    if (key === 'arrowup' || key === 'w') {
        if (dir.y === 0) gameState.nextDirection = { x: 0, y: -1 };
    } else if (key === 'arrowdown' || key === 's') {
        if (dir.y === 0) gameState.nextDirection = { x: 0, y: 1 };
    } else if (key === 'arrowleft' || key === 'a') {
        if (dir.x === 0) gameState.nextDirection = { x: -1, y: 0 };
    } else if (key === 'arrowright' || key === 'd') {
        if (dir.x === 0) gameState.nextDirection = { x: 1, y: 0 };
    }
}

function handlePauseKey(e) {
    if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        togglePause();
    }
}

function togglePause() {
    gameState.paused = !gameState.paused;
    const pauseMenu = document.getElementById('pauseMenu');
    pauseMenu.classList.toggle('hidden', !gameState.paused);
}

function restartGame() {
    initGame();
    togglePause();
}

function quitGame() {
    const startScreen = document.getElementById('startScreen');
    const gameScreen = document.getElementById('gameScreen');
    
    startScreen.classList.add('active');
    gameScreen.classList.remove('active');
    
    gameState.paused = false;
    document.getElementById('pauseMenu').classList.add('hidden');
}

function spawnFood() {
    let foodPos;
    do {
        foodPos = {
            x: Math.floor(Math.random() * gridWidth),
            y: Math.floor(Math.random() * gridHeight)
        };
    } while (gameState.snake.some(segment => 
        segment.x === foodPos.x && segment.y === foodPos.y
    ));
    
    gameState.food = foodPos;
}

function update() {
    if (gameState.paused || gameState.gameOver) return;
    
    // Mettre à jour la direction
    gameState.direction = { ...gameState.nextDirection };
    
    // Calculer la nouvelle position de la tête
    const head = gameState.snake[0];
    const newHead = {
        x: head.x + gameState.direction.x,
        y: head.y + gameState.direction.y
    };
    
    // Vérifier les collisions avec les murs
    if (newHead.x < 0 || newHead.x >= gridWidth ||
        newHead.y < 0 || newHead.y >= gridHeight) {
        gameOver();
        return;
    }
    
    // Vérifier les collisions avec le corps
    if (gameState.snake.some(segment => 
        segment.x === newHead.x && segment.y === newHead.y
    )) {
        gameOver();
        return;
    }
    
    // Ajouter la nouvelle tête
    gameState.snake.unshift(newHead);
    
    // Vérifier si on mange la nourriture
    if (newHead.x === gameState.food.x && newHead.y === gameState.food.y) {
        gameState.score += 10;
        createFoodParticles(gameState.food);
        spawnFood();
        updateUI();
        
        // Vérifier le niveau suivant
        checkLevelUp();
        
        // Déclencher un puzzle occasionnellement
        if (!puzzleTriggered && Math.random() < 0.3) {
            triggerPuzzle();
        }
    } else {
        // Retirer la queue si on ne mange pas
        gameState.snake.pop();
    }
    
    // Mettre à jour les particules
    updateParticles();
    
    // Message du compagnon IA
    updateCompanionMessage();
}

function checkLevelUp() {
    const newLevel = Math.floor(gameState.score / 50) + 1;
    if (newLevel > gameState.level) {
        gameState.level = newLevel;
        gameState.theme = themes[(gameState.level - 1) % themes.length];
        updateUI();
        createLevelUpEffect();
    }
}

function triggerPuzzle() {
    puzzleTriggered = true;
    currentPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
    
    const overlay = document.getElementById('puzzleOverlay');
    const title = document.getElementById('puzzleTitle');
    const content = document.getElementById('puzzleContent');
    
    title.textContent = currentPuzzle.title;
    content.innerHTML = `
        <p style="margin-bottom: 20px;">${currentPuzzle.question}</p>
        <input type="text" id="puzzleAnswer" class="secret-input" placeholder="Votre réponse..." style="width: 200px; margin: 0 auto;">
        <p style="margin-top: 20px; font-size: 14px; opacity: 0.7;">Récompense: ${currentPuzzle.reward}</p>
    `;
    
    overlay.classList.remove('hidden');
    
    const answerInput = document.getElementById('puzzleAnswer');
    answerInput.focus();
    answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkPuzzleAnswer(answerInput.value);
        }
    });
}

function checkPuzzleAnswer(answer) {
    if (answer.trim().toUpperCase() === currentPuzzle.answer.toUpperCase()) {
        // Récompense
        const sizeIncrease = parseInt(currentPuzzle.reward.match(/\d+/)[0]);
        gameState.size += sizeIncrease;
        
        // Ajouter des segments au serpent
        for (let i = 0; i < sizeIncrease; i++) {
            const tail = gameState.snake[gameState.snake.length - 1];
            gameState.snake.push({ x: tail.x, y: tail.y });
        }
        
        updateUI();
        closePuzzle();
        showCompanionMessage("Bravo ! Puzzle résolu !");
    } else {
        showCompanionMessage("Mauvaise réponse, réessaye !");
    }
}

function closePuzzle() {
    document.getElementById('puzzleOverlay').classList.add('hidden');
    puzzleTriggered = false;
    currentPuzzle = null;
}

function gameOver() {
    gameState.gameOver = true;
    createGameOverEffect();
    setTimeout(() => {
        if (confirm(`Game Over! Score: ${gameState.score}\nVoulez-vous recommencer ?`)) {
            initGame();
        } else {
            quitGame();
        }
    }, 1000);
}

function createFoodParticles(pos) {
    for (let i = 0; i < 20; i++) {
        gameState.particles.push({
            x: (pos.x + 0.5) * CONFIG.cellSize,
            y: (pos.y + 0.5) * CONFIG.cellSize,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 1.0,
            color: gameState.theme.foodColor
        });
    }
}

function createLevelUpEffect() {
    for (let i = 0; i < 50; i++) {
        gameState.particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.0,
            color: gameState.theme.snakeColor
        });
    }
}

function createGameOverEffect() {
    for (let i = 0; i < 100; i++) {
        gameState.particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 1.0,
            color: '#ff0000'
        });
    }
}

function updateParticles() {
    gameState.particles = gameState.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.vx *= 0.98;
        p.vy *= 0.98;
        return p.life > 0;
    });
}

function render() {
    // Effet de bloom (flou + superposition)
    ctx.save();
    
    // Fond avec gradient animé
    const time = Date.now() * 0.001;
    const gradient = ctx.createRadialGradient(
        canvas.width / 2 + Math.sin(time) * 50, 
        canvas.height / 2 + Math.cos(time) * 50, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height)
    );
    gradient.addColorStop(0, gameState.theme.bgColor);
    gradient.addColorStop(0.5, adjustColor(gameState.theme.bgColor, 10));
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grille subtile
    ctx.strokeStyle = gameState.theme.gridColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2;
    for (let x = 0; x <= gridWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CONFIG.cellSize, 0);
        ctx.lineTo(x * CONFIG.cellSize, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= gridHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CONFIG.cellSize);
        ctx.lineTo(canvas.width, y * CONFIG.cellSize);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    
    // Nourriture avec glow animé
    if (gameState.food) {
        const fx = gameState.food.x * CONFIG.cellSize;
        const fy = gameState.food.y * CONFIG.cellSize;
        const time = Date.now() * 0.005;
        const pulse = Math.sin(time) * 0.3 + 0.7;
        
        // Glow effect animé
        ctx.shadowBlur = 20 + Math.sin(time * 2) * 10;
        ctx.shadowColor = gameState.theme.foodColor;
        ctx.fillStyle = gameState.theme.foodColor;
        const size = (CONFIG.cellSize - 10) * pulse;
        const offset = (CONFIG.cellSize - size) / 2;
        ctx.fillRect(fx + offset, fy + offset, size, size);
        ctx.shadowBlur = 0;
        
        // Pixel art sprite animé
        ctx.fillStyle = '#ffffff';
        const spriteOffset = Math.sin(time * 3) * 2;
        ctx.fillRect(fx + 10 + spriteOffset, fy + 10, 5, 5);
        ctx.fillRect(fx + 15 - spriteOffset, fy + 12, 3, 3);
    }
    
    // Serpent avec gradient
    gameState.snake.forEach((segment, index) => {
        const sx = segment.x * CONFIG.cellSize;
        const sy = segment.y * CONFIG.cellSize;
        
        // Gradient pour chaque segment
        const segmentGradient = ctx.createLinearGradient(
            sx, sy, sx + CONFIG.cellSize, sy + CONFIG.cellSize
        );
        const alpha = 1 - (index / gameState.snake.length) * 0.5;
        const color = gameState.theme.snakeColor;
        segmentGradient.addColorStop(0, color);
        segmentGradient.addColorStop(1, adjustColor(color, -30));
        
        // Glow pour la tête
        if (index === 0) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = gameState.theme.snakeColor;
        }
        
        ctx.fillStyle = segmentGradient;
        ctx.globalAlpha = alpha;
        ctx.fillRect(sx + 2, sy + 2, CONFIG.cellSize - 4, CONFIG.cellSize - 4);
        
        // Pixel art yeux pour la tête
        if (index === 0) {
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 1;
            const eyeSize = 3;
            const eyeOffset = 8;
            if (gameState.direction.x === 1) {
                ctx.fillRect(sx + CONFIG.cellSize - eyeOffset, sy + 6, eyeSize, eyeSize);
                ctx.fillRect(sx + CONFIG.cellSize - eyeOffset, sy + 11, eyeSize, eyeSize);
            } else if (gameState.direction.x === -1) {
                ctx.fillRect(sx + eyeOffset - eyeSize, sy + 6, eyeSize, eyeSize);
                ctx.fillRect(sx + eyeOffset - eyeSize, sy + 11, eyeSize, eyeSize);
            } else if (gameState.direction.y === -1) {
                ctx.fillRect(sx + 6, sy + eyeOffset - eyeSize, eyeSize, eyeSize);
                ctx.fillRect(sx + 11, sy + eyeOffset - eyeSize, eyeSize, eyeSize);
            } else {
                ctx.fillRect(sx + 6, sy + CONFIG.cellSize - eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(sx + 11, sy + CONFIG.cellSize - eyeOffset, eyeSize, eyeSize);
            }
        }
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    });
    
    // Particules avec glow
    gameState.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.shadowBlur = 5;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        const size = 3 + p.life * 2;
        ctx.fillRect(p.x - size/2, p.y - size/2, size, size);
        ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
    
    ctx.restore();
}

function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('size').textContent = gameState.snake.length;
}

function updateCompanionMessage() {
    if (Math.random() < 0.01) { // 1% de chance par frame
        const message = companionMessages[Math.floor(Math.random() * companionMessages.length)];
        showCompanionMessage(message);
    }
}

function showCompanionMessage(message) {
    const companionMessage = document.getElementById('companionMessage');
    companionMessage.textContent = message;
    companionMessage.style.animation = 'none';
    setTimeout(() => {
        companionMessage.style.animation = 'slideIn 0.5s ease';
    }, 10);
}

function initParticles() {
    const container = document.getElementById('particlesBg');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '2px';
        particle.style.height = '2px';
        particle.style.background = '#00ff96';
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.opacity = Math.random() * 0.5 + 0.2;
        particle.style.boxShadow = '0 0 10px #00ff96';
        container.appendChild(particle);
        
        particlesBg.push({
            element: particle,
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2
        });
    }
    
    animateBackgroundParticles();
}

function createBackgroundParticles() {
    setInterval(() => {
        particlesBg.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            
            if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
            if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;
            
            p.element.style.left = p.x + 'px';
            p.element.style.top = p.y + 'px';
        });
    }, 50);
}

function animateBackgroundParticles() {
    createBackgroundParticles();
}

function initMusic() {
    // Créer un contexte audio pour la musique réactive
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        gameState.musicContext = new AudioContext();
        
        // Générer une musique synthétique réactive
        createReactiveMusic();
    } catch (e) {
        console.log('Audio non supporté');
    }
}

let musicOscillators = [];
let musicGainNodes = [];

function createReactiveMusic() {
    // Musique générée procéduralement qui réagit au gameplay
    if (!gameState.musicContext) return;
    
    // Créer plusieurs oscillateurs pour une musique plus riche
    const notes = [261.63, 329.63, 392.00, 523.25]; // C, E, G, C (accord)
    
    notes.forEach((freq, index) => {
        const oscillator = gameState.musicContext.createOscillator();
        const gainNode = gameState.musicContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(gameState.musicContext.destination);
        
        oscillator.type = index % 2 === 0 ? 'sine' : 'triangle';
        oscillator.frequency.value = freq;
        gainNode.gain.value = 0.05 * (1 - index * 0.2);
        
        oscillator.start();
        
        musicOscillators.push(oscillator);
        musicGainNodes.push(gainNode);
    });
    
    // La musique réagit au score et au niveau
    setInterval(() => {
        if (gameState.musicContext && !gameState.paused && !gameState.gameOver) {
            const baseFreq = 1 + (gameState.score / 1000) + (gameState.level / 10);
            musicOscillators.forEach((osc, index) => {
                const notes = [261.63, 329.63, 392.00, 523.25];
                osc.frequency.value = notes[index] * baseFreq;
            });
        }
    }, 100);
}

function startMusic() {
    if (gameState.musicContext) {
        if (gameState.musicContext.state === 'suspended') {
            gameState.musicContext.resume();
        }
        if (musicOscillators.length === 0) {
            createReactiveMusic();
        }
    }
}

function gameLoop(timestamp) {
    if (!gameState.gameOver) {
        requestAnimationFrame(gameLoop);
        
        const deltaTime = timestamp - lastTime;
        if (deltaTime >= 1000 / CONFIG.fps) {
            update();
            render();
            lastTime = timestamp;
        }
    }
}

// Gestion du redimensionnement
window.addEventListener('resize', () => {
    if (canvas) {
        initCanvas();
        if (!gameState.gameOver) {
            render();
        }
    }
});

