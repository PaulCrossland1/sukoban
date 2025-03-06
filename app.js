document.addEventListener('DOMContentLoaded', function() {
  // Game constants
  const MAX_GUESSES = 20;
  const CODE_LENGTH = 4;
  const EMOJIS_TO_SELECT = 5;
  const VISIBLE_GUESSES = 5;
  
  // A pool of 50 emojis as requested
  const EMOJI_POOL = [
      '😀', '😎', '🥳', '🤔', '😴', 
      '🐱', '🐶', '🐼', '🐨', '🦊',
      '🍎', '🍌', '🍉', '🍇', '🍓',
      '🚀', '🚗', '🚲', '✈️', '🛸',
      '⚽', '🏀', '🎾', '🏓', '🎯',
      '🎸', '🎹', '🎺', '🎻', '🥁',
      '💡', '💎', '🔑', '⌚', '📱',
      '🌈', '🌞', '⭐', '🌙', '☁️',
      '🏠', '🏰', '🏝️', '🏔️', '🌋',
      '❤️', '🧩', '🎁', '🎨', '🔮'
  ];
  
  // Game state
  let todaysEmojis = [];
  let secretCode = [];
  let currentGuess = Array(CODE_LENGTH).fill(null);
  let guessHistory = [];
  let gameOver = false;
  
  // DOM elements
  const gameContainer = document.querySelector('.game-container');
  const boardContainer = document.getElementById('board-container');
  const currentGuessContainer = document.getElementById('current-guess-container');
  const currentGuessElement = document.getElementById('current-guess');
  const guessSlots = document.querySelectorAll('.guess-slot');
  const submitBtn = document.getElementById('submit-btn');
  const emojiKeyboard = document.getElementById('emoji-keyboard');
  const guessesCounter = document.getElementById('guesses-counter');
  const howToPlayButton = document.getElementById('how-to-play');
  const gameDateElement = document.getElementById('game-date');
  
  // Seeded random number generator
  function seedRandom(seed) {
      let state = seed;
      
      return function() {
          state = (state * 9301 + 49297) % 233280;
          return state / 233280;
      };
  }
  
  // Get today's date in UTC format for consistent seeding
  function getTodayUTC() {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const day = now.getUTCDate();
      
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  
  // Helper functions for date formatting
  function getFormattedDate() {
      const today = new Date();
      const options = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
      return today.toLocaleDateString('en-US', options);
  }
  
  function updateDateDisplay() {
      const formattedDate = getFormattedDate();
      if (gameDateElement) {
          gameDateElement.textContent = formattedDate;
      }
  }
  
  // Initialize game
  function initGame() {
      // Update date display
      updateDateDisplay();
      
      // Set up new game with today's date as seed
      const today = getTodayUTC();
      const seed = today.getTime();
      const random = seedRandom(seed);
      
      // Select today's emojis
      selectTodaysEmojis(random);
      
      // Generate secret code from today's emojis
      generateSecretCode(random);
      
      // Create emoji keyboard
      createEmojiKeyboard();
      
      // Reset guesses counter
      updateGuessesCounter();
      
      // Show rules modal
      showRulesModal();
  }
  
  // Select today's 5 emojis from the pool
  function selectTodaysEmojis(random) {
      // Create a copy of the emoji pool to shuffle
      const shuffledPool = [...EMOJI_POOL];
      
      // Fisher-Yates shuffle using seeded random
      for (let i = shuffledPool.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
      }
      
      // Take the first 5 emojis
      todaysEmojis = shuffledPool.slice(0, EMOJIS_TO_SELECT);
  }
  
  // Generate the secret 4-emoji code from today's 5 emojis
  function generateSecretCode(random) {
      secretCode = [];
      
      // Generate 4 positions, allowing duplicates
      for (let i = 0; i < CODE_LENGTH; i++) {
          const index = Math.floor(random() * EMOJIS_TO_SELECT);
          secretCode.push(todaysEmojis[index]);
      }
      
      // For debugging only - remove in production
      console.log('Today\'s emojis:', todaysEmojis);
      console.log('Secret code:', secretCode);
  }
  
  // Create emoji keyboard with today's emojis
  function createEmojiKeyboard() {
      emojiKeyboard.innerHTML = '';
      
      todaysEmojis.forEach(emoji => {
          const emojiKey = document.createElement('button');
          emojiKey.classList.add('emoji-key');
          emojiKey.textContent = emoji;
          emojiKey.addEventListener('click', () => handleEmojiSelection(emoji));
          emojiKeyboard.appendChild(emojiKey);
      });
  }
  
  // Handle emoji selection
  function handleEmojiSelection(emoji) {
      if (gameOver) return;
      
      // Find the first empty slot
      const emptySlotIndex = currentGuess.findIndex(slot => slot === null);
      
      if (emptySlotIndex !== -1) {
          // Fill the slot with the emoji
          currentGuess[emptySlotIndex] = emoji;
          
          // Update the UI
          const slot = guessSlots[emptySlotIndex];
          slot.textContent = emoji;
          slot.classList.add('filled');
          
          // Check if all slots are filled
          if (currentGuess.every(slot => slot !== null)) {
              submitBtn.disabled = false;
          }
      }
  }
  
  // Handle slot click to clear it
  function handleSlotClick(event) {
      if (gameOver) return;
      
      const slot = event.currentTarget;
      const index = parseInt(slot.dataset.index);
      
      if (currentGuess[index] !== null) {
          // Clear the slot
          currentGuess[index] = null;
          slot.textContent = '';
          slot.classList.remove('filled');
          
          // Disable submit button
          submitBtn.disabled = true;
      }
  }
  
  // Submit current guess
  function submitGuess() {
      if (gameOver || currentGuess.some(slot => slot === null)) return;
      
      // Generate feedback
      const feedback = getFeedback(currentGuess, secretCode);
      
      // Add to history
      guessHistory.push({
          emojis: [...currentGuess],
          feedback: feedback
      });
      
      // Check if game is won
      const isWon = feedback.black === CODE_LENGTH;
      
      // Check if game is over (won or max guesses reached)
      if (isWon || guessHistory.length >= MAX_GUESSES) {
          gameOver = true;
          showCompletionModal(isWon);
      }
      
      // Update the board
      updateBoard();
      
      // Reset current guess
      resetCurrentGuess();
      
      // Update guesses counter
      updateGuessesCounter();
  }
  
  // Generate feedback for a guess
  function getFeedback(guess, code) {
      let black = 0; // Correct emoji in correct position
      let white = 0; // Correct emoji in wrong position
      
      // Make copies to work with
      const guessCopy = [...guess];
      const codeCopy = [...code];
      
      // First pass: Check for correct emoji in correct position
      for (let i = 0; i < CODE_LENGTH; i++) {
          if (guessCopy[i] === codeCopy[i]) {
              black++;
              // Mark as matched
              guessCopy[i] = null;
              codeCopy[i] = null;
          }
      }
      
      // Second pass: Check for correct emoji in wrong position
      for (let i = 0; i < CODE_LENGTH; i++) {
          if (guessCopy[i] !== null) {
              const codeIndex = codeCopy.findIndex(emoji => emoji === guessCopy[i]);
              if (codeIndex !== -1) {
                  white++;
                  // Mark as matched
                  guessCopy[i] = null;
                  codeCopy[codeIndex] = null;
              }
          }
      }
      
      return { black, white };
  }
  
  // Update the board with guess history
  function updateBoard() {
      boardContainer.innerHTML = '';
      
      // Show only the last X guesses
      const startIndex = Math.max(0, guessHistory.length - VISIBLE_GUESSES);
      const visibleGuesses = guessHistory.slice(startIndex);
      
      // Add rows for visible guesses
      visibleGuesses.forEach(guess => {
          const row = createGuessRow(guess);
          boardContainer.appendChild(row);
      });
      
      // Scroll to the bottom
      boardContainer.scrollTop = boardContainer.scrollHeight;
  }
  
  // Create a row for a guess
  function createGuessRow(guess) {
      const row = document.createElement('div');
      row.classList.add('guess-row');
      
      // Create emojis section
      const emojisContainer = document.createElement('div');
      emojisContainer.classList.add('guess-emojis');
      
      guess.emojis.forEach(emoji => {
          const emojiElement = document.createElement('div');
          emojiElement.classList.add('guess-emoji');
          emojiElement.textContent = emoji;
          emojisContainer.appendChild(emojiElement);
      });
      
      // Create feedback section
      const feedbackContainer = document.createElement('div');
      feedbackContainer.classList.add('feedback-pegs');
      
      // Add black pegs first
      for (let i = 0; i < guess.feedback.black; i++) {
          const peg = document.createElement('div');
          peg.classList.add('feedback-peg', 'feedback-black');
          feedbackContainer.appendChild(peg);
      }
      
      // Then add white pegs
      for (let i = 0; i < guess.feedback.white; i++) {
          const peg = document.createElement('div');
          peg.classList.add('feedback-peg', 'feedback-white');
          feedbackContainer.appendChild(peg);
      }
      
      // Add empty pegs for the remaining slots
      const emptyPegs = CODE_LENGTH - guess.feedback.black - guess.feedback.white;
      for (let i = 0; i < emptyPegs; i++) {
          const peg = document.createElement('div');
          peg.classList.add('feedback-peg');
          feedbackContainer.appendChild(peg);
      }
      
      row.appendChild(emojisContainer);
      row.appendChild(feedbackContainer);
      
      return row;
  }
  
  // Reset current guess
  function resetCurrentGuess() {
      currentGuess = Array(CODE_LENGTH).fill(null);
      
      guessSlots.forEach(slot => {
          slot.textContent = '';
          slot.classList.remove('filled');
      });
      
      submitBtn.disabled = true;
  }
  
  // Update guesses counter
  function updateGuessesCounter() {
      guessesCounter.textContent = `${guessHistory.length}/${MAX_GUESSES}`;
  }
  
  // Copy text to clipboard
  function copyToClipboard(text) {
      // Create temporary element
      const tempElement = document.createElement('textarea');
      tempElement.value = text;
      tempElement.setAttribute('readonly', '');
      tempElement.style.position = 'absolute';
      tempElement.style.left = '-9999px';
      document.body.appendChild(tempElement);
      
      // Select and copy
      tempElement.select();
      document.execCommand('copy');
      
      // Clean up
      document.body.removeChild(tempElement);
  }
  
  // Enhanced mobile experience for iOS Safari
  function enhanceMobileExperience() {
      // Fix for iOS Safari viewport height issues
      function setViewportHeight() {
          // Set a CSS variable with the viewport height
          document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      }
      
      // Set initial height and update on resize
      setViewportHeight();
      window.addEventListener('resize', setViewportHeight);
      window.addEventListener('orientationchange', () => {
          setTimeout(setViewportHeight, 300);
      });
  }
  
  // Modal functions
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
      modalTitle.textContent = 'HOW TO PLAY MOJIMIND';
      
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
          <p>Welcome to Mojimind, the daily emoji puzzle challenge!</p>
          <br>
          <div class="rule-section">
              <div class="rule-number">1</div>
              <div class="rule-text">
                  <p>Guess the secret 4-emoji code chosen from the 5 emojis shown on your keyboard.</p>
              </div>
          </div>
          
          <div class="rule-section">
              <div class="rule-number">2</div>
              <div class="rule-text">
                  <p>After each guess, you'll get feedback:</p>
                  <p>• ⚫ Black peg = Correct emoji in the correct position.</p>
                  <p>• ⚪ White peg = Correct emoji in the wrong position.</p>
              </div>
          </div>
          
          <div class="rule-section">
              <div class="rule-number">3</div>
              <div class="rule-text">
                  <p>Tap a slot to clear it if you want to change your guess.</p>
              </div>
          </div>
          
          <div class="rule-section">
              <div class="rule-number">4</div>
              <div class="rule-text">
                  <p>You have 20 attempts to solve the puzzle. A new challenge is available every day!</p>
              </div>
          </div>
      `;
      
      // Modal footer
      const modalFooter = document.createElement('div');
      modalFooter.className = 'modal-footer';
      
      const playButton = document.createElement('button');
      playButton.className = 'modal-play-button';
      playButton.textContent = 'LET\'S GO';
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
  
  function showHowToPlayModal() {
      // Similar to showRulesModal but can be called from "how to play" button
      showRulesModal();
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
      
      // Performance rating based on number of guesses
      let performanceEmoji = '';
      if (isWon) {
          const guessCount = guessHistory.length;
          if (guessCount <= 5) {
              performanceEmoji = '🔥🔥🔥'; // Amazing
          } else if (guessCount <= 10) {
              performanceEmoji = '🔥🔥'; // Great
          } else if (guessCount <= 15) {
              performanceEmoji = '🔥'; // Good
          } else {
              performanceEmoji = '👍'; // Nice work
          }
      } else {
          performanceEmoji = '😢'; // Sad
      }
      
      // Create result message
      let resultMessage = '';
      if (isWon) {
          resultMessage = `You solved today's mojimind in ${guessHistory.length} guesses! ${performanceEmoji}`;
      } else {
          resultMessage = `Better luck next time! The code was: ${secretCode.join(' ')}`;
      }
      
      // Create text for share message
      const formattedDate = getFormattedDate();
      const shareText = `Mojimind: ${formattedDate}\n\n ${isWon ? `I solved it in ${guessHistory.length}/20 guesses, can you do better?` : 'Try again tomorrow!'}\nhttps://mojimind.com`;
      
      // Configure message text
      const messageText = document.createElement('p');
      messageText.className = 'result-message';
      messageText.textContent = resultMessage;
      
      // Performance graph
      const performanceGraph = document.createElement('div');
      performanceGraph.className = 'performance-graph';
      performanceGraph.textContent = performanceEmoji;
      
      // Create share button
      const shareButton = document.createElement('button');
      shareButton.textContent = 'SHARE RESULTS';
      shareButton.className = 'share-button';
      shareButton.onclick = function() {
          copyToClipboard(shareText);
          const originalText = this.textContent;
          this.textContent = 'COPIED!';
          setTimeout(() => {
              this.textContent = originalText;
          }, 2000);
      };
      
      // Add message and performance graph to content
      modalContent.appendChild(messageText);
      modalContent.appendChild(performanceGraph);
      modalContent.appendChild(shareButton);
      
      // If game was lost, show the secret code
      if (!isWon) {
          const codeReveal = document.createElement('div');
          codeReveal.style.display = 'flex';
          codeReveal.style.justifyContent = 'center';
          codeReveal.style.gap = '8px';
          codeReveal.style.margin = '20px 0';
          
          secretCode.forEach(emoji => {
              const emojiElement = document.createElement('div');
              emojiElement.classList.add('guess-emoji');
              emojiElement.style.width = '40px';
              emojiElement.style.height = '40px';
              emojiElement.textContent = emoji;
              codeReveal.appendChild(emojiElement);
          });
          
          modalContent.insertBefore(codeReveal, performanceGraph);
      }
      
      // Modal footer
      const modalFooter = document.createElement('div');
      modalFooter.className = 'modal-footer';
      
      const closeModalButton = document.createElement('button');
      closeModalButton.className = 'modal-play-button';
      closeModalButton.textContent = 'CLOSE';
      closeModalButton.onclick = closeModal;
      
      modalFooter.appendChild(closeModalButton);
      
      // Assemble modal
      modalContainer.appendChild(modalHeader);
      modalContainer.appendChild(modalContent);
      modalContainer.appendChild(modalFooter);
      modalOverlay.appendChild(modalContainer);
      
      document.body.appendChild(modalOverlay);
      
      // Prevent scrolling when modal is open
      document.body.style.overflow = 'hidden';
  }
  
  function closeModal() {
      const modalOverlay = document.querySelector('.modal-overlay');
      if (modalOverlay) {
          // Add closing animation
          modalOverlay.classList.add('closing');
          
          // Wait for animation to complete before removing
          setTimeout(() => {
              document.body.removeChild(modalOverlay);
              document.body.style.overflow = '';
          }, 300);
      }
  }
  
  // Add click events to guess slots
  guessSlots.forEach(slot => {
      slot.addEventListener('click', handleSlotClick);
  });
  
  // Submit button
  submitBtn.addEventListener('click', submitGuess);
  
  // How to play button
  howToPlayButton.addEventListener('click', function(e) {
      e.preventDefault();
      showHowToPlayModal();
  });
  
  // Call enhanced mobile experience
  enhanceMobileExperience();
  
  // Initialize game
  initGame();
});