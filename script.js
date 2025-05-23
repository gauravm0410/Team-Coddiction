// Wait for the HTML document to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // --- Get References to DOM Elements ---
    const character = document.getElementById('character');
    const gameArea = document.getElementById('game-area');
    const obstacleDisplay = document.getElementById('obstacle-display');
    const obstacleWordEl = document.getElementById('obstacle-word');
    const responseForm = document.getElementById('response-form');
    const responseInput = document.getElementById('response-input');
    const submitButton = document.getElementById('submit-button');
    const skipButton = document.getElementById('skip-button');
    const nextButton = document.getElementById('next-button');
    const timerSpan = document.querySelector('#timer span');
    const scoreSpan = document.querySelector('#score span');
    const livesSpan = document.querySelector('#lives span');
    const feedbackEl = document.getElementById('feedback');
    const explanationEl = document.getElementById('explanation');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const finalScoreSpan = document.getElementById('final-score');
    const retryButton = document.getElementById('retry-button');
    const startGameOverlay = document.getElementById('start-game-overlay');
    const startGameButton = document.getElementById('start-game-button');

    // --- Audio Element References ---
    const sounds = {
        correct: [
            document.getElementById('correct-sound-1'),
            document.getElementById('correct-sound-2'),
            document.getElementById('correct-sound-3')
        ],
        correctStreak: document.getElementById('correct-sound-streak'),
        wrong: [
            document.getElementById('wrong-sound-1'),
            document.getElementById('wrong-sound-2')
        ],
        timeout: document.getElementById('timeout-sound'),
        skip: document.getElementById('skip-sound'),
        gameOver: document.getElementById('game-over-sound')
    };

    // --- Game Configuration Constants ---
    // !! IMPORTANT: Make sure this matches the address your FastAPI backend is running on !!
    const apiBaseUrl = "http://127.0.0.1:8000";
    const initialTime = 20;
    const initialLives = 3;
    const stepHeight = 40;
    const animationDuration = 500; // ms (match CSS --animation-speed * 1000)

    // --- Game State Variables ---
    let score = 0;
    let lives = initialLives;
    let currentObstacle = ""; // Will be fetched from backend
    let timerValue = initialTime;
    let timerInterval = null;
    let currentStep = 0;
    let isAnimating = false; // For visual animations
    let isWaitingForResponse = false; // To prevent multiple submissions
    let successiveCorrect = 0;

    // --- Sound Function ---
    function playSound(audioElement) {
        if (audioElement && audioElement.readyState >= 2) { // Check if ready
            audioElement.currentTime = 0; // Rewind to start
            audioElement.play().catch(error => {
                // Log non-critical errors (e.g., user hasn't interacted yet)
                console.warn("Sound playback warning:", error);
            });
        } else if (audioElement) {
            console.warn("Audio element not ready:", audioElement.id);
        }
    }

    // --- Obstacle & Validation Functions (Now using API) ---
async function getNewObstacle() {
    setGameplayButtonsDisabled(true); // Disable buttons while fetching
    obstacleWordEl.textContent = "Loading...";
    obstacleDisplay.classList.add('new-obstacle'); // Start fade-in animation later

    try {
        const response = await fetch('${apiBaseUrl}/get-obstacle');
        if (!response.ok) {
            throw new Error('HTTP error! status: ${response.status}');
        }
        const data = await response.json();
        currentObstacle = data.obstacle;

        // Update UI after a short delay for animation effect
        setTimeout(() => {
            obstacleWordEl.textContent = currentObstacle;
            obstacleDisplay.classList.remove('new-obstacle');
            resetInputAndTimer(); // Enable input/buttons and start timer ONLY after getting obstacle
        }, 150);

    } catch (error) {
        console.error("Error fetching obstacle:", error);
        obstacleWordEl.textContent = "Error!";
        feedbackEl.textContent = "Could not fetch obstacle. Please check backend connection.";
        feedbackEl.className = 'feedback-message incorrect visible';
        // Don't start the timer or enable input if fetching failed
        setGameplayButtonsDisabled(true); // Keep buttons disabled
        responseInput.disabled = true;
    }
}async function getNewObstacle() {
    setGameplayButtonsDisabled(true); // Disable buttons while fetching
    obstacleWordEl.textContent = "Loading...";
    obstacleDisplay.classList.add('new-obstacle'); // Start fade-in animation later

    try {
        const response = await fetch('${apiBaseUrl}/get-obstacle');
        if (!response.ok) {
            throw new Error('HTTP error! status: ${response.status}');
        }
        const data = await response.json();
        currentObstacle = data.obstacle;

        // Update UI after a short delay for animation effect
        setTimeout(() => {
            obstacleWordEl.textContent = currentObstacle;
            obstacleDisplay.classList.remove('new-obstacle');
            resetInputAndTimer(); // Enable input/buttons and start timer ONLY after getting obstacle
        }, 150);

    } catch (error) {
        console.error("Error fetching obstacle:", error);
        obstacleWordEl.textContent = "Error!";
        feedbackEl.textContent = "Could not fetch obstacle. Please check backend connection.";
        feedbackEl.className = 'feedback-message incorrect visible';
        // Don't start the timer or enable input if fetching failed
        setGameplayButtonsDisabled(true); // Keep buttons disabled
        responseInput.disabled = true;
    }
}



    // Validation is now handled within the form submit event listener

    // --- UI & Timer Functions ---
    function updateUI() {
        scoreSpan.textContent = score;
        livesSpan.textContent = '❤'.repeat(lives) + '🖤'.repeat(initialLives - lives);
        timerSpan.textContent = timerValue;

        const currentY = -currentStep * stepHeight;
        character.style.setProperty('--current-y', '${currentY}px');
    }

    function startTimer() {
        clearInterval(timerInterval);
        timerValue = initialTime;
        updateUI();

        timerInterval = setInterval(() => {
            timerValue--;
            updateUI();
            if (timerValue <= 0) {
                clearInterval(timerInterval);
                if (!isWaitingForResponse) { // Only trigger timeout if not already processing
                    handleTimeout();
                }
            }
        }, 1000);
    }

    function clearFeedbackAndExplanation() {
        feedbackEl.classList.remove('visible');
        explanationEl.classList.remove('visible');
        // Use timeout to allow fade-out animation before clearing text
        setTimeout(() => {
            feedbackEl.textContent = '';
            explanationEl.textContent = '';
            feedbackEl.className = 'feedback-message'; // Reset class
            explanationEl.className = 'explanation-message'; // Reset class
        }, 400); // Match CSS transition duration
    }

    // --- Core Game Logic Functions ---

    function handleCorrectAnswer() {
        if (isAnimating) return;
        isAnimating = true; // Lock visual animation
        isWaitingForResponse = false; // Response received
        setGameplayButtonsDisabled(true); // Keep disabled during animation
        nextButton.classList.add('hidden'); // Ensure next button is hidden

        clearFeedbackAndExplanation(); // Clear previous messages

        score += 10;
        currentStep++;
        successiveCorrect++;

        let feedbackText = "Correct!";
        let soundToPlay = sounds.correct[0];

        // Determine feedback text and sound based on streak
        if (successiveCorrect === 2) {
            feedbackText = "Good Job!";
            soundToPlay = sounds.correct[1] || sounds.correct[0];
        } else if (successiveCorrect === 3) {
            feedbackText = "Bravo!";
            soundToPlay = sounds.correct[2] || sounds.correct[0];
        } else if (successiveCorrect > 3) {
            feedbackText = "Amazing!";
            soundToPlay = sounds.correctStreak || sounds.correct[0];
        }
        playSound(soundToPlay);

        const targetY = -currentStep * stepHeight;
        character.style.setProperty('--target-y', '${targetY}px');

        // Trigger visual animations
        character.classList.add('is-jumping');
        character.classList.add('correct-feedback');
        feedbackEl.textContent = feedbackText;
        feedbackEl.className = 'feedback-message correct visible';

        // After animation completes...
        setTimeout(() => {
            character.classList.remove('is-jumping');
            character.classList.remove('correct-feedback');
            character.style.setProperty('--current-y', '${targetY}px'); // Teleport to final position

            updateUI(); // Update score display
            getNewObstacle(); // Fetch the next obstacle (this will also call resetInputAndTimer)
            isAnimating = false; // Unlock animation
        }, animationDuration);
    }

    function handleIncorrectAnswer(explanation, isTimeout = false, isSkip = false) {
         // Allow skip to interrupt visual animation, but not regular incorrect/timeout if already animating
        if (isAnimating && !isSkip) return;
        isAnimating = true; // Lock visual animation
        isWaitingForResponse = false; // Response received

        setGameplayButtonsDisabled(true); // Disable Submit/Skip
        responseInput.disabled = true; // Disable input immediately
        clearInterval(timerInterval); // Stop timer explicitly

        clearFeedbackAndExplanation(); // Clear previous messages

        lives--;
        successiveCorrect = 0; // Reset streak

        let feedbackText = "Incorrect!";
        let soundToPlay = sounds.wrong[Math.floor(Math.random() * sounds.wrong.length)];

        if (isTimeout) {
            feedbackText = "Time's up!";
            soundToPlay = sounds.timeout || soundToPlay;
        } else if (isSkip) {
            feedbackText = "Skipped!";
            soundToPlay = sounds.skip || null;
        } else {
            // Use more varied incorrect messages
            const wrongMessages = ["Incorrect!", "Oops!", "Not quite!", "Try another way!"];
            feedbackText = wrongMessages[Math.floor(Math.random() * wrongMessages.length)];
        }

        playSound(soundToPlay);

        // Display feedback and explanation from backend
        feedbackEl.textContent = feedbackText;
        feedbackEl.className = 'feedback-message incorrect visible';
        if (explanation) {
            explanationEl.textContent = 'Hint: ${explanation}'; // Add "Hint:" prefix
            explanationEl.classList.add('visible');
        }

        // Animate fall only if not skipping
        if (!isSkip) {
            character.classList.add('is-falling');
            character.classList.add('incorrect-feedback');
        } else {
            currentStep = 0; // Reset step count internally immediately for skip
        }

        // Use shorter delay for skip, full animation time otherwise
        const delay = isSkip ? 100 : animationDuration;

        setTimeout(() => {
            character.classList.remove('is-falling');
            character.classList.remove('incorrect-feedback');

            // Reset character position visually to the bottom
            currentStep = 0; // Ensure step count is reset
            const resetY = -currentStep * stepHeight;
            character.style.setProperty('--current-y', '${resetY}px');
            void character.offsetWidth; // Force reflow to apply reset position immediately

            updateUI(); // Update lives display

            if (lives <= 0) {
                gameOver();
            } else {
                // --- MODIFICATION: Show 'Next' button instead of proceeding ---
                nextButton.classList.remove('hidden'); // Show the button
                nextButton.focus(); // Focus the button for accessibility
                // Do NOT call getNewObstacle or resetInputAndTimer here
                // Do NOT set isAnimating = false here yet (released by Next button)
            }
        }, delay);
    }

    function handleTimeout() {
        // We don't have the explanation here yet, show generic timeout message
        // The explanation might appear if the user submits after timeout, handled by submit logic.
        handleIncorrectAnswer("Think faster next time or check connection!", true, false);
    }

    function handleSkip() {
        if (isWaitingForResponse || isAnimating || lives <= 0 || !nextButton.classList.contains('hidden')) return;
        clearInterval(timerInterval);
        // Pass a generic explanation for skip, as we don't validate it
        handleIncorrectAnswer("Obstacle skipped.", false, true);
    }

    function gameOver() {
        clearInterval(timerInterval);
        playSound(sounds.gameOver);
        finalScoreSpan.textContent = score;
        gameOverOverlay.classList.remove('hidden');
        isAnimating = false; // Release lock
        isWaitingForResponse = false;
        setGameplayButtonsDisabled(true); // Keep disabled
        nextButton.classList.add('hidden'); // Ensure next button is hidden
        responseInput.disabled = true;
        clearFeedbackAndExplanation();
    }

    function resetGame() {
        score = 0;
        lives = initialLives;
        currentStep = 0;
        successiveCorrect = 0;
        isAnimating = false;
        isWaitingForResponse = false; // Reset request lock

        clearFeedbackAndExplanation();

        gameOverOverlay.classList.add('hidden'); // Hide game over screen
        nextButton.classList.add('hidden'); // Hide next button
        startGameOverlay.classList.add('hidden'); // Ensure start overlay is hidden

        updateUI(); // Reset score/lives/position visually
        getNewObstacle(); // Fetch the first obstacle (will enable controls on success)
    }

    function resetInputAndTimer() {
        responseInput.value = '';
        responseInput.disabled = false; // Ensure input is enabled
        setGameplayButtonsDisabled(false); // Re-enable Submit/Skip
        responseInput.focus();
        startTimer(); // Start timer for the new obstacle
        isWaitingForResponse = false; // Allow new submissions
    }

    /** Helper to enable/disable gameplay action buttons (Submit, Skip). */
    function setGameplayButtonsDisabled(disabled) {
         submitButton.disabled = disabled;
         skipButton.disabled = disabled;
    }


    // --- Event Listeners ---

    // Start Button Listener
    startGameButton.addEventListener('click', () => {
        // Preload sounds on first interaction if possible
        Object.values(sounds).flat().forEach(sound => {
            if(sound) sound.load();
        });
        resetGame(); // Initialize and start the game
    });

    // Response Form Submission Listener
    responseForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default form submission
        if (isAnimating || isWaitingForResponse || lives <= 0 || !nextButton.classList.contains('hidden')) {
            return;
        }
    
        const responseText = responseInput.value.trim();
        if (!responseText) return; // Ignore empty input
    
        clearInterval(timerInterval); // Stop timer immediately
        setGameplayButtonsDisabled(true); // Disable buttons during validation
        responseInput.disabled = true; // Disable input during validation
        isWaitingForResponse = true; // Lock submission until response is received
        feedbackEl.textContent = 'Checking...'; // Provide feedback
        feedbackEl.className = 'feedback-message visible';
        explanationEl.classList.remove('visible'); // Hide old explanation
    
        try {
            const response = await fetch('${apiBaseUrl}/validate-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    obstacle: currentObstacle,
                    response: responseText
                }),
            });
    
            if (!response.ok) {
                let errorDetail = 'HTTP error! status: ${response.status}';
                try {
                    const errorData = await response.json();
                    errorDetail = errorData.detail || errorDetail;
                } catch (jsonError) {
                    // Ignore if response body wasn't valid JSON
                }
                throw new Error(errorDetail);
            }
    
            const result = await response.json();
    
            if (result.valid) {
                handleCorrectAnswer(); // Handles getting next obstacle internally
            } else {
                handleIncorrectAnswer(result.explanation, false, false);
            }
    
        } catch (error) {
            console.error("Error validating response:", error);
            feedbackEl.textContent = 'Validation Error: ${error.message}';
            feedbackEl.className = 'feedback-message incorrect visible';
            lives--; // Penalize for error? Optional.
            successiveCorrect = 0;
            updateUI();
            if (lives <= 0) {
                gameOver();
            } else {
                nextButton.classList.remove('hidden'); // Allow proceeding
                nextButton.focus();
                isWaitingForResponse = false; // Unlock
                isAnimating = false; // Ensure animation lock is released on error
            }
        }
    });

    // Skip Button Listener
    skipButton.addEventListener('click', () => {
        // Don't skip if waiting for backend or waiting for "Next" button
        if (isWaitingForResponse || !nextButton.classList.contains('hidden')) return;
        handleSkip();
    });

    // Retry Button Listener (from Game Over screen)
    retryButton.addEventListener('click', resetGame);

    // Next Button Listener (after incorrect answer/error)
    nextButton.addEventListener('click', () => {
        if (lives <= 0) return; // Safety check

        nextButton.classList.add('hidden'); // Hide itself
        clearFeedbackAndExplanation(); // Clear messages

        // Now proceed to the next round
        isAnimating = false; // Ensure animation lock is released
        getNewObstacle(); // Fetch next obstacle (which calls resetInputAndTimer on success)
    });

    // --- Initial Game Setup ---
    // Game does NOT start automatically. It waits for the Start button click.
    // Initial state is the Start Game Overlay being visible.
    // Disable gameplay buttons initially until game starts
    setGameplayButtonsDisabled(true);
    responseInput.disabled = true;
    updateUI(); // Show initial lives

}); // End of DOMContentLoaded listener