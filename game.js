// Game Constants
const GAME_STATES = {
    START: 'start',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};

const OBSTACLE_TYPES = [
    { class: 'coldcuts', name: "Nick's Cold Cuts", isPowerup: false },
    { class: 'juice', name: "Gaeta's Juice", isPowerup: false },
    { class: 'kevin', name: 'Kevin', isPowerup: false },
    { class: 'basketball', name: "Nicky's Basketball", isPowerup: false }
];

const POWERUP_TYPE = { class: 'loussnacks', name: "Lou's Snacks", isPowerup: true };

// Game State
let gameState = GAME_STATES.START;
let score = 0;
let level = 1;
let gameStartTime = 0;
let lastFrameTime = 0;
let animationFrameId = null;

// Game Configuration
let baseObstacleSpeed = 2;
let currentObstacleSpeed = baseObstacleSpeed;
let baseSpawnRate = 0.02;
let currentSpawnRate = baseSpawnRate;
let lastDifficultyIncrease = 0;

// Player
const player = {
    x: 0,
    y: 0,
    width: 40,
    height: 60,
    speed: 5,
    verticalSpeed: 4,
    minY: 0,  // Will be set to 75% of screen height
    maxY: 0,  // Will be set to screen height - player height
    element: null
};

// Obstacles
let obstacles = [];

// Input handling
let keysPressed = {};
let touchX = null;
let touchY = null;

// DOM Elements
const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const gameArea = document.getElementById('gameArea');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const finalScoreDisplay = document.getElementById('finalScore');
const leaderboardList = document.getElementById('leaderboardList');
const pauseOverlay = document.getElementById('pauseOverlay');
const restartBtn = document.getElementById('restartBtn');
const submitScoreBtn = document.getElementById('submitScore');
const playerNameInput = document.getElementById('playerName');
const muteBtn = document.getElementById('muteBtn');
const bgMusic = document.getElementById('bgMusic');

// Initialize
function init() {
    setupEventListeners();
    setupMusic();
    loadLeaderboard();
}

function setupMusic() {
    // Ensure music loops
    bgMusic.loop = true;
    bgMusic.volume = 0.5;
}

function setupEventListeners() {
    // Keyboard
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Touch and Mouse for mobile
    gameArea.addEventListener('touchstart', handleTouchStart);
    gameArea.addEventListener('touchmove', handleTouchMove);
    gameArea.addEventListener('touchend', handleTouchEnd);
    gameArea.addEventListener('mousemove', handleMouseMove);
    gameArea.addEventListener('mouseleave', handleMouseLeave);
    
    // Start screen touch for mobile
    startScreen.addEventListener('touchstart', startGame);
    
    // Buttons
    restartBtn.addEventListener('click', resetGame);
    submitScoreBtn.addEventListener('click', submitScore);
    muteBtn.addEventListener('click', toggleMute);
    
    // Enter key for name submission
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitScore();
        }
    });
}

function handleKeyDown(e) {
    keysPressed[e.key] = true;
    
    if (gameState === GAME_STATES.START && (e.key === ' ' || e.code === 'Space')) {
        e.preventDefault();
        startGame();
    } else if (gameState === GAME_STATES.PLAYING && (e.key.toLowerCase() === 'p' || e.code === 'KeyP')) {
        e.preventDefault();
        togglePause();
    } else if (gameState === GAME_STATES.PAUSED && (e.key.toLowerCase() === 'p' || e.code === 'KeyP')) {
        e.preventDefault();
        togglePause();
    }
    
    // Prevent default for arrow keys to avoid page scrolling
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    keysPressed[e.key] = false;
}

function handleTouchStart(e) {
    if (gameState === GAME_STATES.START) {
        startGame();
    }
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = gameArea.getBoundingClientRect();
        touchX = touch.clientX - rect.left;
        touchY = touch.clientY - rect.top;
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = gameArea.getBoundingClientRect();
        touchX = touch.clientX - rect.left;
        touchY = touch.clientY - rect.top;
    }
}

function handleTouchEnd(e) {
    if (e.touches.length === 0) {
        touchX = null;
        touchY = null;
    }
}

function handleMouseMove(e) {
    if (gameState === GAME_STATES.PLAYING) {
        const rect = gameArea.getBoundingClientRect();
        touchX = e.clientX - rect.left;
        touchY = e.clientY - rect.top;
    }
}

function handleMouseLeave(e) {
    // Clear touch/mouse control when mouse leaves game area
    touchX = null;
    touchY = null;
}

function toggleMute() {
    if (bgMusic.muted) {
        bgMusic.muted = false;
        muteBtn.textContent = '🔊';
    } else {
        bgMusic.muted = true;
        muteBtn.textContent = '🔇';
    }
}

function startGame() {
    gameState = GAME_STATES.PLAYING;
    score = 0;
    level = 1;
    gameStartTime = Date.now();
    lastFrameTime = Date.now();
    lastDifficultyIncrease = 0;
    obstacles = [];
    currentObstacleSpeed = baseObstacleSpeed;
    currentSpawnRate = baseSpawnRate;
    
    // Play music
    bgMusic.play().catch(e => console.log('Music autoplay prevented'));
    
    // Switch screens
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    // Create player
    createPlayer();
    
    // Start game loop
    gameLoop();
}

function createPlayer() {
    if (player.element) {
        player.element.remove();
    }
    
    const rect = gameArea.getBoundingClientRect();
    player.width = 50;
    player.height = 70;
    
    // Ensure game area has valid dimensions
    if (rect.width < 100 || rect.height < 100) {
        console.warn('Game area too small. Waiting for proper dimensions...');
        setTimeout(createPlayer, 100);
        return;
    }
    
    // Set vertical movement constraints (bottom 25% of screen)
    player.maxY = rect.height - player.height - 10;
    player.minY = rect.height * 0.75 - player.height;
    
    player.x = rect.width / 2 - player.width / 2;
    player.y = player.maxY - 40;  // Start near bottom
    
    player.element = document.createElement('div');
    player.element.className = 'rocket';
    player.element.innerHTML = `
        <div class="window"></div>
        <div class="fin-left"></div>
        <div class="fin-right"></div>
        <div class="flame"></div>
    `;
    player.element.style.left = player.x + 'px';
    player.element.style.bottom = (rect.height - player.y - player.height) + 'px';
    player.element.style.position = 'absolute';
    gameArea.appendChild(player.element);
    
    console.log('Player created at:', player.x, player.y, 'Y range:', player.minY, '-', player.maxY);
}

function togglePause() {
    if (gameState === GAME_STATES.PLAYING) {
        gameState = GAME_STATES.PAUSED;
        pauseOverlay.classList.add('active');
        bgMusic.pause();
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    } else if (gameState === GAME_STATES.PAUSED) {
        gameState = GAME_STATES.PLAYING;
        pauseOverlay.classList.remove('active');
        bgMusic.play();
        lastFrameTime = Date.now();
        gameLoop();
    }
}

function gameLoop() {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    const currentTime = Date.now();
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    
    // Update score (1 point per millisecond)
    score = currentTime - gameStartTime;
    scoreDisplay.textContent = score;
    
    // Update difficulty every 5 seconds
    const secondsElapsed = Math.floor(score / 1000);
    if (secondsElapsed > 0 && secondsElapsed % 5 === 0 && secondsElapsed !== lastDifficultyIncrease) {
        increaseDifficulty();
        lastDifficultyIncrease = secondsElapsed;
    }
    
    // Update player
    updatePlayer();
    
    // Spawn obstacles
    spawnObstacles();
    
    // Update obstacles
    updateObstacles();
    
    // Check collisions
    if (checkCollisions()) {
        gameOver();
        return;
    }
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

function updatePlayer() {
    const rect = gameArea.getBoundingClientRect();
    const gameWidth = rect.width;
    const gameHeight = rect.height;
    
    // Check if any arrow keys are being pressed
    const usingKeyboard = keysPressed['ArrowLeft'] || keysPressed['Left'] || 
                         keysPressed['ArrowRight'] || keysPressed['Right'] ||
                         keysPressed['ArrowUp'] || keysPressed['Up'] ||
                         keysPressed['ArrowDown'] || keysPressed['Down'];
    
    // If keyboard is being used, clear mouse/touch input
    if (usingKeyboard) {
        touchX = null;
        touchY = null;
    }
    
    // Handle touch/mouse input (takes priority when active)
    if (touchX !== null && touchY !== null) {
        player.x = touchX - player.width / 2;
        player.y = touchY - player.height / 2;
    }
    // Handle keyboard input
    else {
        if (keysPressed['ArrowLeft'] || keysPressed['Left']) {
            player.x -= player.speed;
        }
        if (keysPressed['ArrowRight'] || keysPressed['Right']) {
            player.x += player.speed;
        }
        if (keysPressed['ArrowUp'] || keysPressed['Up']) {
            player.y -= player.verticalSpeed;
        }
        if (keysPressed['ArrowDown'] || keysPressed['Down']) {
            player.y += player.verticalSpeed;
        }
    }
    
    // Constrain to boundaries with valid dimensions
    if (gameWidth > 0) {
        player.x = Math.max(0, Math.min(player.x, gameWidth - player.width));
    }
    
    // Constrain vertical movement to bottom 25% of screen
    if (gameHeight > 0) {
        player.y = Math.max(player.minY, Math.min(player.y, player.maxY));
    }
    
    // Update position
    if (player.element) {
        player.element.style.left = player.x + 'px';
        player.element.style.bottom = (gameHeight - player.y - player.height) + 'px';
    }
}

function spawnObstacles() {
    if (Math.random() < currentSpawnRate) {
        const rect = gameArea.getBoundingClientRect();
        const gameWidth = rect.width;
        
        // Ensure we have valid dimensions
        if (gameWidth < 100) {
            console.warn('Game area too small:', gameWidth);
            return;
        }
        
        // 15% chance to spawn powerup instead of obstacle
        const isPowerup = Math.random() < 0.15;
        const obstacleType = isPowerup ? POWERUP_TYPE : OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
        
        // Generate random x position with padding from edges
        const padding = 20;
        const maxX = gameWidth - 40 - padding;
        const randomX = padding + (Math.random() * (maxX - padding));
        
        const obstacle = {
            x: randomX,
            y: -40,
            width: 40,
            height: 40,
            type: obstacleType.class,
            isPowerup: obstacleType.isPowerup,
            element: null
        };
        
        obstacle.element = document.createElement('div');
        obstacle.element.className = `obstacle ${obstacle.type}`;
        obstacle.element.style.left = obstacle.x + 'px';
        obstacle.element.style.top = obstacle.y + 'px';
        obstacle.element.style.position = 'absolute';
        
        gameArea.appendChild(obstacle.element);
        obstacles.push(obstacle);
    }
}

function updateObstacles() {
    const rect = gameArea.getBoundingClientRect();
    
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.y += currentObstacleSpeed;
        
        if (obstacle.element) {
            obstacle.element.style.top = obstacle.y + 'px';
        }
        
        // Remove obstacles that are off screen
        if (obstacle.y > rect.height) {
            if (obstacle.element) {
                obstacle.element.remove();
            }
            obstacles.splice(i, 1);
        }
    }
}

function checkCollisions() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        if (
            player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + player.height > obstacle.y
        ) {
            // Check if it's a powerup
            if (obstacle.isPowerup) {
                // Add 50 points
                score += 50;
                scoreDisplay.textContent = score;
                
                // Remove powerup
                if (obstacle.element) {
                    obstacle.element.remove();
                }
                obstacles.splice(i, 1);
                
                // Visual feedback
                scoreDisplay.style.color = '#ff0';
                setTimeout(() => {
                    scoreDisplay.style.color = '#0f0';
                }, 200);
            } else {
                // It's an obstacle - game over
                return true;
            }
        }
    }
    return false;
}

function increaseDifficulty() {
    level++;
    levelDisplay.textContent = level;
    currentObstacleSpeed *= 1.2;
    currentSpawnRate *= 1.15;
    
    // Visual feedback
    levelDisplay.style.color = '#ff0';
    setTimeout(() => {
        levelDisplay.style.color = '#0f0';
    }, 500);
}

function gameOver() {
    gameState = GAME_STATES.GAME_OVER;
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    // Clean up game objects
    obstacles.forEach(obstacle => {
        if (obstacle.element) {
            obstacle.element.remove();
        }
    });
    obstacles = [];
    
    if (player.element) {
        player.element.remove();
    }
    
    // Show game over screen
    finalScoreDisplay.textContent = score;
    gameScreen.classList.remove('active');
    gameOverScreen.classList.add('active');
    
    // Focus on name input
    playerNameInput.value = '';
    playerNameInput.focus();
    
    // Display leaderboard
    displayLeaderboard();
}

function submitScore() {
    const playerName = playerNameInput.value.trim().toUpperCase() || 'PLAYER';
    
    const leaderboard = getLeaderboard();
    leaderboard.push({
        name: playerName,
        score: score,
        date: new Date().toLocaleDateString()
    });
    
    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);
    
    // Keep only top 10
    const top10 = leaderboard.slice(0, 10);
    
    // Save to localStorage
    localStorage.setItem('rocketmanLouLeaderboard', JSON.stringify(top10));
    
    // Disable submit button
    submitScoreBtn.disabled = true;
    submitScoreBtn.textContent = 'SUBMITTED';
    
    // Refresh display
    displayLeaderboard(score);
}

function getLeaderboard() {
    const data = localStorage.getItem('rocketmanLouLeaderboard');
    return data ? JSON.parse(data) : [];
}

function loadLeaderboard() {
    // Get existing leaderboard or create empty array
    let leaderboard = getLeaderboard();
    
    // Check if Andrew Luck's score already exists
    const andrewLuckExists = leaderboard.some(entry => entry.name === 'ANDREW LUCK' && entry.score === 121212121212121212);
    
    // Add Andrew Luck's score if it doesn't exist
    if (!andrewLuckExists) {
        leaderboard.push({
            name: 'ANDREW LUCK',
            score: 121212121212121212,
            date: new Date().toLocaleDateString()
        });
        
        // Sort by score descending and keep top 10
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 10);
        
        // Save back to localStorage
        localStorage.setItem('rocketmanLouLeaderboard', JSON.stringify(leaderboard));
    }
}

function displayLeaderboard(highlightScore = null) {
    const leaderboard = getLeaderboard();
    leaderboardList.innerHTML = '';
    
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = '<p style="color: #0ff; font-size: 0.6rem;">NO SCORES YET</p>';
        return;
    }
    
    leaderboard.forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'leaderboard-entry';
        
        if (highlightScore && entry.score === highlightScore && !entryDiv.classList.contains('highlight')) {
            entryDiv.classList.add('highlight');
            highlightScore = null; // Only highlight the first matching score
        }
        
        entryDiv.innerHTML = `
            <span class="leaderboard-rank">#${index + 1}</span>
            <span class="leaderboard-name">${entry.name}</span>
            <span class="leaderboard-score">${entry.score}</span>
        `;
        
        leaderboardList.appendChild(entryDiv);
    });
}

function resetGame() {
    // Re-enable submit button
    submitScoreBtn.disabled = false;
    submitScoreBtn.textContent = 'SUBMIT';
    
    // Reset to start screen
    gameOverScreen.classList.remove('active');
    startScreen.classList.add('active');
    
    gameState = GAME_STATES.START;
}

// Start the game
init();

