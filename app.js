document.addEventListener('DOMContentLoaded', function() {
    // Game constants
    const GRID_SIZE = 10; // 10x10 grid for procedurally generated Sokoban
    
    // Game elements
    const WALL = '#';
    const PLAYER = '@';
    const BOX = '$';
    const GOAL = '.';
    const PLAYER_ON_GOAL = '+';
    const BOX_ON_GOAL = '*';
    const FLOOR = ' ';
    
    // Game state
    let gameBoard = [];
    let playerPosition = { row: 0, col: 0 };
    let moveCount = 0;
    let gameOver = false;
    let gameWon = false;
    
    // DOM elements
    const gameContainer = document.querySelector('.game-container');
    const boardContainer = document.getElementById('board-container');
    const currentGuessContainer = document.getElementById('current-guess-container');
    const currentGuessElement = document.getElementById('current-guess');
    const submitBtn = document.getElementById('submit-btn');
    const emojiKeyboard = document.getElementById('emoji-keyboard');
    const guessesCounter = document.getElementById('guesses-counter');
    const howToPlayButton = document.getElementById('how-to-play');
    const gameDateElement = document.getElementById('game-date');
    
    // Debug DOM elements
    console.log("DOM Elements found:", {
        gameContainer,
        boardContainer,
        currentGuessContainer,
        currentGuessElement,
        submitBtn,
        emojiKeyboard,
        guessesCounter,
        howToPlayButton,
        gameDateElement
    });
    
    // Helper functions for date formatting
    function getFormattedDate() {
        const today = new Date();
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return today.toLocaleDateString('en-US', options);
    }
    
    function updateDateDisplay() {
        const formattedDate = getFormattedDate();
        if (gameDateElement) {
            gameDateElement.textContent = formattedDate;
        }
    }
    
    // Generate a random seed for game generation
    function getRandomSeed() {
        return Math.floor(Math.random() * 1000000);
    }
    
    // Initialize a 10x10 grid: 0 = empty, 1 = wall, 2 = player, 3 = box, 4 = target
    function initializeGrid() {
        let grid = Array(10).fill().map(() => Array(10).fill(0));
        // Set outer boundary as walls
        for (let i = 0; i < 10; i++) {
            grid[0][i] = 1;   // Top
            grid[9][i] = 1;   // Bottom
            grid[i][0] = 1;   // Left
            grid[i][9] = 1;   // Right
        }
        return grid;
    }

    // Random integer between min and max (inclusive)
    function randInt(min, max, seed) {
        // If seed is provided, use it for deterministic random generation
        if (seed !== undefined) {
            // Simple seeded random number generator
            const x = Math.sin(seed++) * 10000;
            return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
        }
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Check if a position is within grid boundaries
    function isWithinBoundaries(grid, x, y) {
        return x >= 0 && x < grid.length && y >= 0 && y < grid[0].length;
    }

    // Check if a box is in a corner (potential deadlock)
    function isInCorner(grid, x, y) {
        // Skip if it's a target position
        if (grid[x][y] === 4) return false;
        
        // Check for corner configurations (two adjacent walls forming a corner)
        const horizontalWall = (grid[x-1][y] === 1 || grid[x+1][y] === 1);
        const verticalWall = (grid[x][y-1] === 1 || grid[x][y+1] === 1);
        
        return horizontalWall && verticalWall;
    }

    // Check if a position is blocked by walls or boxes
    function isBlocked(grid, x, y) {
        if (!isWithinBoundaries(grid, x, y)) return true;
        return grid[x][y] === 1 || grid[x][y] === 3;
    }

    // Check if a box can be pushed in at least one direction
    function canBoxBePushed(grid, x, y) {
        // Check each direction (up, right, down, left)
        const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];
        
        for (const [dx, dy] of directions) {
            // Position in the pushing direction
            const pushX = x + dx;
            const pushY = y + dy;
            
            // Position behind the box (where player would stand)
            const playerX = x - dx;
            const playerY = y - dy;
            
            // Check if both positions are valid
            if (!isBlocked(grid, pushX, pushY) && !isBlocked(grid, playerX, playerY)) {
                return true;
            }
        }
        
        return false;
    }

    // Find a path between two positions using BFS
    function findPath(grid, startX, startY, endX, endY) {
        const queue = [[startX, startY]];
        const visited = new Set([`${startX},${startY}`]);
        const parent = new Map();
        
        while (queue.length > 0) {
            const [x, y] = queue.shift();
            
            if (x === endX && y === endY) {
                // Reconstruct path
                const path = [];
                let current = `${endX},${endY}`;
                
                while (current !== `${startX},${startY}`) {
                    const [cx, cy] = current.split(',').map(Number);
                    path.unshift([cx, cy]);
                    current = parent.get(current);
                }
                
                return path;
            }
            
            // Check all four directions
            const directions = [[-1, 0], [0, 1], [1, 0], [0, -1]];
            
            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;
                const key = `${nx},${ny}`;
                
                if (isWithinBoundaries(grid, nx, ny) && grid[nx][ny] !== 1 && !visited.has(key)) {
                    queue.push([nx, ny]);
                    visited.add(key);
                    parent.set(key, `${x},${y}`);
                }
            }
        }
        
        return null; // No path found
    }

    // Check if the level is solvable
    function isLevelSolvable(grid, boxes, targets) {
        // Find player position
        let playerX = -1, playerY = -1;
        
        for (let i = 0; i < grid.length; i++) {
            for (let j = 0; j < grid[i].length; j++) {
                if (grid[i][j] === 2) {
                    playerX = i;
                    playerY = j;
                    break;
                }
            }
            if (playerX !== -1) break;
        }
        
        // Check if player can reach all boxes
        for (const [boxX, boxY] of boxes) {
            if (!findPath(grid, playerX, playerY, boxX, boxY)) {
                return false;
            }
        }
        
        // Check if boxes can reach targets
        for (const [boxX, boxY] of boxes) {
            let canReachAnyTarget = false;
            
            for (const [targetX, targetY] of targets) {
                if (findPath(grid, boxX, boxY, targetX, targetY)) {
                    canReachAnyTarget = true;
                    break;
                }
            }
            
            if (!canReachAnyTarget) {
                return false;
            }
        }
        
        // Check if any box is in an unsolvable position
        for (const [boxX, boxY] of boxes) {
            // Skip if box is already on a target
            if (targets.some(([tx, ty]) => tx === boxX && ty === boxY)) {
                continue;
            }
            
            // Check if box is in a corner
            if (isInCorner(grid, boxX, boxY)) {
                return false;
            }
            
            // Check if box can be pushed
            if (!canBoxBePushed(grid, boxX, boxY)) {
                return false;
            }
        }
        
        return true;
    }

    // Generate a challenging Sokoban game with date-based seed
    function generateSokobanGame(seed) {
        // Determine number of boxes (3-7)
        const numBoxes = seed ? randInt(3, 7, seed) : randInt(3, 7);
        let grid = initializeGrid();
        let seedValue = seed || Date.now();
        
        // Create arrays to track boxes and targets
        let boxes = [];
        let targets = [];
        
        // Step 1: Place targets in strategic positions
        for (let i = 0; i < numBoxes; i++) {
            let targetPlaced = false;
            let attempts = 0;
            
            while (!targetPlaced && attempts < 50) {
                // Choose a position away from the edges
                const x = randInt(2, 7, seedValue++);
                const y = randInt(2, 7, seedValue++);
                
                // Avoid corners and existing targets
                if (!isInCorner(grid, x, y) && grid[x][y] === 0 && 
                    !targets.some(([tx, ty]) => Math.abs(tx - x) + Math.abs(ty - y) < 2)) {
                    grid[x][y] = 4; // Target
                    targets.push([x, y]);
                    targetPlaced = true;
                }
                
                attempts++;
            }
            
            // If we couldn't place a target after many attempts, try a different approach
            if (!targetPlaced) {
                for (let x = 2; x < 8; x++) {
                    for (let y = 2; y < 8; y++) {
                        if (grid[x][y] === 0 && !isInCorner(grid, x, y)) {
                            grid[x][y] = 4; // Target
                            targets.push([x, y]);
                            targetPlaced = true;
                            break;
                        }
                    }
                    if (targetPlaced) break;
                }
            }
        }
        
        // Step 2: Place boxes away from targets to create challenge
        for (let i = 0; i < numBoxes; i++) {
            let boxPlaced = false;
            let attempts = 0;
            
            while (!boxPlaced && attempts < 50) {
                // Choose a position away from the edges
                const x = randInt(2, 7, seedValue++);
                const y = randInt(2, 7, seedValue++);
                
                // Ensure box is not on a target and not in a corner
                if (grid[x][y] === 0 && !isInCorner(grid, x, y) && 
                    !boxes.some(([bx, by]) => Math.abs(bx - x) + Math.abs(by - y) < 2)) {
                    grid[x][y] = 3; // Box
                    boxes.push([x, y]);
                    boxPlaced = true;
                }
                
                attempts++;
            }
            
            // If we couldn't place a box after many attempts, try a different approach
            if (!boxPlaced) {
                for (let x = 2; x < 8; x++) {
                    for (let y = 2; y < 8; y++) {
                        if (grid[x][y] === 0 && !isInCorner(grid, x, y)) {
                            grid[x][y] = 3; // Box
                            boxes.push([x, y]);
                            boxPlaced = true;
                            break;
                        }
                    }
                    if (boxPlaced) break;
                }
            }
        }
        
        // Step 3: Add strategic walls to create interesting pathways
        const numWalls = randInt(5, 10, seedValue++);
        for (let i = 0; i < numWalls; i++) {
            let wallPlaced = false;
            let attempts = 0;
            
            while (!wallPlaced && attempts < 30) {
                const x = randInt(2, 7, seedValue++);
                const y = randInt(2, 7, seedValue++);
                
                // Ensure wall doesn't block any box or target
                if (grid[x][y] === 0 && 
                    !boxes.some(([bx, by]) => Math.abs(bx - x) + Math.abs(by - y) < 2) &&
                    !targets.some(([tx, ty]) => Math.abs(tx - x) + Math.abs(ty - y) < 2)) {
                    grid[x][y] = 1; // Wall
                    wallPlaced = true;
                }
                
                attempts++;
            }
        }
        
        // Step 4: Place player in a strategic position
        let playerPlaced = false;
        let attempts = 0;
        
        while (!playerPlaced && attempts < 50) {
            const x = randInt(2, 7, seedValue++);
            const y = randInt(2, 7, seedValue++);
            
            // Ensure player is not on a wall, box, or target
            if (grid[x][y] === 0) {
                grid[x][y] = 2; // Player
                playerPlaced = true;
            }
            
            attempts++;
        }
        
        // If we couldn't place the player, find any empty spot
        if (!playerPlaced) {
            for (let x = 1; x < 9; x++) {
                for (let y = 1; y < 9; y++) {
                    if (grid[x][y] === 0) {
                        grid[x][y] = 2; // Player
                        playerPlaced = true;
                        break;
                    }
                }
                if (playerPlaced) break;
            }
        }
        
        // Step 5: Verify level is solvable
        if (!isLevelSolvable(grid, boxes, targets)) {
            // If not solvable, generate a new level with a different seed
            return generateSokobanGame(seedValue + 1000);
        }
        
        return grid;
    }
    
    // Convert the numeric grid to game board format with characters
    function convertGridToGameBoard(grid) {
        const board = [];
        let playerFound = false;
        
        for (let i = 0; i < grid.length; i++) {
            const row = [];
            for (let j = 0; j < grid[i].length; j++) {
                switch (grid[i][j]) {
                    case 0: // Empty
                        row.push(FLOOR);
                        break;
                    case 1: // Wall
                        row.push(WALL);
                        break;
                    case 2: // Player
                        row.push(PLAYER);
                        playerPosition = { row: i, col: j };
                        playerFound = true;
                        break;
                    case 3: // Box
                        row.push(BOX);
                        break;
                    case 4: // Target
                        row.push(GOAL);
                        break;
                    case 5: // Player on target
                        row.push(PLAYER_ON_GOAL);
                        playerPosition = { row: i, col: j };
                        playerFound = true;
                        break;
                    case 6: // Box on target
                        row.push(BOX_ON_GOAL);
                        break;
                    default:
                        row.push(FLOOR);
                }
            }
            board.push(row);
        }
        
        console.log("Player position:", playerPosition, "Player found:", playerFound);
        
        return board;
    }

    // Initialize game
    function initGame() {
        // Update date display
        updateDateDisplay();
        
        // Generate a new game with a random seed
        const randomSeed = getRandomSeed();
        console.log("Generating game with seed:", randomSeed);
        const generatedGrid = generateSokobanGame(randomSeed);
        console.log("Generated grid:", generatedGrid);
        gameBoard = convertGridToGameBoard(generatedGrid);
        console.log("Converted game board:", gameBoard);
        
        // Create control buttons
        createControlButtons();
        
        // Update move counter
        moveCount = 0;
        updateMoveCounter();
        
        // Update the board
        updateBoard();
        
        // Show rules modal
        showRulesModal();
    }
    
    // Reset the current level with a new random game
    function resetLevel() {
        // Generate a new puzzle with a random seed
        const randomSeed = getRandomSeed();
        const generatedGrid = generateSokobanGame(randomSeed);
        gameBoard = convertGridToGameBoard(generatedGrid);
        
        moveCount = 0;
        gameOver = false;
        gameWon = false;
        updateMoveCounter();
        updateBoard();
    }
    
    // Check if the level is completed
    function checkLevelComplete() {
        for (let row = 0; row < gameBoard.length; row++) {
            for (let col = 0; col < gameBoard[row].length; col++) {
                if (gameBoard[row][col] === BOX) {
                    return;
                }
            }
        }
        
        gameOver = true;
        gameWon = true;
        
        setTimeout(() => {
            showCompletionModal(true);
            
            // After showing the completion modal, set a timer to generate a new game
            setTimeout(() => {
                resetLevel();
            }, 5000); // Generate a new game after 5 seconds
        }, 500);
    }
    
    // Update the board display
    function updateBoard() {
        console.log("Updating board with gameBoard:", gameBoard);
        
        // Check if gameBoard is properly initialized
        if (!gameBoard || !gameBoard.length) {
            console.error("Game board is not properly initialized!");
            return;
        }
        
        boardContainer.innerHTML = '';
        
        const boardElement = document.createElement('div');
        boardElement.classList.add('sokoban-board');
        
        for (let row = 0; row < gameBoard.length; row++) {
            const rowElement = document.createElement('div');
            rowElement.classList.add('sokoban-row');
            
            for (let col = 0; col < gameBoard[row].length; col++) {
                const cellElement = document.createElement('div');
                cellElement.classList.add('sokoban-cell');
                
                const cellValue = gameBoard[row][col];
                console.log(`Cell at [${row}][${col}] = "${cellValue}"`);
                
                switch (cellValue) {
                    case WALL:
                        cellElement.classList.add('wall');
                        break;
                    case PLAYER:
                        cellElement.classList.add('player');
                        break;
                    case BOX:
                        cellElement.classList.add('box');
                        break;
                    case GOAL:
                        cellElement.classList.add('goal');
                        break;
                    case PLAYER_ON_GOAL:
                        cellElement.classList.add('player', 'goal');
                        break;
                    case BOX_ON_GOAL:
                        cellElement.classList.add('box', 'goal');
                        break;
                    default:
                        cellElement.classList.add('floor');
                }
                
                rowElement.appendChild(cellElement);
            }
            
            boardElement.appendChild(rowElement);
        }
        
        boardContainer.appendChild(boardElement);
        console.log("Board updated, container now contains:", boardContainer.innerHTML);
    }
    
    // Update move counter
    function updateMoveCounter() {
        guessesCounter.textContent = `Moves: ${moveCount}`;
    }
    
    // Enhanced mobile experience for iOS Safari
    function enhanceMobileExperience() {
        function setViewportHeight() {
            document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        }
        
        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', () => {
            setTimeout(setViewportHeight, 300);
        });
    }
    
    // Show level complete modal
    function showLevelCompleteModal() {
        showCompletionModal(true);
    }
    
    // Function to show rules modal
    function showRulesModal() {
        // Create modal container
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        
        // Modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        
        const modalTitle = document.createElement('h2');
        modalTitle.textContent = 'HOW TO PLAY SUKOBAN';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.textContent = '×';
        closeButton.onclick = closeModal;
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);
        
        // Modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        modalContent.innerHTML = `
            <p>Sukoban is a classic puzzle game where you push boxes to their designated spots.</p>
            <p><strong>A new challenging puzzle with 3-7 boxes is generated each time you play!</strong></p>
            <hr style="margin: 12px 0; border-top: 1px solid var(--border-color);">
            
            <div class="rule-section">
                <div class="rule-number">1</div>
                <div class="rule-text">Move the character using the arrow keys or on-screen buttons.</div>
            </div>
            
            <div class="rule-section">
                <div class="rule-number">2</div>
                <div class="rule-text">Push boxes onto the goal spots (marked with dots).</div>
            </div>
            
            <div class="rule-section">
                <div class="rule-number">3</div>
                <div class="rule-text">You can only push one box at a time, not pull them.</div>
            </div>
            
            <div class="rule-section">
                <div class="rule-number">4</div>
                <div class="rule-text">Plan your moves carefully! Each puzzle requires strategic thinking.</div>
            </div>
            
            <div class="rule-section">
                <div class="rule-number">5</div>
                <div class="rule-text">Be careful with corners - boxes pushed into corners can become stuck!</div>
            </div>
            
            <div class="rule-section">
                <div class="rule-number">6</div>
                <div class="rule-text">Press 'R' or the center button to restart with a new puzzle.</div>
            </div>
            
            <div class="rule-section">
                <div class="rule-number">7</div>
                <div class="rule-text">Advanced tip: Try to plan several moves ahead - like chess!</div>
            </div>
        `;
        
        // Modal footer
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        
        const playButton = document.createElement('button');
        playButton.className = 'modal-play-button';
        playButton.textContent = 'LET\'S PLAY';
        playButton.onclick = closeModal;
        
        modalFooter.appendChild(playButton);
        
        // Assemble modal
        modalContainer.appendChild(modalHeader);
        modalContainer.appendChild(modalContent);
        modalContainer.appendChild(modalFooter);
        modalOverlay.appendChild(modalContainer);
        
        document.body.appendChild(modalOverlay);
        
        // Prevent scrolling when modal is open
        document.body.style.overflow = 'hidden';
    }
    
    function showCompletionModal(isWon) {
        // Create modal container
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        
        // Modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header completion-modal-header';
        
        const modalTitle = document.createElement('h2');
        modalTitle.textContent = isWon ? 'Puzzle Solved!' : 'Game Over';
        modalTitle.className = isWon ? 'success-title' : '';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.textContent = '×';
        closeButton.onclick = closeModal;
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);
        
        // Modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Create result message
        let resultMessage = '';
        if (isWon) {
            // Evaluate performance based on move count and puzzle complexity
            const numBoxes = countBoxesInGrid(gameBoard);
            
            // Estimate optimal solution range based on boxes
            const estimatedOptimal = numBoxes * 15; // Rough estimate of optimal moves
            
            let performanceRating = '';
            let performanceClass = '';
            
            if (moveCount <= estimatedOptimal) {
                performanceRating = 'Master Solver! You found an extremely efficient solution!';
                performanceClass = 'performance-excellent';
            } else if (moveCount <= estimatedOptimal * 1.5) {
                performanceRating = 'Expert! You solved it very efficiently!';
                performanceClass = 'performance-great';
            } else if (moveCount <= estimatedOptimal * 2) {
                performanceRating = 'Great job! You showed good strategic thinking.';
                performanceClass = 'performance-good';
            } else if (moveCount <= estimatedOptimal * 3) {
                performanceRating = 'Well done! You solved this challenging puzzle.';
                performanceClass = 'performance-ok';
            } else {
                performanceRating = 'You completed the puzzle! With practice, you\'ll become more efficient.';
                performanceClass = 'performance-normal';
            }
            
            resultMessage = `Congratulations! You completed the puzzle in ${moveCount} moves!`;
            
            // Add share button or score info
            const shareSection = document.createElement('div');
            shareSection.className = 'share-section';
            
            const performanceText = document.createElement('p');
            performanceText.className = performanceClass;
            performanceText.textContent = performanceRating;
            
            const strategyTip = document.createElement('p');
            strategyTip.className = 'strategy-tip';
            strategyTip.innerHTML = 'Pro tip: In Sokoban, the shortest solution path requires careful planning to avoid unnecessary moves.';
            
            const shareText = document.createElement('p');
            shareText.textContent = 'Try another puzzle to test your skills!';
            
            shareSection.appendChild(performanceText);
            shareSection.appendChild(strategyTip);
            shareSection.appendChild(shareText);
            modalContent.appendChild(shareSection);
        } else {
            resultMessage = `Keep trying! Strategic thinking is key to solving Sokoban puzzles.`;
        }
        
        // Configure message text
        const messageText = document.createElement('p');
        messageText.className = 'result-message';
        messageText.textContent = resultMessage;
        
        // Add message to content
        modalContent.appendChild(messageText);
        
        // Modal footer
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        
        const newGameButton = document.createElement('button');
        newGameButton.className = 'modal-play-button';
        newGameButton.textContent = 'NEW PUZZLE';
        newGameButton.onclick = function() {
            closeModal();
            resetLevel();
        };
        
        modalFooter.appendChild(newGameButton);
        
        // Assemble modal
        modalContainer.appendChild(modalHeader);
        modalContainer.appendChild(modalContent);
        modalContainer.appendChild(modalFooter);
        modalOverlay.appendChild(modalContainer);
        
        document.body.appendChild(modalOverlay);
        
        // Prevent scrolling when modal is open
        document.body.style.overflow = 'hidden';
    }
    
    // Helper function to count boxes in the grid
    function countBoxesInGrid(gameBoard) {
        let boxCount = 0;
        for (let row = 0; row < gameBoard.length; row++) {
            for (let col = 0; col < gameBoard[row].length; col++) {
                if (gameBoard[row][col] === BOX || gameBoard[row][col] === BOX_ON_GOAL) {
                    boxCount++;
                }
            }
        }
        return boxCount;
    }
    
    // Create control buttons
    function createControlButtons() {
        emojiKeyboard.innerHTML = '';
        
        const dpadContainer = document.createElement('div');
        dpadContainer.classList.add('dpad-container');
        
        const directions = [
            { key: 'ArrowUp', label: '↑', action: () => movePlayer(0, -1), position: 'top' },
            { key: 'ArrowLeft', label: '←', action: () => movePlayer(-1, 0), position: 'left' },
            { key: 'ArrowDown', label: '↓', action: () => movePlayer(0, 1), position: 'bottom' },
            { key: 'ArrowRight', label: '→', action: () => movePlayer(1, 0), position: 'right' }
        ];
        
        directions.forEach(dir => {
            const button = document.createElement('button');
            button.classList.add('emoji-key', 'dpad-button', `dpad-${dir.position}`);
            button.textContent = dir.label;
            button.addEventListener('click', dir.action);
            dpadContainer.appendChild(button);
        });
        
        const resetButton = document.createElement('button');
        resetButton.classList.add('emoji-key', 'dpad-button', 'dpad-center');
        resetButton.textContent = '↻';
        resetButton.addEventListener('click', resetLevel);
        dpadContainer.appendChild(resetButton);
        
        emojiKeyboard.appendChild(dpadContainer);
        
        document.addEventListener('keydown', handleKeyPress);
    }
    
    // Handle keyboard input
    function handleKeyPress(event) {
        if (gameOver) return;
        
        switch (event.key) {
            case 'ArrowUp':
                movePlayer(0, -1);
                break;
            case 'ArrowDown':
                movePlayer(0, 1);
                break;
            case 'ArrowLeft':
                movePlayer(-1, 0);
                break;
            case 'ArrowRight':
                movePlayer(1, 0);
                break;
            case 'r':
            case 'R':
                resetLevel();
                break;
        }
    }
    
    // Move the player
    function movePlayer(dx, dy) {
        if (gameOver) return;
        
        const newRow = playerPosition.row + dy;
        const newCol = playerPosition.col + dx;
        
        if (newRow < 0 || newRow >= gameBoard.length || newCol < 0 || newCol >= gameBoard[0].length) {
            return;
        }
        
        const currentCell = gameBoard[playerPosition.row][playerPosition.col];
        const targetCell = gameBoard[newRow][newCol];
        
        if (targetCell === WALL) {
            return;
        }
        
        if (targetCell === BOX || targetCell === BOX_ON_GOAL) {
            const boxNewRow = newRow + dy;
            const boxNewCol = newCol + dx;
            
            if (boxNewRow < 0 || boxNewRow >= gameBoard.length || boxNewCol < 0 || boxNewCol >= gameBoard[0].length) {
                return;
            }
            
            const boxTargetCell = gameBoard[boxNewRow][boxNewCol];
            
            if (boxTargetCell === WALL || boxTargetCell === BOX || boxTargetCell === BOX_ON_GOAL) {
                return;
            }
            
            if (boxTargetCell === GOAL) {
                gameBoard[boxNewRow][boxNewCol] = BOX_ON_GOAL;
            } else {
                gameBoard[boxNewRow][boxNewCol] = BOX;
            }
        }
        
        if (currentCell === PLAYER_ON_GOAL) {
            gameBoard[playerPosition.row][playerPosition.col] = GOAL;
        } else {
            gameBoard[playerPosition.row][playerPosition.col] = FLOOR;
        }
        
        if (targetCell === GOAL || targetCell === BOX_ON_GOAL) {
            gameBoard[newRow][newCol] = PLAYER_ON_GOAL;
        } else {
            gameBoard[newRow][newCol] = PLAYER;
        }
        
        playerPosition = { row: newRow, col: newCol };
        
        moveCount++;
        updateMoveCounter();
        
        updateBoard();
        
        checkLevelComplete();
    }
    
    // Close modal
    function closeModal() {
        const modalOverlay = document.querySelector('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.classList.add('closing');
            setTimeout(() => {
                document.body.removeChild(modalOverlay);
                document.body.style.overflow = '';
            }, 300);
        }
    }
    
    // How to play button
    howToPlayButton.addEventListener('click', function(e) {
        e.preventDefault();
        showRulesModal();
    });
    
    // Fix for buttons to prevent them from staying in the active state on mobile
    document.addEventListener('touchend', function(e) {
        const button = e.target.closest('.emoji-key');
        if (button) {
            setTimeout(() => {
                button.blur();
            }, 100);
        }
    });
    
    // Call enhanced mobile experience
    enhanceMobileExperience();
    
    // Initialize game
    initGame();
});