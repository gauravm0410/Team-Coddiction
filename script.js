document.addEventListener("DOMContentLoaded", function () {
  const startButton = document.getElementById('start-btn');
  const retryButton = document.getElementById('retry-btn');
  const submitButton = document.getElementById('submit-response');
  const responseInput = document.getElementById('response-input');
  const timeLeftDisplay = document.getElementById('time-left');
  const livesDisplay = document.getElementById('lives-count');
  const feedback = document.getElementById('feedback');

  let timeLeft, lives, score, countdown, isGameActive;
  let obstacleText = "";

  function startGame() {
    document.getElementById('main-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    isGameActive = true;
    timeLeft = 10;
    lives = 3;
    score = 0;
    feedback.textContent = '';
    livesDisplay.textContent = lives;
    responseInput.value = '';
    retryButton.style.display = 'none';

    fetchObstacle();
    startCountdown();
  }

  function startCountdown() {
    clearInterval(countdown); // Prevent multiple intervals
    countdown = setInterval(() => {
      timeLeft--;
      timeLeftDisplay.textContent = timeLeft;

      if (timeLeft <= 0) {
        clearInterval(countdown);
        handleGameOver();
      }
    }, 1000);
  }

  function fetchObstacle() {
    fetch("http://localhost:8000/generate-obstacle")
      .then(response => response.json())
      .then(data => {
        if (data.obstacle) {
          obstacleText = data.obstacle;
          document.getElementById('obstacle-text').textContent = obstacleText.toUpperCase();
        } else {
          throw new Error("Invalid obstacle data");
        }
      })
      .catch(error => {
        console.error("Error fetching obstacle:", error);
        document.getElementById('obstacle-text').textContent = "Error fetching obstacle!";
      });
  }

  function handleSubmitResponse() {
    if (!isGameActive) return;
    const userResponse = responseInput.value.trim();
    if (!userResponse) return;

    fetch("http://localhost:8000/validate-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ obstacle: obstacleText, answer: userResponse })
    })
    .then(response => response.json())
    .then(data => {
      feedback.classList.remove('correct', 'incorrect');
      if (data.valid) {
        feedback.textContent = "Correct! You continue climbing.";
        feedback.classList.add('correct');
        score += 10;
        fetchObstacle(); // Fetch new obstacle only if correct
      } else {
        lives--;
        livesDisplay.textContent = lives;
        feedback.textContent = "Wrong response! You lost a life.";
        feedback.classList.add('incorrect');

        if (lives <= 0) {
          handleGameOver();
          return;
        }
      }
    })
    .catch(error => {
      console.error("Error validating response:", error);
      feedback.textContent = "Error checking response!";
      feedback.classList.add('incorrect');
    });

    responseInput.value = '';
    clearInterval(countdown);
    timeLeft = 10;
    startCountdown();
  }

  function handleGameOver() {
    feedback.textContent = 'Game Over! Score: ${score}';
    isGameActive = false;
    retryButton.style.display = 'block';
    clearInterval(countdown); // Stop countdown when game over
  }

  startButton.addEventListener('click', startGame);
  retryButton.addEventListener('click', startGame);
  submitButton.addEventListener('click', handleSubmitResponse);
});
