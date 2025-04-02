document.addEventListener('DOMContentLoaded', () => {
    // --- Get References to DOM Elements ---
    const character = document.getElementById('character');
    const gameArea = document.getElementById('game-area');
    const obstacleWordEl = document.getElementById('obstacle-word');
    const responseForm = document.getElementById('response-form');
    const responseInput = document.getElementById('response-input');
    const submitButton = document.getElementById('submit-button');
    const timerSpan = document.querySelector('#timer span');
    const scoreSpan = document.querySelector('#score span');
    const livesSpan = document.querySelector('#lives span');
    const feedbackEl = document.getElementById('feedback');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const finalScoreSpan = document.getElementById('final-score');
    const retryButton = document.getElementById('retry-button');

    // --- Game Configuration Constants ---
    // const apiBaseUrl = "http://127.0.0.1:8000"; // Not used in this version
    const initialTime = 20; // Starting time per obstacle
    const initialLives = 3; // Starting number of lives
    const stepHeight = 40; // Vertical distance per step (should match CSS --step-height)
    const animationDuration = 500; // Duration of animations in milliseconds (match CSS --animation-speed)

    // --- Game State Variables ---
    let score = 0;
    let lives = initialLives;
    let currentObstacle = ""; // The word for the current obstacle
    let timerValue = initialTime;
    let timerInterval = null; // Holds the interval ID for the timer
    let currentStep = 0; // Tracks how many steps the character has climbed
    let isAnimating = false; // Flag to prevent actions during animations

    // --- *** EXPANDED Obstacle Simulation *** ---
    const simulatedObstacles = {
        // Easy (Difficulty 1 approx)
        "rock": ["jump", "climb", "dodge", "smash", "pickaxe", "avoid", "go around"],
        "gap": ["jump", "bridge", "rope", "swing", "fly", "leap", "cross"],
        "puddle": ["jump", "step over", "walk around", "splash", "ignore"],
        "log": ["climb", "jump", "walk over", "chop", "push", "roll"],
        "vine": ["swing", "cut", "climb", "avoid", "push aside"],
        "mud": ["walk carefully", "jump over", "board", "boots", "avoid"],
        "stream": ["jump", "wade", "bridge", "stones", "boat"],
        "bush": ["cut", "push", "walk around", "burn", "go through"],
        "low branch": ["duck", "cut", "break", "jump over"],
        "small fire": ["water", "stomp", "sand", "smother", "extinguish"],
        "slope": ["climb", "slide", "walk", "rope", "steps"],
        "fog": ["wait", "light", "compass", "map", "listen"],
        "dust": ["cover mouth", "wave away", "wait", "mask"],
        "spiderweb": ["cut", "burn", "avoid", "brush aside", "stick"],
        "nettles": ["avoid", "cut", "gloves", "cloth"],
        "hole": ["jump", "fill", "bridge", "walk around", "climb out"],
        "pebbles": ["walk carefully", "sweep", "ignore", "kick"],
        "root": ["step over", "cut", "avoid", "jump"],
        "thorns": ["cut", "avoid", "gloves", "burn", "push"],
        "signpost": ["read", "ignore", "follow", "break"],

        // Medium (Difficulty 2 approx)
        "monster": ["run", "fight", "hide", "scare", "sword", "magic", "trap", "attack"],
        "wind": ["shield", "anchor", "hold", "duck", "lean", "shelter"],
        "ice": ["melt", "salt", "skates", "pickaxe", "grip", "torch", "spikes"],
        "darkness": ["light", "torch", "lantern", "eyes", "night vision", "glowstick"],
        "spikes": ["jump", "bridge", "board", "disable", "avoid", "platform"],
        "goblin": ["fight", "scare", "bribe", "trap", "run", "sword", "negotiate"],
        "slime": ["freeze", "burn", "salt", "dodge", "jump", "clean"],
        "bees": ["smoke", "run", "hide", "repel", "water", "net"],
        "trapdoor": ["avoid", "jam", "trigger", "jump", "bridge"],
        "quicksand": ["rope", "vine", "branch", "swim slowly", "lie flat", "reach"],
        "bats": ["light", "noise", "repel", "dodge", "smoke", "run"],
        "snake": ["avoid", "charm", "scare", "catch", "run", "stick"],
        "rolling boulder": ["dodge", "run", "jump", "hide", "stop", "divert"],
        "weak bridge": ["cross carefully", "reinforce", "jump", "rope", "find another way"],
        "locked door": ["key", "pick lock", "break", "magic", "find key", "bash"],
        "guard": ["sneak", "bribe", "distract", "fight", "sleep spell", "convince"],
        "archer": ["dodge", "shield", "run", "hide", "attack", "deflect"],
        "chasm": ["bridge", "jump", "swing", "fly", "rope", "climb down"],
        "rushing water": ["swim", "boat", "raft", "rope", "bridge", "log"],
        "statue": ["ignore", "inspect", "activate", "destroy", "move"],
        "mirror": ["ignore", "cover", "break", "inspect", "reflect"],
        "lever": ["pull", "push", "ignore", "inspect", "jam"],
        "button": ["push", "press", "ignore", "inspect", "cover"],
        "pressure plate": ["avoid", "jump", "weight", "jam", "trigger safely"],
        "ghost": ["ignore", "repel", "magic", "light", "talk", "run through"],

        // Hard (Difficulty 3 approx)
        "flood": ["boat", "swim", "climb", "raft", "fly", "high ground", "wait"],
        "lava": ["jump", "bridge", "fly", "cool", "platform", "shield"],
        "poison gas": ["mask", "hold breath", "run", "dispel", "antidote", "ventilate"],
        "golem": ["smash", "magic", "disable", "trick", "find core", "run"],
        "giant spider": ["fight", "burn", "repel", "trap", "sword", "run"],
        "orc": ["fight", "intimidate", "sneak", "trap", "sword", "axe"],
        "minotaur": ["fight", "trap", "confuse", "maze", "run", "weapon"],
        "falling ceiling": ["run", "dodge", "prop", "support", "shield"],
        "wall of fire": ["extinguish", "water", "magic", "shield", "go around", "fly over"],
        "magic barrier": ["dispel", "break", "key", "find switch", "bypass", "overload"],
        "illusion": ["disbelieve", "true sight", "touch", "logic", "magic", "ignore"],
        "curse": ["remove curse", "cleanse", "dispel", "protect", "reflect"],
        "riddle": ["solve", "answer", "think", "guess", "ignore", "bribe sphinx"],
        "cyclops": ["blind", "trick", "run", "hide", "fight", "weapon"],
        "troll": ["fire", "acid", "fight", "run", "trick", "regenerate? stop it"],
        "acid pool": ["jump", "bridge", "neutralize", "fly", "platform"],
        "blizzard": ["shelter", "fire", "warm clothes", "navigate", "wait"],
        "sandstorm": ["shelter", "cover", "goggles", "wait", "navigate"],
        "gorgon": ["mirror", "avoid gaze", "blindfold", "attack", "sneak"],
        "harpy": ["repel", "fight", "dodge", "net", "scare"],
        "elemental": ["counter element", "magic", "bind", "banish", "weapon"],
        "portal": ["enter", "inspect", "close", "stabilize", "ignore"],
        "time loop": ["break pattern", "find trigger", "wait", "escape", "magic"],
        "mimic": ["attack", "inspect", "test", "avoid", "magic detection"],
        "doppelganger": ["identify", "fight", "expose", "question", "test"],

        // Very Hard (Difficulty 4 approx)
        "dragon": ["fight", "hide", "run", "negotiate", "magic", "ballista", "sleep"],
        "kraken": ["boat", "repel", "attack eye", "escape", "magic", "depth charge"],
        "lich": ["destroy phylactery", "holy magic", "turn undead", "fight", "dispel"],
        "demon": ["banish", "holy water", "magic circle", "fight", "exorcise"],
        "beholder": ["mirror shield", "attack eye", "magic", "sneak", "distract"],
        "vampire": ["stake", "sunlight", "garlic", "holy symbol", "fire", "run"],
        "werewolf": ["silver", "fight", "run", "trap", "cure"],
        "force field": ["disable", "overload", "find generator", "bypass", "frequency"],
        "antimagic zone": ["wait", "physical attack", "bypass", "find source"],
        "earthquake": ["hold on", "find cover", "run", "reach open space"],
        "volcano eruption": ["run", "shelter", "fly", "shield", "dig"],
        "meteor shower": ["dodge", "shield", "shelter", "run", "deflect"],
        "black hole": ["escape", "reverse", "warp", "stabilize", "sacrifice"], // Getting imaginative!
        "god": ["pray", "appease", "defy", "trick", "run", "negotiate", "find weakness"],
        "unstable reality": ["stabilize", "anchor", "focus", "escape", "magic"],
        "paradox": ["resolve", "ignore", "escape", "unravel", "logic"],
        "nothingness": ["create", "fill", "escape", "find edge", "willpower"],
        "swarm": ["repel", "fire", "area attack", "escape", "barrier"],
        "sentient weapon": ["disarm", "master", "destroy", "appease", "negotiate"],
        "memory loss": ["remember", "notes", "clues", "trigger", "heal"],

        // Boss Level (Difficulty 5 approx) - Often require multi-step or specific items
        "world serpent": ["find weak spot", "godly weapon", "teamwork", "poison", "magic"],
        "mad god": ["logic", "reason", "find sanity", "imprison", "banish", "de-power"],
        "reality eater": ["anchor reality", "seal rift", "find origin", "starve", "sacrifice"],
        "final boss": ["ultimate weapon", "exploit weakness", "friendship power", "sacrifice", "final stand"],
        "existential dread": ["find meaning", "hope", "ignore", "accept", "distraction"], // Abstract!
        "writer's block": ["inspiration", "coffee", "walk", "procrastinate", "deadline"], // Meta!
        "infinite staircase": ["find exit", "fly", "break illusion", "turn back", "non-euclidean geometry"],
        "unstoppable force": ["immovable object", "redirect", "phase", "absorb", "misdirect"],
        "immovable object": ["unstoppable force", "phase", "go around", "destroy foundation", "teleport"],
        "perfect prison": ["find flaw", "teleport", "phase", "outside help", "wait"],
        "singularity": ["escape", "stabilize", "use energy", "reverse", "contain"],
        "apocalypse": ["prevent", "escape", "survive", "reverse", "mitigate"],
        "fourth wall": ["break", "talk to player", "exploit code", "reload save"], // Very meta!
        "glitch": ["debug", "exploit", "reset", "patch", "ignore"],
        "player": ["quit", "alt+f4", "uninstall", "win", "lose"], // Ultimate meta!

    };
    // Get a list of possible obstacles from the simulation object keys
    const obstacleList = Object.keys(simulatedObstacles);

    /**
     * Fetches (or simulates fetching) a new obstacle word.
     * Updates the obstacle display element.
     */
    async function getNewObstacle() {
        // --- Simulation ---
        // ** Selects randomly from the expanded list **
        if (obstacleList.length === 0) {
             console.error("Obstacle list is empty!");
             obstacleWordEl.textContent = "Error!";
             // Handle this case - maybe show game over or a fixed error message
             feedbackEl.textContent = "Error: No obstacles loaded!";
             feedbackEl.className = 'feedback-message incorrect visible'; // Make visible
             submitButton.disabled = true;
             responseInput.disabled = true;
             return;
        }
        const randomIndex = Math.floor(Math.random() * obstacleList.length);
        currentObstacle = obstacleList[randomIndex];
        obstacleWordEl.textContent = currentObstacle; // Display the fetched obstacle
        feedbackEl.className = 'feedback-message'; // Clear feedback class
        feedbackEl.classList.remove('visible'); // Hide feedback
        // ** End of simulation **
    }

    /**
     * Validates (or simulates validating) the player's response against the current obstacle.
     * @param {string} obstacle - The current obstacle word.
     * @param {string} response - The player's typed response.
     * @returns {Promise<object>} - A promise resolving to an object like { valid: boolean }.
     */
    async function validateResponse(obstacle, response) {
        // --- Simulation ---
        // ** Uses the expanded simulation object **
        const lowerCaseResponse = response.toLowerCase().trim(); // Normalize input
        // Get valid answers for the obstacle, or an empty array if obstacle not found
        const validAnswers = simulatedObstacles[obstacle] || [];
        const isValid = validAnswers.includes(lowerCaseResponse); // Check if the response is valid

        // Simulate network delay slightly
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

        return { valid: isValid }; // Return the validation result
        // ** End of simulation **
    }

    // --- Animation & Game Logic Functions ---

    /**
     * Updates the score, lives, and timer display in the UI.
     * Also updates the character's vertical position based on currentStep.
     */
    function updateUI() {
        scoreSpan.textContent = score;
        // Use filled/empty hearts based on lives
        livesSpan.textContent = '❤'.repeat(lives) + '🖤'.repeat(Math.max(0, initialLives - lives));
        timerSpan.textContent = timerValue;

        // Update character's base vertical position using CSS custom property '--current-y'
        // translateY is negative because positive Y moves downwards in CSS transforms
        const currentY = -currentStep * stepHeight;
        character.style.setProperty('--current-y', ${currentY}px);
    }

    /**
     * Starts the countdown timer for the current obstacle.
     */
    function startTimer() {
        clearInterval(timerInterval); // Clear any previous timer interval
        timerValue = initialTime; // Reset timer value (no difficulty scaling in this version)
        updateUI(); // Display the starting time immediately

        timerInterval = setInterval(() => {
            timerValue--; // Decrement time
            updateUI(); // Update timer display
            if (timerValue <= 0) { // Check if time ran out
                clearInterval(timerInterval); // Stop the timer
                timerInterval = null; // Clear interval ID
                if (!isAnimating) { // Prevent timeout during other animations
                    handleTimeout(); // Handle the timeout event
                }
            }
        }, 1000); // Timer ticks every 1 second (1000 ms)
    }

     /**
      * Clears feedback message and makes it invisible.
      */
     function clearFeedback() {
        feedbackEl.textContent = '';
        feedbackEl.className = 'feedback-message'; // Reset class
        feedbackEl.classList.remove('visible'); // Ensure it's hidden
     }

     /**
      * Shows feedback message temporarily.
      * @param {string} message - The text to display.
      * @param {boolean} isCorrect - If the feedback is for a correct answer.
      */
     function showTemporaryFeedback(message, isCorrect) {
        clearFeedback(); // Clear previous feedback first
        feedbackEl.textContent = message;
        feedbackEl.className = feedback-message ${isCorrect ? 'correct' : 'incorrect'};
        // Make it visible
        requestAnimationFrame(() => { // Ensure DOM update before adding class
             feedbackEl.classList.add('visible');
        });
     }

    /**
     * Handles the logic and animation for a correct player response.
     */
    function handleCorrectAnswer() {
        if (isAnimating) return; // Prevent action if already animating
        isAnimating = true; // Set animation flag
        submitButton.disabled = true; // Disable submit button during animation

        score += 10; // Increase score
        currentStep++; // Increment the step count (character climbs)

        const targetY = -currentStep * stepHeight;
        character.style.setProperty('--target-y', ${targetY}px); // For animation

        character.classList.add('is-jumping');
        character.classList.add('correct-feedback');
        showTemporaryFeedback("Correct!", true);


        setTimeout(() => {
            character.classList.remove('is-jumping');
            character.classList.remove('correct-feedback');
            // updateUI() will set the final --current-y position
            updateUI(); // Update score display & character final position
            getNewObstacle(); // Fetch the next obstacle
            resetInputAndTimer(); // Clear input and restart timer
            isAnimating = false; // Reset animation flag
            submitButton.disabled = false; // Re-enable submit button
        }, animationDuration);
    }

    /**
     * Handles the logic and animation for an incorrect player response.
     */
    function handleIncorrectAnswer() {
        if (isAnimating) return;
        isAnimating = true;
        submitButton.disabled = true;

        lives--; // Decrement lives

        character.classList.add('is-falling');
        character.classList.add('incorrect-feedback');
        showTemporaryFeedback("Incorrect!", false);


        setTimeout(() => {
            character.classList.remove('is-falling');
            character.classList.remove('incorrect-feedback');

            // Reset character position visually to the bottom after falling
            currentStep = 0; // Reset step count
            // updateUI() will set the final --current-y position
            updateUI(); // Update lives display & reset character final position

            // Force reflow might not be strictly necessary here but can sometimes help
            // void character.offsetWidth;

            if (lives <= 0) { // Check if game is over
                gameOver();
            } else {
                // If game continues, get next obstacle and reset timer
                getNewObstacle();
                resetInputAndTimer();
                isAnimating = false; // Reset animation flag
                submitButton.disabled = false; // Re-enable button
            }
            // Note: Button remains disabled if game is over until reset
        }, animationDuration);
    }

    /**
     * Handles the event when the timer runs out.
     */
    function handleTimeout() {
        showTemporaryFeedback("Time's up!", false); // Use the temporary feedback function
        handleIncorrectAnswer(); // Timeout counts as an incorrect answer
    }

    /**
     * Handles the game over state.
     */
    function gameOver() {
        clearInterval(timerInterval); // Stop the timer
        timerInterval = null;
        finalScoreSpan.textContent = score; // Display final score in overlay
        gameOverOverlay.classList.remove('hidden'); // Show the game over screen
        isAnimating = false; // Ensure animation lock is released
        submitButton.disabled = true; // Keep submit button disabled
        responseInput.disabled = true; // Disable input field
        clearFeedback(); // Clear feedback message
    }

    /**
     * Resets the game state to initial values for a new game.
     */
    function resetGame() {
        score = 0; lives = initialLives; currentStep = 0; isAnimating = false;
        clearFeedback(); // Clear feedback message

        gameOverOverlay.classList.add('hidden'); // Hide the game over overlay
        responseInput.disabled = false; submitButton.disabled = false;
        responseInput.focus();

        updateUI(); // Reset score/lives display and character position
        getNewObstacle(); // Fetch the first obstacle
        startTimer(); // Start the timer
    }

    /**
     * Clears the response input field and restarts the timer.
     */
    function resetInputAndTimer() {
        responseInput.value = ''; // Clear the input field
        responseInput.focus(); // Set focus back to input
        startTimer(); // Restart timer for the new obstacle
        clearFeedback(); // Clear feedback from previous round
    }


    // --- Event Listeners ---

    responseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isAnimating || lives <= 0) return; // Ignore if animating or game over

        const responseText = responseInput.value;
        if (!responseText.trim()) return; // Ignore empty submissions

        clearInterval(timerInterval); // Stop timer
        timerInterval = null;
        submitButton.disabled = true; // Disable button immediately

        const result = await validateResponse(currentObstacle, responseText);

        if (result.valid) {
            handleCorrectAnswer();
        } else {
            handleIncorrectAnswer();
        }
    });

    retryButton.addEventListener('click', resetGame);

    // --- Initial Game Setup ---
    resetGame(); // Initialize and start the game when the page loads

}); // End of DOMContentLoaded listener
