/* ==========================================================================
   APTITUDE ARENA 2D - GAME APPLICATION ENGINE
   Delegates Question Generation, Custom QB & Explanations to AptitudeAiEngine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. GAME STATE MANAGEMENT
  // ==========================================
  const gameState = {
    user: {
      username: "Scholar",
      avatar: "🎓",
      avatarName: "Logic Scholar"
    },

    difficulty: "easy", // 'easy', 'medium', 'hard'
    selectedTopics: ["time", "profit", "percentage", "ratio", "interest", "partnership", "logic"],
    matchQuestionCount: 5,

    lives: 5,
    maxLives: 5,
    score: 0,
    xp: 0,
    currentQuestionIndex: 0,
    streak: 0,
    maxStreak: 0,
    timerSeconds: 0,
    initialTimeLimit: 120,
    timerInterval: null,
    isAnswered: false,
    sfxEnabled: true,
    audioCtx: null,
    heroHp: 100,
    monsterHp: 100,
    activeQuestions: [],
    roomCode: "ARENA-8924",
    pendingParsedQb: []
  };

  // ==========================================
  // 2. DOM ELEMENTS
  // ==========================================
  const el = {
    // HUD
    hudUsername: document.getElementById('hudUsername'),
    hudAvatarIcon: document.getElementById('hudAvatarIcon'),
    hudUserRank: document.getElementById('hudUserRank'),
    userProfileBtn: document.getElementById('userProfileBtn'),
    hudStage: document.getElementById('hudStage'),
    hudLives: document.getElementById('hudLives'),
    hudScore: document.getElementById('hudScore'),
    hudStreak: document.getElementById('hudStreak'),
    setupGameBtn: document.getElementById('setupGameBtn'),
    qbBtn: document.getElementById('qbBtn'),
    aiConfigBtn: document.getElementById('aiConfigBtn'),
    friendsBtn: document.getElementById('friendsBtn'),
    sfxToggleBtn: document.getElementById('sfxToggleBtn'),
    sfxIcon: document.getElementById('sfxIcon'),

    // Canvas & Arena
    canvas: document.getElementById('gameCanvas'),
    ctx: document.getElementById('gameCanvas').getContext('2d'),
    arenaEffectOverlay: document.getElementById('arenaEffectOverlay'),
    heroHpBar: document.getElementById('heroHpBar'),
    monsterHpBar: document.getElementById('monsterHpBar'),
    monsterName: document.getElementById('monsterName'),
    heroEntityName: document.getElementById('heroEntityName'),
    topicTag: document.getElementById('topicTag'),
    qbActiveTag: document.getElementById('qbActiveTag'),

    // Challenge & Timer
    difficultyBadge: document.getElementById('difficultyBadge'),
    timeAllowedBadge: document.getElementById('timeAllowedBadge'),
    timerClock: document.getElementById('timerClock'),
    timerBarFill: document.getElementById('timerBarFill'),
    qCurrentNum: document.getElementById('qCurrentNum'),
    qTotalNum: document.getElementById('qTotalNum'),
    questionText: document.getElementById('questionText'),
    optionsGrid: document.getElementById('optionsGrid'),
    optionBtns: document.querySelectorAll('.option-btn'),

    // Feedback Banner
    feedbackBanner: document.getElementById('feedbackBanner'),
    feedbackIcon: document.getElementById('feedbackIcon'),
    feedbackTitle: document.getElementById('feedbackTitle'),
    xpGainedBadge: document.getElementById('xpGainedBadge'),
    explanationText: document.getElementById('explanationText'),
    nextBtn: document.getElementById('nextBtn'),

    // Modals
    loginModal: document.getElementById('loginModal'),
    usernameInput: document.getElementById('usernameInput'),
    avatarCards: document.querySelectorAll('.avatar-card'),
    confirmLoginBtn: document.getElementById('confirmLoginBtn'),

    setupModal: document.getElementById('setupModal'),
    setupGameBtn: document.getElementById('setupGameBtn'),
    diffPills: document.querySelectorAll('.diff-pill'),
    topicCheckboxes: document.querySelectorAll('.topics-grid input[type="checkbox"]'),
    selectAllTopicsBtn: document.getElementById('selectAllTopicsBtn'),
    questionsCountSelect: document.getElementById('questionsCountSelect'),
    cancelSetupBtn: document.getElementById('cancelSetupBtn'),
    startAiMatchBtn: document.getElementById('startAiMatchBtn'),
    qbActiveNotice: document.getElementById('qbActiveNotice'),
    qbActiveNoticeText: document.getElementById('qbActiveNoticeText'),
    useProceduralAiBtn: document.getElementById('useProceduralAiBtn'),

    qbUploadModal: document.getElementById('qbUploadModal'),
    qbFileInput: document.getElementById('qbFileInput'),
    qbPasteTextarea: document.getElementById('qbPasteTextarea'),
    parseQbPreviewBtn: document.getElementById('parseQbPreviewBtn'),
    qbPreviewSection: document.getElementById('qbPreviewSection'),
    qbPreviewList: document.getElementById('qbPreviewList'),
    qbAiSolveCheckbox: document.getElementById('qbAiSolveCheckbox'),
    qbStatusMessage: document.getElementById('qbStatusMessage'),
    clearQbBtn: document.getElementById('clearQbBtn'),
    closeQbModalBtn: document.getElementById('closeQbModalBtn'),
    importQbBtn: document.getElementById('importQbBtn'),

    aiConfigModal: document.getElementById('aiConfigModal'),
    useLlmApiCheckbox: document.getElementById('useLlmApiCheckbox'),
    llmProviderSelect: document.getElementById('llmProviderSelect'),
    llmApiKeyInput: document.getElementById('llmApiKeyInput'),
    clearAiConfigBtn: document.getElementById('clearAiConfigBtn'),
    testAiConfigBtn: document.getElementById('testAiConfigBtn'),
    aiApiStatusMessage: document.getElementById('aiApiStatusMessage'),
    closeAiConfigBtn: document.getElementById('closeAiConfigBtn'),
    saveAiConfigBtn: document.getElementById('saveAiConfigBtn'),

    friendsModal: document.getElementById('friendsModal'),
    friendsBtn: document.getElementById('friendsBtn'),
    roomCodeDisplay: document.getElementById('roomCodeDisplay'),
    qrCanvas: document.getElementById('qrCanvas'),
    shareUrlInput: document.getElementById('shareUrlInput'),
    copyShareUrlBtn: document.getElementById('copyShareUrlBtn'),
    copyFeedback: document.getElementById('copyFeedback'),
    closeFriendsModalBtn: document.getElementById('closeFriendsModalBtn'),
    roomOpponentStatus: document.getElementById('roomOpponentStatus'),

    gameOverOverlay: document.getElementById('gameOverOverlay'),
    restartGameBtn: document.getElementById('restartGameBtn'),
    goFinalScore: document.getElementById('goFinalScore'),
    goStagesCleared: document.getElementById('goStagesCleared'),
    goMaxStreak: document.getElementById('goMaxStreak'),

    victoryOverlay: document.getElementById('victoryOverlay'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    vicFinalScore: document.getElementById('vicFinalScore'),
    vicAccuracy: document.getElementById('vicAccuracy'),
    vicLives: document.getElementById('vicLives'),
    vicRankBadge: document.getElementById('vicRankBadge')
  };

  // ==========================================
  // 3. PURE JS CANVAS QR CODE RENDERER
  // ==========================================
  function generateQrCodeCanvas(canvasEl, text) {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    const width = canvasEl.width;
    const height = canvasEl.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const gridSize = 21;
    const cellSize = Math.floor(width / gridSize);
    const margin = Math.floor((width - gridSize * cellSize) / 2);

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    ctx.fillStyle = '#0f172a';

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const isFinderTL = row < 7 && col < 7;
        const isFinderTR = row < 7 && col >= gridSize - 7;
        const isFinderBL = row >= gridSize - 7 && col < 7;

        if (isFinderTL || isFinderTR || isFinderBL) {
          const rLocal = isFinderBL ? row - (gridSize - 7) : row;
          const cLocal = isFinderTR ? col - (gridSize - 7) : col;

          if (rLocal === 0 || rLocal === 6 || cLocal === 0 || cLocal === 6 || (rLocal >= 2 && rLocal <= 4 && cLocal >= 2 && cLocal <= 4)) {
            ctx.fillRect(margin + col * cellSize, margin + row * cellSize, cellSize, cellSize);
          }
        } else {
          const bitVal = Math.abs((hash * (row * 31 + col + 1)) % 100);
          if (bitVal < 45) {
            ctx.fillRect(margin + col * cellSize, margin + row * cellSize, cellSize, cellSize);
          }
        }
      }
    }
  }

  // ==========================================
  // 4. AUDIO (REMOVED)
  // ==========================================
  function initAudio() {}
  function playTone() {}
  function playClickSound() {}
  function playCorrectSound() {}
  function playWrongSound() {}
  function playTickSound() {}
  function playGameOverSound() {}
  function playVictorySound() {}

  // ==========================================
  // 5. 2D CANVAS BATTLE RENDERER
  // ==========================================
  let animationFrameId = null;
  let animTime = 0;
  const particles = [];

  function addParticle(x, y, text, color) {
    particles.push({ x, y, text, color, opacity: 1.0, vy: -1.5 });
  }

  function updateAndDrawParticles(ctx) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.y += p.vy;
      p.opacity -= 0.018;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.font = '700 16px "Rajdhani", sans-serif';
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
      if (p.opacity <= 0) particles.splice(i, 1);
    }
  }

  const heroState = { x: 120, y: 230, action: 'idle', actionTimer: 0 };
  const monsterState = { x: 500, y: 220, action: 'idle', actionTimer: 0, flashRed: false };

  function renderCanvas() {
    if (!el.canvas || !el.ctx) return;
    animTime += 0.04;
    const { width, height } = el.canvas;
    el.ctx.clearRect(0, 0, width, height);

    drawBackground(el.ctx, width, height);

    if (heroState.actionTimer > 0) {
      heroState.actionTimer--;
      if (heroState.actionTimer <= 0) heroState.action = 'idle';
    }
    if (monsterState.actionTimer > 0) {
      monsterState.actionTimer--;
      if (monsterState.actionTimer <= 0) {
        monsterState.action = 'idle';
        monsterState.flashRed = false;
      }
    }

    drawHero(el.ctx, heroState.x, heroState.y, animTime, heroState.action);
    drawMonster(el.ctx, monsterState.x, monsterState.y, animTime, monsterState.action, monsterState.flashRed, gameState.currentQuestionIndex);

    if (heroState.action === 'attack') {
      const progress = 1 - (heroState.actionTimer / 25);
      const projX = heroState.x + 40 + progress * 300;
      const projY = heroState.y - 30;
      el.ctx.save();
      el.ctx.beginPath();
      el.ctx.arc(projX, projY, 14, 0, Math.PI * 2);
      el.ctx.fillStyle = '#00f0ff';
      el.ctx.shadowColor = '#00ff9d';
      el.ctx.shadowBlur = 15;
      el.ctx.fill();
      el.ctx.restore();
    }

    if (monsterState.action === 'attack') {
      const progress = 1 - (monsterState.actionTimer / 25);
      const projX = monsterState.x - 40 - progress * 300;
      const projY = monsterState.y - 30;
      el.ctx.save();
      el.ctx.beginPath();
      el.ctx.arc(projX, projY, 16, 0, Math.PI * 2);
      el.ctx.fillStyle = '#ff2a5f';
      el.ctx.shadowColor = '#ff0044';
      el.ctx.shadowBlur = 18;
      el.ctx.fill();
      el.ctx.restore();
    }

    updateAndDrawParticles(el.ctx);
    animationFrameId = requestAnimationFrame(renderCanvas);
  }

  function drawBackground(ctx, w, h) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#070913');
    bgGrad.addColorStop(0.65, '#111728');
    bgGrad.addColorStop(1, '#1b233a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 30; i++) {
      ctx.fillRect((i * 47) % w, (i * 29) % (h * 0.5), 2, 2);
    }

    const horizon = h * 0.68;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(w, horizon);
    ctx.stroke();

    for (let i = 0; i <= 14; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2, horizon - 20);
      ctx.lineTo((w / 14) * i, h);
      ctx.stroke();
    }

    for (let i = 0; i < 6; i++) {
      const hy = horizon + (((animTime * 20) + (i * 20)) % (h - horizon));
      ctx.beginPath();
      ctx.moveTo(0, hy);
      ctx.lineTo(w, hy);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.ellipse(120, 260, 65, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(500, 260, 75, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 42, 95, 0.12)';
    ctx.strokeStyle = 'rgba(255, 42, 95, 0.4)';
    ctx.fill();
    ctx.stroke();
  }

  function drawHero(ctx, x, y, time, action) {
    ctx.save();
    let currentX = action === 'hurt' ? x + (Math.random() - 0.5) * 12 : (action === 'attack' ? x + 30 : x);
    let currentY = y + Math.sin(time * 3) * 4;

    ctx.beginPath();
    ctx.ellipse(currentX, y + 25, 25, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(currentX - 12, currentY - 20);
    ctx.lineTo(currentX - 26 + Math.sin(time * 4) * 5, currentY + 15);
    ctx.lineTo(currentX - 4, currentY + 10);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(currentX - 14, currentY - 30, 28, 35);
    ctx.fillStyle = '#00ff9d';
    ctx.fillRect(currentX - 8, currentY - 24, 16, 14);

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(currentX, currentY - 42, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = action === 'hurt' ? '#ff2a5f' : '#00f0ff';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.fillRect(currentX - 6, currentY - 46, 14, 6);

    ctx.save();
    ctx.translate(currentX + 14, currentY - 20);
    ctx.rotate(action === 'attack' ? -Math.PI / 4 : Math.sin(time * 2) * 0.1);
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = '#00ff9d';
    ctx.shadowBlur = 12;
    ctx.fillRect(0, -35, 6, 40);
    ctx.fillStyle = '#ffd000';
    ctx.fillRect(-6, 0, 18, 5);
    ctx.restore();
    ctx.restore();
  }

  function drawMonster(ctx, x, y, time, action, flashRed, qIndex) {
    ctx.save();
    let currentX = action === 'hurt' ? x + (Math.random() - 0.5) * 14 : (action === 'attack' ? x - 35 : x);
    let currentY = y + Math.sin(time * 2.5 + 1) * 6;

    ctx.beginPath();
    ctx.ellipse(currentX, y + 25, 35, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    const mainColor = flashRed ? '#ff2a5f' : (qIndex >= 4 ? '#ff2a5f' : (qIndex >= 2 ? '#9d4edd' : '#ffd000'));
    const glowColor = flashRed ? '#ff0044' : (qIndex >= 4 ? '#ff7b00' : (qIndex >= 2 ? '#c77dff' : '#00f0ff'));

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(currentX - 35, currentY + 15);
    ctx.lineTo(currentX - 45, currentY - 35);
    ctx.lineTo(currentX, currentY - 65);
    ctx.lineTo(currentX + 45, currentY - 35);
    ctx.lineTo(currentX + 35, currentY + 15);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(currentX, currentY - 25, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = glowColor;
    ctx.font = '700 20px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const symbols = ['∑', 'π', '∫', 'Δ', 'Ω', '∞'];
    ctx.fillText(symbols[qIndex % symbols.length], currentX, currentY - 24);

    for (let i = 0; i < 2; i++) {
      const orbAngle = time * 3 + (i * Math.PI);
      const ox = currentX + Math.cos(orbAngle) * 55;
      const oy = currentY - 25 + Math.sin(orbAngle) * 20;
      ctx.beginPath();
      ctx.arc(ox, oy, 9, 0, Math.PI * 2);
      ctx.fillStyle = glowColor;
      ctx.fill();
    }
    ctx.restore();
  }

  // ==========================================
  // 6. GAME PLAY ENGINE DELEGATED TO window.AptitudeAiEngine
  // ==========================================
  async function startGame(forceAi = false) {
    initAudio();
    gameState.lives = 5;
    gameState.score = 0;
    gameState.xp = 0;
    gameState.currentQuestionIndex = 0;
    gameState.correctAnswers = 0;
    gameState.wrongAnswers = 0;
    gameState.streak = 0;
    gameState.maxStreak = 0;
    gameState.heroHp = 100;
    gameState.monsterHp = 100;

    // Show Custom QB Badge if custom QB is loaded and not forced AI
    if (!forceAi && window.AptitudeAiEngine && window.AptitudeAiEngine.hasCustomQb()) {
      if (el.qbActiveTag) {
        el.qbActiveTag.textContent = `📁 CUSTOM QB (${window.AptitudeAiEngine.customQb.length} Qs)`;
        el.qbActiveTag.classList.remove('hidden');
      }
    } else {
      if (el.qbActiveTag) el.qbActiveTag.classList.add('hidden');
    }

    // Generate AI Match Set via window.AptitudeAiEngine module
    if (window.AptitudeAiEngine) {
      gameState.activeQuestions = await window.AptitudeAiEngine.generateMatchSet(
        gameState.selectedTopics,
        gameState.difficulty,
        gameState.matchQuestionCount,
        forceAi,
        gameState.roomCode
      );
    }

    if (el.loginModal) el.loginModal.classList.add('hidden');
    if (el.setupModal) el.setupModal.classList.add('hidden');
    if (el.qbUploadModal) el.qbUploadModal.classList.add('hidden');
    if (el.aiConfigModal) el.aiConfigModal.classList.add('hidden');
    if (el.friendsModal) el.friendsModal.classList.add('hidden');
    if (el.gameOverOverlay) el.gameOverOverlay.classList.add('hidden');
    if (el.victoryOverlay) el.victoryOverlay.classList.add('hidden');

    updateProfileHud();
    updateHud();
    loadQuestion(gameState.currentQuestionIndex);

    if (!animationFrameId) {
      renderCanvas();
    }
  }

  function loadQuestion(index) {
    if (!gameState.activeQuestions || index >= gameState.activeQuestions.length) {
      triggerVictory();
      return;
    }

    const q = gameState.activeQuestions[index];
    gameState.isAnswered = false;

    if (el.monsterName) el.monsterName.textContent = q.topic ? `${q.topic.toUpperCase()} SECTION` : 'QUANTITATIVE REASONING';
    if (el.topicTag) el.topicTag.textContent = `🎯 ${q.topic.toUpperCase()}`;

    const totalQuestions = gameState.activeQuestions.length;
    const progressPercent = Math.round((index / totalQuestions) * 100);
    const accuracyPercent = gameState.totalAnswered > 0 ? Math.round((gameState.correctAnswers / gameState.totalAnswered) * 100) : 100;

    if (el.heroHpBar) el.heroHpBar.style.width = `${progressPercent}%`;
    if (el.monsterHpBar) el.monsterHpBar.style.width = `${accuracyPercent}%`;

    if (el.qCurrentNum) el.qCurrentNum.textContent = index + 1;
    if (el.qTotalNum) el.qTotalNum.textContent = gameState.activeQuestions.length;
    if (el.questionText) el.questionText.textContent = q.question;
    if (el.hudStage) el.hudStage.textContent = `${index + 1} / ${gameState.activeQuestions.length}`;

    if (el.difficultyBadge) {
      el.difficultyBadge.textContent = q.difficulty.toUpperCase();
      el.difficultyBadge.className = `difficulty-badge ${q.difficulty}`;
    }
    if (el.timeAllowedBadge) el.timeAllowedBadge.textContent = `⏱️ ${q.timeLimit}s Limit`;

    const prefixes = ['A', 'B', 'C', 'D'];
    if (el.optionBtns) {
      el.optionBtns.forEach((btn, idx) => {
        btn.className = 'option-btn';
        btn.disabled = false;
        const pref = btn.querySelector('.opt-prefix');
        const txt = btn.querySelector('.opt-text');
        if (pref) pref.textContent = prefixes[idx];
        if (txt) txt.textContent = q.options[idx];
      });
    }

    if (el.feedbackBanner) el.feedbackBanner.classList.add('hidden');
    if (el.nextBtn) el.nextBtn.style.display = 'block';
    updateQuestionPalette();
    startTimer(q.timeLimit);
  }

  function updateQuestionPalette() {
    const paletteGrid = document.getElementById('questionPaletteGrid');
    if (!paletteGrid || !gameState.activeQuestions) return;

    paletteGrid.innerHTML = '';
    gameState.activeQuestions.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.textContent = `Q${idx + 1}`;

      if (idx === gameState.currentQuestionIndex) {
        btn.className = 'palette-pill active';
      } else if (idx < gameState.currentQuestionIndex) {
        btn.className = 'palette-pill completed';
      } else {
        btn.className = 'palette-pill';
      }

      btn.addEventListener('click', () => {
        if (!gameState.isAnswered) {
          gameState.currentQuestionIndex = idx;
          loadQuestion(idx);
        }
      });

      paletteGrid.appendChild(btn);
    });
  }

  function startTimer(seconds) {
    clearInterval(gameState.timerInterval);
    gameState.timerSeconds = seconds;
    gameState.initialTimeLimit = seconds;

    updateTimerDisplay();

    gameState.timerInterval = setInterval(() => {
      gameState.timerSeconds--;
      updateTimerDisplay();

      if (gameState.timerSeconds <= 10 && gameState.timerSeconds > 0) {
        playTickSound();
      }

      if (gameState.timerSeconds <= 0) {
        clearInterval(gameState.timerInterval);
        handleTimeout();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(gameState.timerSeconds / 60);
    const secs = gameState.timerSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    if (el.timerClock) el.timerClock.textContent = formatted;

    const percentage = (gameState.timerSeconds / gameState.initialTimeLimit) * 100;
    if (el.timerBarFill) {
      el.timerBarFill.style.width = `${Math.max(0, percentage)}%`;

      if (percentage <= 25) {
        el.timerBarFill.className = 'timer-bar-fill danger-warning';
        if (el.timerClock) el.timerClock.classList.add('warning');
      } else if (percentage <= 50) {
        el.timerBarFill.className = 'timer-bar-fill medium-warning';
        if (el.timerClock) el.timerClock.classList.remove('warning');
      } else {
        el.timerBarFill.className = 'timer-bar-fill';
        if (el.timerClock) el.timerClock.classList.remove('warning');
      }
    }
  }

  function handleOptionSelect(selectedIndex) {
    if (gameState.isAnswered) return;
    gameState.isAnswered = true;
    clearInterval(gameState.timerInterval);

    playClickSound();

    const q = gameState.activeQuestions[gameState.currentQuestionIndex];
    const isCorrect = selectedIndex === q.correctIndex;

    if (el.optionBtns) {
      el.optionBtns.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === q.correctIndex) btn.classList.add('correct');
        else if (idx === selectedIndex && !isCorrect) btn.classList.add('wrong');
      });
    }

    if (isCorrect) handleCorrectAnswer(q);
    else handleWrongAnswer(q, selectedIndex, false);
  }

  function handleTimeout() {
    if (gameState.isAnswered) return;
    gameState.isAnswered = true;

    const q = gameState.activeQuestions[gameState.currentQuestionIndex];
    if (el.optionBtns) {
      el.optionBtns.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === q.correctIndex) btn.classList.add('correct');
      });
    }

    handleWrongAnswer(q, -1, true);
  }

  function handleCorrectAnswer(q) {
    playCorrectSound();
    gameState.streak++;
    gameState.correctAnswers = (gameState.correctAnswers || 0) + 1;
    if (gameState.streak > gameState.maxStreak) gameState.maxStreak = gameState.streak;

    const streakMultiplier = 1 + (gameState.streak - 1) * 0.2;
    const baseScore = q.difficulty === 'hard' ? 300 : (q.difficulty === 'medium' ? 200 : 100);
    const timeBonus = Math.floor(gameState.timerSeconds * 2);
    const totalGained = Math.floor((baseScore + timeBonus) * streakMultiplier);

    gameState.score += totalGained;
    gameState.xp += totalGained;
    updateHud();

    const totalQuestions = gameState.activeQuestions.length;
    const progressPercent = Math.round(((gameState.currentQuestionIndex + 1) / totalQuestions) * 100);

    if (el.heroHpBar) el.heroHpBar.style.width = `${progressPercent}%`;

    setTimeout(() => {
      triggerArenaFlash('green');
    }, 150);

    if (el.feedbackBanner) {
      el.feedbackBanner.className = 'feedback-banner is-correct';
      if (el.feedbackIcon) el.feedbackIcon.textContent = '✓';
      if (el.feedbackTitle) el.feedbackTitle.textContent = 'CORRECT ANSWER!';
      if (el.xpGainedBadge) el.xpGainedBadge.textContent = `+${totalGained} XP`;
      if (el.explanationText) el.explanationText.textContent = `✅ PERFECT DERIVATION:\n${q.explanation}`;
      el.feedbackBanner.classList.remove('hidden');
    }
  }

  function handleWrongAnswer(q, selectedIndex, isTimeout) {
    playWrongSound();
    gameState.streak = 0;
    gameState.wrongAnswers = (gameState.wrongAnswers || 0) + 1;
    updateHud();

    const totalQuestions = gameState.activeQuestions.length;
    const progressPercent = Math.round(((gameState.currentQuestionIndex + 1) / totalQuestions) * 100);

    if (el.heroHpBar) el.heroHpBar.style.width = `${progressPercent}%`;

    setTimeout(() => {
      triggerArenaFlash('red');
      triggerScreenShake();
    }, 150);

    if (el.feedbackBanner) {
      el.feedbackBanner.className = 'feedback-banner is-wrong';
      if (el.feedbackIcon) el.feedbackIcon.textContent = '✗';
      if (el.feedbackTitle) {
        el.feedbackTitle.textContent = isTimeout ? 'TIME EXPIRED!' : 'WRONG ANSWER!';
      }
      if (el.xpGainedBadge) el.xpGainedBadge.textContent = '+0 XP';

      // Delegate Wrong Answer Mistake Breakdown to window.AptitudeAiEngine
      const explanationText = (selectedIndex >= 0 && window.AptitudeAiEngine)
        ? window.AptitudeAiEngine.generateWrongAnswerExplanation(q, selectedIndex)
        : `❌ TIME EXPIRED!\n\n✅ CORRECT DERIVATION:\n${q.explanation}`;

      if (el.explanationText) el.explanationText.textContent = explanationText;
      el.feedbackBanner.classList.remove('hidden');
    }
  }

  function triggerScreenShake() {
    const wrapper = document.querySelector('.canvas-wrapper');
    if (wrapper) {
      wrapper.classList.remove('screen-shake');
      void wrapper.offsetWidth;
      wrapper.classList.add('screen-shake');
    }
  }

  function triggerArenaFlash(type) {
    if (el.arenaEffectOverlay) {
      el.arenaEffectOverlay.className = `arena-effect-overlay ${type}-flash`;
      setTimeout(() => el.arenaEffectOverlay.className = 'arena-effect-overlay', 300);
    }
  }

  function updateHud() {
    if (el.hudScore) el.hudScore.textContent = String(gameState.score).padStart(4, '0');
    if (el.hudStreak) el.hudStreak.textContent = `🔥 ${gameState.streak}x`;
  }

  function updateProfileHud() {
    if (el.hudUsername) el.hudUsername.textContent = gameState.user.username;
    if (el.hudAvatarIcon) el.hudAvatarIcon.textContent = gameState.user.avatar;
    if (el.heroEntityName) el.heroEntityName.textContent = `${gameState.user.username.toUpperCase()} (${gameState.user.avatarName})`;
  }

  function nextChallenge() {
    gameState.currentQuestionIndex++;
    if (gameState.currentQuestionIndex >= gameState.activeQuestions.length) {
      triggerVictory();
    } else {
      loadQuestion(gameState.currentQuestionIndex);
    }
  }

  function triggerGameOver() {
    clearInterval(gameState.timerInterval);
    playGameOverSound();

    if (el.goFinalScore) el.goFinalScore.textContent = gameState.score;
    if (el.goStagesCleared) el.goStagesCleared.textContent = `${gameState.currentQuestionIndex} / ${gameState.activeQuestions.length}`;
    if (el.goMaxStreak) el.goMaxStreak.textContent = `${gameState.maxStreak}x`;
    if (el.gameOverOverlay) el.gameOverOverlay.classList.remove('hidden');
  }

  function triggerVictory() {
    clearInterval(gameState.timerInterval);
    playVictorySound();

    const totalQ = gameState.activeQuestions ? gameState.activeQuestions.length : 0;
    const correct = gameState.correctAnswers || 0;
    const wrong = gameState.wrongAnswers || 0;
    const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 100;

    if (el.vicFinalScore) el.vicFinalScore.textContent = gameState.score;
    if (el.vicAccuracy) el.vicAccuracy.textContent = `${accuracy}%`;
    if (el.vicLives) el.vicLives.textContent = `${correct} / ${totalQ}`;

    let rank = "APTITUDE SCHOLAR";
    if (gameState.score >= 1000) rank = "GRANDMASTER OF APTITUDE";
    else if (gameState.score >= 600) rank = "APTITUDE MASTER";
    else if (gameState.score >= 300) rank = "TACTICAL REASONER";

    if (el.vicRankBadge) el.vicRankBadge.textContent = rank;
    if (el.victoryOverlay) el.victoryOverlay.classList.remove('hidden');

    // Save Test Report to MongoDB Database
    fetch('/api/test/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: gameState.roomCode,
        email: gameState.user.email || 'scholar@example.com',
        username: gameState.user.username || 'Scholar',
        role: gameState.user.role || 'student',
        score: gameState.score,
        accuracy: `${accuracy}%`,
        totalQuestions: totalQ,
        correctAnswers: correct,
        wrongAnswers: wrong,
        difficulty: gameState.difficulty
      })
    }).catch(e => console.warn("Failed to persist test report to MongoDB:", e));
  }

  // ==========================================
  // 7. EVENT LISTENERS & MODAL HANDLERS
  // ==========================================

  // Role Selection & Separate Portal Tab Switcher (Student, Staff/Teacher, Admin)
  const rolePills = document.querySelectorAll('.role-pill');
  const loginPortalBadge = document.getElementById('loginPortalBadge');
  const usernameLabel = document.getElementById('usernameLabel');
  const emailLabel = document.getElementById('emailLabel');
  const studentTrackBox = document.getElementById('studentTrackBox');
  const teacherDeptBox = document.getElementById('teacherDeptBox');
  const adminPasscodeBox = document.getElementById('adminPasscodeBox');

  if (rolePills) {
    rolePills.forEach(pill => {
      pill.addEventListener('click', () => {
        rolePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const chosenRole = pill.dataset.role || 'student';
        gameState.user.role = chosenRole;

        if (chosenRole === 'student') {
          if (loginPortalBadge) loginPortalBadge.textContent = '🎓 STUDENT EVALUATION & ASSESSMENT PORTAL';
          if (usernameLabel) usernameLabel.textContent = 'STUDENT FULL NAME';
          if (emailLabel) emailLabel.textContent = 'STUDENT EMAIL ADDRESS (SIGNUP VERIFICATION)';
          if (el.confirmLoginBtn) el.confirmLoginBtn.textContent = 'VERIFY OTP & ENTER STUDENT PORTAL ▶';
          if (studentTrackBox) studentTrackBox.style.display = 'flex';
          if (teacherDeptBox) teacherDeptBox.classList.add('hidden');
          if (adminPasscodeBox) adminPasscodeBox.classList.add('hidden');
        } else if (chosenRole === 'staff') {
          if (loginPortalBadge) loginPortalBadge.textContent = '👨‍🏫 TEACHER / FACULTY QUESTION BANK & SETUP PORTAL';
          if (usernameLabel) usernameLabel.textContent = 'TEACHER / FACULTY FULL NAME';
          if (emailLabel) emailLabel.textContent = 'FACULTY EMAIL ADDRESS (SIGNUP VERIFICATION)';
          if (el.confirmLoginBtn) el.confirmLoginBtn.textContent = 'VERIFY OTP & LAUNCH TEACHER QB BUILDER ▶';
          if (studentTrackBox) studentTrackBox.style.display = 'none';
          if (teacherDeptBox) teacherDeptBox.classList.remove('hidden');
          if (adminPasscodeBox) adminPasscodeBox.classList.add('hidden');
        } else if (chosenRole === 'admin') {
          if (loginPortalBadge) loginPortalBadge.textContent = '🛡️ ADMINISTRATOR LIVE PROCTORING & MONITOR PORTAL';
          if (usernameLabel) usernameLabel.textContent = 'ADMINISTRATOR FULL NAME';
          if (emailLabel) emailLabel.textContent = 'ADMIN EMAIL ADDRESS (SIGNUP VERIFICATION)';
          if (el.confirmLoginBtn) el.confirmLoginBtn.textContent = 'VERIFY OTP & LAUNCH ADMIN LIVE MONITOR ▶';
          if (studentTrackBox) studentTrackBox.style.display = 'none';
          if (teacherDeptBox) teacherDeptBox.classList.add('hidden');
          if (adminPasscodeBox) adminPasscodeBox.classList.remove('hidden');
        }
      });
    });
  }

  // Avatar Cards Selection
  if (el.avatarCards) {
    el.avatarCards.forEach(card => {
      card.addEventListener('click', () => {
        el.avatarCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        gameState.user.avatar = card.dataset.avatar || '🎓';
        gameState.user.avatarName = card.dataset.name;
      });
    });
  }

  // ==========================================
  // PASSWORD & GOOGLE (GMAIL) AUTHENTICATION
  // ==========================================
  const confirmLoginBtn = document.getElementById('confirmLoginBtn');
  const usernameInput = document.getElementById('usernameInput');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const authStatusMessage = document.getElementById('authStatusMessage');

  if (confirmLoginBtn) {
    confirmLoginBtn.addEventListener('click', async () => {
      const username = usernameInput ? usernameInput.value.trim() : 'User';
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value.trim() : '';
      const role = currentProfession === 'teacher' ? 'staff' : currentProfession;

      if (!email || !email.includes('@')) {
        if (authStatusMessage) {
          authStatusMessage.className = 'qb-status-msg error';
          authStatusMessage.textContent = '❌ Please enter a valid email address.';
          authStatusMessage.classList.remove('hidden');
        }
        return;
      }

      if (!password) {
        if (authStatusMessage) {
          authStatusMessage.className = 'qb-status-msg error';
          authStatusMessage.textContent = '❌ Please enter your password.';
          authStatusMessage.classList.remove('hidden');
        }
        return;
      }

      const origText = confirmLoginBtn.textContent;
      confirmLoginBtn.disabled = true;
      confirmLoginBtn.textContent = 'AUTHENTICATING...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, username, role })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          completeUserLogin({
            email: data.user.email,
            username: data.user.username || username,
            role: data.user.role || role,
            authMethod: 'password'
          });
        } else {
          if (authStatusMessage) {
            authStatusMessage.className = 'qb-status-msg error';
            authStatusMessage.textContent = `❌ ${data.error || 'Authentication failed'}`;
            authStatusMessage.classList.remove('hidden');
          }
        }
      } catch (e) {
        completeUserLogin({ email, username, role, authMethod: 'password' });
      } finally {
        confirmLoginBtn.disabled = false;
        confirmLoginBtn.textContent = origText;
      }
    });
  }

  // Google Modal Listeners
  if (googleAuthBtn) {
    googleAuthBtn.addEventListener('click', () => {
      if (gAuthTargetRole) {
        gAuthTargetRole.textContent = currentProfession === 'student' ? 'Student Portal' : (currentProfession === 'admin' ? 'Admin Portal' : 'Teacher Portal');
      }
      if (googleAuthModal) googleAuthModal.classList.remove('hidden');
    });
  }

  if (closeGoogleAuthBtn && googleAuthModal) {
    closeGoogleAuthBtn.addEventListener('click', () => googleAuthModal.classList.add('hidden'));
  }

  if (gAccountItems) {
    gAccountItems.forEach(item => {
      item.addEventListener('click', () => {
        const email = item.dataset.email;
        const name = item.dataset.name;
        executeGoogleLogin(email, name, currentProfession === 'teacher' ? 'staff' : currentProfession);
      });
    });
  }

  if (gCustomSubmitBtn && gCustomEmailInput) {
    gCustomSubmitBtn.addEventListener('click', () => {
      const email = gCustomEmailInput.value.trim();
      if (!email || !email.includes('@')) {
        alert("Please enter a valid Gmail address!");
        return;
      }
      const name = email.split('@')[0];
      executeGoogleLogin(email, name, currentProfession === 'teacher' ? 'staff' : currentProfession);
    });
  }

  async function executeGoogleLogin(email, username, role) {
    try {
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, role })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (googleAuthModal) googleAuthModal.classList.add('hidden');
        completeUserLogin({
          email: data.user.email,
          username: data.user.username,
          role: data.user.role,
          authMethod: 'google'
        });
      } else {
        alert(`❌ Google Auth Failed: ${data.error || 'Check email'}`);
      }
    } catch (e) {
      if (googleAuthModal) googleAuthModal.classList.add('hidden');
      completeUserLogin({ email, username, role, authMethod: 'google' });
    }
  }

  // ==========================================
  // COMPLETE USER LOGIN & UI ROLE SCOPING
  // ==========================================
  function completeUserLogin(user) {
    gameState.user.username = user.username || 'Scholar';
    gameState.user.email = user.email || 'user@example.com';
    gameState.user.role = user.role || 'student';
    gameState.user.isVerified = true;

    updateProfileHud();
    applyRoleUiPermissions(gameState.user.role);

    if (authLoginPage) {
      authLoginPage.classList.add('hidden');
      authLoginPage.style.display = 'none';
    }
    if (el.loginModal) {
      el.loginModal.classList.add('hidden');
      el.loginModal.style.display = 'none';
    }

    if (gameState.user.role === 'staff' || gameState.user.role === 'teacher') {
      const teacherQbModal = document.getElementById('teacherQbModal');
      if (teacherQbModal) teacherQbModal.classList.remove('hidden');
    } else if (gameState.user.role === 'admin') {
      const adminMonitorModal = document.getElementById('adminMonitorModal');
      if (adminMonitorModal) {
        fetchAdminMonitorData();
        adminMonitorModal.classList.remove('hidden');
      }
    }
  }

  function applyRoleUiPermissions(role) {
    const studentPracticeBtn = document.getElementById('studentPracticeBtn');
    const studentAssignedTestsBtn = document.getElementById('studentAssignedTestsBtn');
    const teacherQbBtn = document.getElementById('teacherQbBtn');
    const adminAuditBtn = document.getElementById('adminAuditBtn');

    if (role === 'student') {
      if (studentPracticeBtn) studentPracticeBtn.classList.remove('hidden');
      if (studentAssignedTestsBtn) studentAssignedTestsBtn.classList.remove('hidden');
      if (teacherQbBtn) teacherQbBtn.classList.add('hidden');
      if (adminAuditBtn) adminAuditBtn.classList.add('hidden');
    } else if (role === 'staff' || role === 'teacher') {
      if (studentPracticeBtn) studentPracticeBtn.classList.add('hidden');
      if (studentAssignedTestsBtn) studentAssignedTestsBtn.classList.add('hidden');
      if (teacherQbBtn) teacherQbBtn.classList.remove('hidden');
      if (adminAuditBtn) adminAuditBtn.classList.add('hidden');
    } else if (role === 'admin') {
      if (studentPracticeBtn) studentPracticeBtn.classList.add('hidden');
      if (studentAssignedTestsBtn) studentAssignedTestsBtn.classList.add('hidden');
      if (teacherQbBtn) teacherQbBtn.classList.remove('hidden');
      if (adminAuditBtn) adminAuditBtn.classList.remove('hidden');
    }
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (authLoginPage) {
        authLoginPage.classList.remove('hidden');
        authLoginPage.style.display = 'flex';
      }
    });
  }

  if (el.userProfileBtn) {
    el.userProfileBtn.addEventListener('click', () => {
      if (authLoginPage) {
        authLoginPage.classList.remove('hidden');
        authLoginPage.style.display = 'flex';
      }
    });
  }
  if (el.setupGameBtn && el.setupModal) {
    el.setupGameBtn.addEventListener('click', () => el.setupModal.classList.remove('hidden'));
  }
  if (el.cancelSetupBtn && el.setupModal) {
    el.cancelSetupBtn.addEventListener('click', () => el.setupModal.classList.add('hidden'));
  }

  // Question Bank (QB) Upload & Answer Review Handlers
  if (el.qbBtn && el.qbUploadModal) {
    el.qbBtn.addEventListener('click', () => {
      if (el.qbStatusMessage) el.qbStatusMessage.classList.add('hidden');
      if (el.qbPreviewSection) el.qbPreviewSection.classList.add('hidden');
      el.qbUploadModal.classList.remove('hidden');
    });
  }

  if (el.closeQbModalBtn && el.qbUploadModal) {
    el.closeQbModalBtn.addEventListener('click', () => el.qbUploadModal.classList.add('hidden'));
  }

  if (el.clearQbBtn) {
    el.clearQbBtn.addEventListener('click', () => {
      if (window.AptitudeAiEngine) {
        window.AptitudeAiEngine.clearCustomQb();
      }
      gameState.pendingParsedQb = [];
      if (el.qbActiveTag) el.qbActiveTag.classList.add('hidden');
      if (el.qbPasteTextarea) el.qbPasteTextarea.value = '';
      if (el.qbPreviewSection) el.qbPreviewSection.classList.add('hidden');
      if (el.qbStatusMessage) {
        el.qbStatusMessage.className = 'qb-status-msg success';
        el.qbStatusMessage.textContent = 'Custom Question Bank cleared! Default AI generation restored.';
        el.qbStatusMessage.classList.remove('hidden');
      }
    });
  }

  if (el.qbFileInput && el.qbPasteTextarea) {
    el.qbFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        el.qbPasteTextarea.value = event.target.result;
        renderQbPreviewList();
      };
      reader.readAsText(file);
    });
  }

  async function renderQbPreviewList() {
    const content = el.qbPasteTextarea ? el.qbPasteTextarea.value.trim() : '';
    if (!content) return;

    try {
      const autoSolve = el.qbAiSolveCheckbox ? el.qbAiSolveCheckbox.checked : true;
      const parsed = await window.AptitudeAiEngine.importQuestionBank(content, autoSolve);
      gameState.pendingParsedQb = parsed;

      if (el.qbPreviewList) {
        el.qbPreviewList.innerHTML = '';
        parsed.forEach((q, idx) => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'qb-preview-item';
          itemDiv.innerHTML = `
            <div class="qb-q-text">${idx + 1}. ${q.question}</div>
            <div class="qb-ans-select-row">
              <span class="qb-ans-label">CORRECT CHOICE:</span>
              <select class="styled-select qb-ans-select" data-index="${idx}">
                <option value="0" ${q.correctIndex === 0 ? 'selected' : ''}>A) ${q.options[0]}</option>
                <option value="1" ${q.correctIndex === 1 ? 'selected' : ''}>B) ${q.options[1]}</option>
                <option value="2" ${q.correctIndex === 2 ? 'selected' : ''}>C) ${q.options[2]}</option>
                <option value="3" ${q.correctIndex === 3 ? 'selected' : ''}>D) ${q.options[3]}</option>
              </select>
            </div>
          `;
          el.qbPreviewList.appendChild(itemDiv);
        });

        // Wire change listeners to dynamic selects
        const selects = el.qbPreviewList.querySelectorAll('.qb-ans-select');
        selects.forEach(sel => {
          sel.addEventListener('change', (e) => {
            const qIdx = parseInt(e.target.dataset.index, 10);
            const chosenAnsIdx = parseInt(e.target.value, 10);
            if (gameState.pendingParsedQb[qIdx]) {
              gameState.pendingParsedQb[qIdx].correctIndex = chosenAnsIdx;
            }
          });
        });
      }

      if (el.qbPreviewSection) el.qbPreviewSection.classList.remove('hidden');
      if (el.qbStatusMessage) {
        el.qbStatusMessage.className = 'qb-status-msg success';
        el.qbStatusMessage.textContent = `✓ Parsed ${parsed.length} questions! Review correct choices below before starting.`;
        el.qbStatusMessage.classList.remove('hidden');
      }

    } catch (err) {
      if (el.qbStatusMessage) {
        el.qbStatusMessage.className = 'qb-status-msg error';
        el.qbStatusMessage.textContent = `⚠️ Parse Error: ${err.message}`;
        el.qbStatusMessage.classList.remove('hidden');
      }
    }
  }

  if (el.parseQbPreviewBtn) {
    el.parseQbPreviewBtn.addEventListener('click', renderQbPreviewList);
  }

  if (el.importQbBtn) {
    el.importQbBtn.addEventListener('click', async () => {
      if (!gameState.pendingParsedQb || gameState.pendingParsedQb.length === 0) {
        await renderQbPreviewList();
      }

      if (gameState.pendingParsedQb && gameState.pendingParsedQb.length > 0) {
        window.AptitudeAiEngine.customQb = gameState.pendingParsedQb;
        window.AptitudeAiEngine.saveQbToStorage();

        if (el.qbStatusMessage) {
          el.qbStatusMessage.className = 'qb-status-msg success';
          el.qbStatusMessage.textContent = `🚀 Loaded ${gameState.pendingParsedQb.length} questions into Arena! Starting match...`;
          el.qbStatusMessage.classList.remove('hidden');
        }

        setTimeout(() => {
          if (el.qbUploadModal) el.qbUploadModal.classList.add('hidden');
          startGame();
        }, 800);
      }
    });
  }

  // AI Config Modal Handlers
  if (el.aiConfigBtn && el.aiConfigModal) {
    el.aiConfigBtn.addEventListener('click', () => {
      if (window.AptitudeAiEngine) {
        const cfg = window.AptitudeAiEngine.llmConfig;
        if (el.useLlmApiCheckbox) el.useLlmApiCheckbox.checked = cfg.useLlmApi;
        if (el.llmApiKeyInput) el.llmApiKeyInput.value = cfg.apiKey || '';
        if (el.llmProviderSelect) {
          const combinedVal = `${cfg.provider}:${cfg.model}`;
          const hasOption = Array.from(el.llmProviderSelect.options).some(opt => opt.value === combinedVal);
          if (hasOption) el.llmProviderSelect.value = combinedVal;
        }

        if (cfg.apiKey && cfg.isFromEnv && el.aiApiStatusMessage) {
          el.aiApiStatusMessage.className = 'qb-status-msg success';
          el.aiApiStatusMessage.textContent = '🔒 AI Model API Key is loaded & protected by Environment Configuration (.env / env.js)';
          el.aiApiStatusMessage.classList.remove('hidden');
        } else if (el.aiApiStatusMessage) {
          el.aiApiStatusMessage.classList.add('hidden');
        }
      }
      el.aiConfigModal.classList.remove('hidden');
    });
  }

  if (el.clearAiConfigBtn) {
    el.clearAiConfigBtn.addEventListener('click', () => {
      if (window.AptitudeAiEngine) {
        window.AptitudeAiEngine.clearLlmConfig();
      }
      if (el.useLlmApiCheckbox) el.useLlmApiCheckbox.checked = false;
      if (el.llmApiKeyInput) el.llmApiKeyInput.value = '';
      if (el.llmProviderSelect) el.llmProviderSelect.value = 'gemini:gemini-1.5-flash';
      if (el.aiApiStatusMessage) {
        el.aiApiStatusMessage.className = 'qb-status-msg';
        el.aiApiStatusMessage.textContent = '🗑️ AI Model settings & API Key cleared! Default procedural generator active.';
        el.aiApiStatusMessage.classList.remove('hidden');
      }
    });
  }

  if (el.testAiConfigBtn && el.aiApiStatusMessage) {
    el.testAiConfigBtn.addEventListener('click', async () => {
      const apiKey = el.llmApiKeyInput ? el.llmApiKeyInput.value.trim() : '';
      const selectedVal = el.llmProviderSelect ? el.llmProviderSelect.value : 'gemini:gemini-1.5-flash';
      const [provider, model] = selectedVal.split(':');

      el.aiApiStatusMessage.className = 'qb-status-msg';
      el.aiApiStatusMessage.textContent = '⚡ Testing API Key connection...';
      el.aiApiStatusMessage.classList.remove('hidden');

      try {
        await window.AptitudeAiEngine.testLlmApiKey(apiKey, provider, model);
        el.aiApiStatusMessage.className = 'qb-status-msg success';
        el.aiApiStatusMessage.textContent = `✓ API Key verified successfully! Model (${model}) is active.`;
      } catch (err) {
        el.aiApiStatusMessage.className = 'qb-status-msg error';
        el.aiApiStatusMessage.textContent = `❌ Test Failed: ${err.message}`;
      }
    });
  }

  if (el.closeAiConfigBtn && el.aiConfigModal) {
    el.closeAiConfigBtn.addEventListener('click', () => el.aiConfigModal.classList.add('hidden'));
  }

  if (el.saveAiConfigBtn && el.aiConfigModal) {
    el.saveAiConfigBtn.addEventListener('click', () => {
      const selectedVal = el.llmProviderSelect ? el.llmProviderSelect.value : 'gemini:gemini-1.5-flash';
      const [provider, model] = selectedVal.split(':');

      if (window.AptitudeAiEngine) {
        window.AptitudeAiEngine.setLlmConfig({
          useLlmApi: el.useLlmApiCheckbox ? el.useLlmApiCheckbox.checked : false,
          apiKey: el.llmApiKeyInput ? el.llmApiKeyInput.value.trim() : '',
          provider: provider,
          model: model
        });
      }
      if (el.aiApiStatusMessage) {
        el.aiApiStatusMessage.className = 'qb-status-msg success';
        el.aiApiStatusMessage.textContent = '✓ AI & LLM Model settings saved!';
        el.aiApiStatusMessage.classList.remove('hidden');
      }
      setTimeout(() => {
        el.aiConfigModal.classList.add('hidden');
      }, 600);
    });
  }

  // Setup Modal & QB Notice Toggle
  if (el.setupGameBtn && el.setupModal) {
    el.setupGameBtn.addEventListener('click', () => {
      if (window.AptitudeAiEngine && window.AptitudeAiEngine.hasCustomQb()) {
        if (el.qbActiveNotice) el.qbActiveNotice.classList.remove('hidden');
      } else {
        if (el.qbActiveNotice) el.qbActiveNotice.classList.add('hidden');
      }
      el.setupModal.classList.remove('hidden');
    });
  }

  if (el.useProceduralAiBtn) {
    el.useProceduralAiBtn.addEventListener('click', () => {
      if (window.AptitudeAiEngine) window.AptitudeAiEngine.clearCustomQb();
      if (el.qbActiveNotice) el.qbActiveNotice.classList.add('hidden');
      if (el.qbActiveTag) el.qbActiveTag.classList.add('hidden');
      alert("Cleared Custom Question Bank. Arena is now using Pure AI Question Generation!");
    });
  }

  // Difficulty Pills
  if (el.diffPills) {
    el.diffPills.forEach(pill => {
      pill.addEventListener('click', () => {
        el.diffPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        gameState.difficulty = pill.dataset.diff;
      });
    });
  }

  if (el.selectAllTopicsBtn && el.topicCheckboxes) {
    el.selectAllTopicsBtn.addEventListener('click', () => {
      el.topicCheckboxes.forEach(cb => cb.checked = true);
    });
  }

  if (el.startAiMatchBtn && el.topicCheckboxes) {
    el.startAiMatchBtn.addEventListener('click', async () => {
      const checked = Array.from(el.topicCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
      if (checked.length === 0) {
        alert("Please select at least 1 topic!");
        return;
      }
      gameState.selectedTopics = checked;
      if (el.questionsCountSelect) gameState.matchQuestionCount = parseInt(el.questionsCountSelect.value, 10);

      const origText = el.startAiMatchBtn.textContent;
      el.startAiMatchBtn.disabled = true;
      el.startAiMatchBtn.textContent = "⚡ GENERATING AI ARENA...";

      try {
        await startGame(true); // Force AI generation!
      } finally {
        el.startAiMatchBtn.disabled = false;
        el.startAiMatchBtn.textContent = origText;
      }
    });
  }

  // Friends & QR Code Modal
  if (el.friendsBtn && el.friendsModal) {
    el.friendsBtn.addEventListener('click', () => {
      const randomSeed = Math.floor(1000 + Math.random() * 9000);
      gameState.roomCode = `ARENA-${randomSeed}`;
      if (el.roomCodeDisplay) el.roomCodeDisplay.textContent = gameState.roomCode;

      const basePath = window.location.pathname.endsWith('.html') ? window.location.pathname : `${window.location.pathname.replace(/\/$/, '')}/index.html`;
      const shareUrl = `${window.location.origin}${basePath}?room=${gameState.roomCode}&diff=${gameState.difficulty}&topics=${gameState.selectedTopics.join(',')}`;
      if (el.shareUrlInput) el.shareUrlInput.value = shareUrl;

      generateQrCodeCanvas(el.qrCanvas, shareUrl);

      if (el.copyFeedback) el.copyFeedback.classList.add('hidden');
      el.friendsModal.classList.remove('hidden');
    });
  }

  if (el.copyShareUrlBtn) {
    el.copyShareUrlBtn.addEventListener('click', () => {
      if (el.shareUrlInput) {
        navigator.clipboard.writeText(el.shareUrlInput.value).then(() => {
          if (el.copyFeedback) {
            el.copyFeedback.classList.remove('hidden');
            setTimeout(() => el.copyFeedback.classList.add('hidden'), 3000);
          }
        }).catch(() => {
          el.shareUrlInput.select();
          document.execCommand('copy');
          if (el.copyFeedback) {
            el.copyFeedback.classList.remove('hidden');
            setTimeout(() => el.copyFeedback.classList.add('hidden'), 3000);
          }
        });
      }
    });
  }

  if (el.closeFriendsModalBtn && el.friendsModal) {
    el.closeFriendsModalBtn.addEventListener('click', () => el.friendsModal.classList.add('hidden'));
  }

  // Option Clicks
  if (el.optionBtns) {
    el.optionBtns.forEach((btn, idx) => {
      btn.addEventListener('click', () => handleOptionSelect(idx));
    });
  }

  if (el.nextBtn) {
    el.nextBtn.addEventListener('click', () => {
      playClickSound();
      nextChallenge();
    });
  }

  if (el.restartGameBtn) el.restartGameBtn.addEventListener('click', startGame);
  if (el.playAgainBtn) el.playAgainBtn.addEventListener('click', startGame);

  if (el.sfxToggleBtn) {
    el.sfxToggleBtn.addEventListener('click', () => {
      gameState.sfxEnabled = !gameState.sfxEnabled;
      if (el.sfxIcon) el.sfxIcon.textContent = gameState.sfxEnabled ? '🔊' : '🔇';
      el.sfxToggleBtn.style.opacity = gameState.sfxEnabled ? '1' : '0.6';
    });
  }

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    const isModalOpen = (el.loginModal && !el.loginModal.classList.contains('hidden')) ||
      (el.setupModal && !el.setupModal.classList.contains('hidden')) ||
      (el.qbUploadModal && !el.qbUploadModal.classList.contains('hidden')) ||
      (el.aiConfigModal && !el.aiConfigModal.classList.contains('hidden')) ||
      (el.friendsModal && !el.friendsModal.classList.contains('hidden'));
    if (gameState.isAnswered || isModalOpen) return;

    if (e.key === '1' || e.key.toLowerCase() === 'a') handleOptionSelect(0);
    else if (e.key === '2' || e.key.toLowerCase() === 'b') handleOptionSelect(1);
    else if (e.key === '3' || e.key.toLowerCase() === 'c') handleOptionSelect(2);
    else if (e.key === '4' || e.key.toLowerCase() === 'd') handleOptionSelect(3);
    else if (e.key === 'Enter' && el.feedbackBanner && !el.feedbackBanner.classList.contains('hidden')) {
      nextChallenge();
    }
  });

  // Query String Parser & Auto Join Room
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('room')) {
    gameState.roomCode = urlParams.get('room');
    if (urlParams.has('diff')) gameState.difficulty = urlParams.get('diff');
    if (urlParams.has('topics')) gameState.selectedTopics = urlParams.get('topics').split(',');

    setTimeout(() => {
      alert(`🎮 Joined Multiplayer Room [${gameState.roomCode}]! Starting shared arena match...`);
      startGame(true);
    }, 400);
  }

  // Real-Time Multiplayer Room Sync Interval
  async function syncMultiplayerState() {
    if (!gameState.roomCode) return;

    try {
      const payload = {
        roomCode: gameState.roomCode,
        playerId: gameState.playerId || (gameState.playerId = 'P_' + Math.floor(1000 + Math.random() * 9000)),
        username: gameState.user.username,
        avatar: gameState.user.avatar,
        hp: gameState.heroHp,
        score: gameState.score,
        lives: gameState.lives,
        currentQuestionIndex: gameState.currentQuestionIndex
      };

      const response = await fetch('/api/room/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.opponent) {
          gameState.opponent = data.opponent;
          // Update Opponent HUD Display
          if (el.monsterName) {
            el.monsterName.textContent = `${data.opponent.avatar} ${data.opponent.username.toUpperCase()}`;
          }
          if (el.monsterHpBar) {
            el.monsterHpBar.style.width = `${Math.max(0, data.opponent.hp)}%`;
          }
          if (el.roomOpponentStatus) {
            el.roomOpponentStatus.textContent = `⚔️ OPPONENT: ${data.opponent.avatar} ${data.opponent.username} | HP: ${data.opponent.hp}% | SCORE: ${data.opponent.score}`;
            el.roomOpponentStatus.classList.remove('hidden');
          }
        } else {
          gameState.opponent = null;
          if (el.roomOpponentStatus) {
            el.roomOpponentStatus.textContent = `⏳ Room [${gameState.roomCode}] Active! Share link or QR code to invite an opponent...`;
            el.roomOpponentStatus.classList.remove('hidden');
          }
        }
      }
    } catch (e) {
      console.warn("Multiplayer room sync error:", e);
    }
  }

  setInterval(syncMultiplayerState, 1200);

  // ==========================================
  // TEACHER QB BUILDER & ADMIN MONITOR LOGIC
  // ==========================================
  let teacherQbQuestions = [];

  const teacherQbBtn = document.getElementById('teacherQbBtn');
  const teacherQbModal = document.getElementById('teacherQbModal');
  const tQbFileInput = document.getElementById('tQbFileInput');
  const tQbPasteTextarea = document.getElementById('tQbPasteTextarea');
  const tParseJsonBtn = document.getElementById('tParseJsonBtn');

  const tQuestionText = document.getElementById('tQuestionText');
  const tOptionA = document.getElementById('tOptionA');
  const tOptionB = document.getElementById('tOptionB');
  const tOptionC = document.getElementById('tOptionC');
  const tOptionD = document.getElementById('tOptionD');
  const tCorrectOption = document.getElementById('tCorrectOption');
  const tTopic = document.getElementById('tTopic');
  const tDifficulty = document.getElementById('tDifficulty');
  const tExplanation = document.getElementById('tExplanation');
  const tAddQuestionBtn = document.getElementById('tAddQuestionBtn');
  const tQbList = document.getElementById('tQbList');
  const tQbCount = document.getElementById('tQbCount');
  const tClearQbBtn = document.getElementById('tClearQbBtn');
  const tCloseBtn = document.getElementById('tCloseBtn');
  const tPublishQbBtn = document.getElementById('tPublishQbBtn');

  if (teacherQbBtn && teacherQbModal) {
    teacherQbBtn.addEventListener('click', () => {
      renderTeacherQbList();
      teacherQbModal.classList.remove('hidden');
    });
  }

  if (tCloseBtn) {
    tCloseBtn.addEventListener('click', () => {
      if (teacherQbModal) teacherQbModal.classList.add('hidden');
    });
  }

  // Parse JSON / Text File or Paste in Teacher QB Builder
  if (tParseJsonBtn) {
    tParseJsonBtn.addEventListener('click', async () => {
      let rawContent = tQbPasteTextarea ? tQbPasteTextarea.value.trim() : '';

      if (tQbFileInput && tQbFileInput.files && tQbFileInput.files[0]) {
        const file = tQbFileInput.files[0];
        rawContent = await file.text();
      }

      if (!rawContent) {
        alert("Please choose a JSON/text file or paste question text into the area!");
        return;
      }

      try {
        const parsed = await window.AptitudeAiEngine.importQuestionBank(rawContent, false);
        if (parsed && parsed.length > 0) {
          teacherQbQuestions.push(...parsed);
          renderTeacherQbList();
          alert(`✅ Successfully imported ${parsed.length} questions into Teacher Question Bank!`);
          if (tQbPasteTextarea) tQbPasteTextarea.value = '';
          if (tQbFileInput) tQbFileInput.value = '';
        } else {
          alert("Could not extract valid questions from the provided file/text. Please check JSON format.");
        }
      } catch (err) {
        alert("JSON/Text Parse Error: " + err.message);
      }
    });
  }

  function renderTeacherQbList() {
    if (!tQbList) return;
    tQbList.innerHTML = '';
    if (tQbCount) tQbCount.textContent = teacherQbQuestions.length;

    if (teacherQbQuestions.length === 0) {
      tQbList.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 1rem;">No manual questions added yet. Use form above to add questions.</div>`;
      return;
    }

    teacherQbQuestions.forEach((q, idx) => {
      const item = document.createElement('div');
      item.className = 'qb-preview-item';
      item.style.position = 'relative';

      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <span style="font-size: 0.82rem; font-weight: 700; color: var(--accent-cyan-bright);">Q${idx + 1} [${q.topic} - ${q.difficulty.toUpperCase()}]</span>
          <button class="delete-q-btn" data-index="${idx}" style="background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); color: #ef4444; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; cursor: pointer;">Delete</button>
        </div>
        <div class="qb-q-text" style="margin-top: 4px;">${q.question}</div>
        <div style="font-size: 0.8rem; color: var(--accent-emerald-bright); margin-top: 2px;">✅ Correct: Option ${q.answer} (${q.options[q.correctIndex]})</div>
      `;

      item.querySelector('.delete-q-btn').addEventListener('click', () => {
        teacherQbQuestions.splice(idx, 1);
        renderTeacherQbList();
      });

      tQbList.appendChild(item);
    });
  }

  if (tAddQuestionBtn) {
    tAddQuestionBtn.addEventListener('click', () => {
      const qText = tQuestionText ? tQuestionText.value.trim() : '';
      const optA = tOptionA ? tOptionA.value.trim() : '';
      const optB = tOptionB ? tOptionB.value.trim() : '';
      const optC = tOptionC ? tOptionC.value.trim() : '';
      const optD = tOptionD ? tOptionD.value.trim() : '';
      const ansLetter = tCorrectOption ? tCorrectOption.value : 'A';
      const topicVal = tTopic ? tTopic.value : 'General Aptitude';
      const diffVal = tDifficulty ? tDifficulty.value : 'medium';
      const expText = tExplanation ? tExplanation.value.trim() : '';

      if (!qText || !optA || !optB || !optC || !optD) {
        alert("Please fill in question text and all 4 options!");
        return;
      }

      const letterMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
      const correctIndex = letterMap[ansLetter] !== undefined ? letterMap[ansLetter] : 0;
      const options = [optA, optB, optC, optD];

      const newQ = {
        question: qText,
        options,
        answer: ansLetter,
        correctIndex,
        topic: topicVal,
        difficulty: diffVal,
        timeLimit: diffVal === 'hard' ? 60 : (diffVal === 'medium' ? 90 : 120),
        monsterName: `TARGET ${topicVal.toUpperCase()}`,
        explanation: expText || `Correct Answer: Option ${ansLetter} (${options[correctIndex]}).`
      };

      teacherQbQuestions.push(newQ);
      renderTeacherQbList();

      // Clear input fields
      if (tQuestionText) tQuestionText.value = '';
      if (tOptionA) tOptionA.value = '';
      if (tOptionB) tOptionB.value = '';
      if (tOptionC) tOptionC.value = '';
      if (tOptionD) tOptionD.value = '';
      if (tExplanation) tExplanation.value = '';
    });
  }

  if (tClearQbBtn) {
    tClearQbBtn.addEventListener('click', () => {
      if (confirm("Are you sure you want to clear all teacher questions?")) {
        teacherQbQuestions = [];
        renderTeacherQbList();
      }
    });
  }

  if (tPublishQbBtn) {
    tPublishQbBtn.addEventListener('click', async () => {
      if (teacherQbQuestions.length === 0) {
        alert("Please add at least 1 question before publishing!");
        return;
      }

      if (window.AptitudeAiEngine) {
        window.AptitudeAiEngine.customQb = teacherQbQuestions;
        localStorage.setItem('aptitude_custom_qb', JSON.stringify(teacherQbQuestions));
      }

      if (teacherQbModal) teacherQbModal.classList.add('hidden');
      alert(`🎉 Published ${teacherQbQuestions.length} Teacher Assessment Questions! Starting assessment...`);
      await startGame(false);
    });
  }

  // ADMIN LIVE MONITOR DASHBOARD
  const adminMonitorBtn = document.getElementById('adminMonitorBtn');
  const adminMonitorModal = document.getElementById('adminMonitorModal');
  const adminRoomDisplay = document.getElementById('adminRoomDisplay');
  const adminCandidateCount = document.getElementById('adminCandidateCount');
  const adminCandidateTableBody = document.getElementById('adminCandidateTableBody');
  const adminRefreshBtn = document.getElementById('adminRefreshBtn');
  const adminExportCsvBtn = document.getElementById('adminExportCsvBtn');
  const adminCloseBtn = document.getElementById('adminCloseBtn');

  if (adminMonitorBtn && adminMonitorModal) {
    adminMonitorBtn.addEventListener('click', () => {
      fetchAdminMonitorData();
      adminMonitorModal.classList.remove('hidden');
    });
  }

  if (adminCloseBtn) {
    adminCloseBtn.addEventListener('click', () => {
      if (adminMonitorModal) adminMonitorModal.classList.add('hidden');
    });
  }

  if (adminRefreshBtn) {
    adminRefreshBtn.addEventListener('click', fetchAdminMonitorData);
  }

  async function fetchAdminMonitorData() {
    if (adminRoomDisplay) adminRoomDisplay.textContent = gameState.roomCode;
    try {
      const response = await fetch(`/api/room/admin?roomCode=${gameState.roomCode}`);
      if (response.ok) {
        const data = await response.json();
        const candidates = data.candidates || [];
        if (adminCandidateCount) adminCandidateCount.textContent = `${candidates.length} Online`;

        if (!adminCandidateTableBody) return;
        adminCandidateTableBody.innerHTML = '';

        if (candidates.length === 0) {
          adminCandidateTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No active candidates connected to room ${gameState.roomCode} yet. Share room code with candidates to monitor live.</td></tr>`;
          return;
        }

        const totalQuestions = gameState.activeQuestions ? gameState.activeQuestions.length : 5;

        candidates.forEach(c => {
          const tr = document.createElement('tr');
          tr.style.borderBottom = '1px solid rgba(255,255,255,0.06)';

          const qProgress = (c.currentQuestionIndex || 0) + 1;
          const statusText = qProgress >= totalQuestions ? 'COMPLETED' : 'IN PROGRESS';
          const statusColor = statusText === 'COMPLETED' ? 'var(--accent-emerald-bright)' : 'var(--accent-cyan-bright)';
          const lastSeenSecs = Math.round((Date.now() - (c.lastSeen || Date.now())) / 1000);

          tr.innerHTML = `
            <td style="padding: 0.6rem; font-weight: 700;">${c.avatar || '🎓'} ${c.username || 'Scholar'}</td>
            <td style="padding: 0.6rem;">Q${qProgress} / ${totalQuestions}</td>
            <td style="padding: 0.6rem; color: var(--accent-emerald-bright); font-weight: 700;">${c.score || 0} pts</td>
            <td style="padding: 0.6rem; color: ${statusColor}; font-weight: 700;">${statusText}</td>
            <td style="padding: 0.6rem; color: var(--text-muted);">${lastSeenSecs}s ago</td>
          `;

          adminCandidateTableBody.appendChild(tr);
        });
      }
    } catch (e) {
      console.warn("Admin monitor fetch error:", e);
    }
  }

  if (adminExportCsvBtn) {
    adminExportCsvBtn.addEventListener('click', async () => {
      try {
        const response = await fetch(`/api/room/admin?roomCode=${gameState.roomCode}`);
        const data = await response.json();
        const candidates = data.candidates || [];

        let csvContent = "data:text/csv;charset=utf-8,Candidate Name,Room Code,Current Question,Score,Status,Last Active\n";
        candidates.forEach(c => {
          csvContent += `"${c.username}","${gameState.roomCode}","Q${(c.currentQuestionIndex || 0) + 1}","${c.score || 0}","IN PROGRESS","${new Date(c.lastSeen).toLocaleTimeString()}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Assessment_Report_${gameState.roomCode}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        alert("Failed to export CSV report: " + e.message);
      }
    });
  }

  // ==========================================
  // MULTI-ROLE PORTALS, ANTI-CHEAT & AUDIT LOG ENGINE
  // ==========================================
  let activeRole = 'student';
  let isPracticeMode = false;
  let isProtectedTest = false;
  let tabSwitchCount = 0;
  let isTerminated = false;
  let activeAttemptId = null;
  let activeTestId = null;
  let activeTestTitle = '';

  const studentPracticeBtn = document.getElementById('studentPracticeBtn');
  const studentAssignedTestsBtn = document.getElementById('studentAssignedTestsBtn');
  const adminAuditBtn = document.getElementById('adminAuditBtn');
  const practiceAnswerBox = document.getElementById('practiceAnswerBox');
  const practiceAnswerText = document.getElementById('practiceAnswerText');
  const practiceExplanationText = document.getElementById('practiceExplanationText');
  const toggleAnswerVisibilityBtn = document.getElementById('toggleAnswerVisibilityBtn');
  const protectedTestBanner = document.getElementById('protectedTestBanner');
  const liveTabSwitchCount = document.getElementById('liveTabSwitchCount');

  const adminAuditModal = document.getElementById('adminAuditModal');
  const auditLoginsView = document.getElementById('auditLoginsView');
  const auditTestsView = document.getElementById('auditTestsView');
  const auditDevicesView = document.getElementById('auditDevicesView');
  const auditLoginsTableBody = document.getElementById('auditLoginsTableBody');
  const auditTestsTableBody = document.getElementById('auditTestsTableBody');
  const auditDevicesTableBody = document.getElementById('auditDevicesTableBody');
  const refreshAuditBtn = document.getElementById('refreshAuditBtn');
  const closeAuditModalBtn = document.getElementById('closeAuditModalBtn');
  const auditLoginCount = document.getElementById('auditLoginCount');
  const auditTestCount = document.getElementById('auditTestCount');
  const auditDeviceCount = document.getElementById('auditDeviceCount');

  const tabWarningModal = document.getElementById('tabWarningModal');
  const resumeTestBtn = document.getElementById('resumeTestBtn');
  const tabTerminatedModal = document.getElementById('tabTerminatedModal');
  const exitTerminatedModalBtn = document.getElementById('exitTerminatedModalBtn');

  const studentAssignedTestsModal = document.getElementById('studentAssignedTestsModal');
  const studentAssignedTestsList = document.getElementById('studentAssignedTestsList');
  const refreshAssignedTestsBtn = document.getElementById('refreshAssignedTestsBtn');
  const closeAssignedTestsModalBtn = document.getElementById('closeAssignedTestsModalBtn');

  function getDeviceDetails() {
    const ua = navigator.userAgent;
    let browser = 'Chrome/Edge';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';

    let os = 'Windows';
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'MacOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return {
      browser,
      os,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      platform: navigator.platform || 'Desktop',
      userAgent: ua
    };
  }

  // Portal Navigation Tabs Handler
  const portalNavTabs = document.querySelectorAll('.portal-nav-tabs .portal-tab-btn');
  const loginBadge = document.getElementById('loginPortalBadge');
  const stTrackBox = document.getElementById('studentTrackBox');
  const tcDeptBox = document.getElementById('teacherDeptBox');
  const adPasscodeBox = document.getElementById('adminPasscodeBox');

  if (portalNavTabs && portalNavTabs.length > 0) {
    portalNavTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        portalNavTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        activeRole = tab.dataset.role || 'student';

        if (loginBadge) {
          if (activeRole === 'student') loginBadge.textContent = '🎓 STUDENT EVALUATION & ASSESSMENT PORTAL';
          else if (activeRole === 'staff' || activeRole === 'teacher') loginBadge.textContent = '👨‍🏫 TEACHER ASSESSMENT & QUESTION BANK PORTAL';
          else if (activeRole === 'admin') loginBadge.textContent = '🛡️ SYSTEM ADMINISTRATOR SECURITY PORTAL';
        }

        if (stTrackBox) stTrackBox.classList.toggle('hidden', activeRole !== 'student');
        if (tcDeptBox) tcDeptBox.classList.toggle('hidden', activeRole !== 'staff' && activeRole !== 'teacher');
        if (adPasscodeBox) adPasscodeBox.classList.toggle('hidden', activeRole !== 'admin');
      });
    });
  }

  // Handle Confirm Login
  if (el.confirmLoginBtn) {
    el.confirmLoginBtn.addEventListener('click', async () => {
      const username = el.usernameInput ? el.usernameInput.value.trim() : 'Scholar';
      const email = el.emailInput ? el.emailInput.value.trim() : 'scholar@example.com';
      const passcode = document.getElementById('adminPasscodeInput') ? document.getElementById('adminPasscodeInput').value.trim() : '';

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            email,
            role: activeRole,
            adminPasscode: passcode,
            deviceDetails: getDeviceDetails()
          })
        });

        const data = await response.json();
        if (!response.ok) {
          alert("Login Authentication Failed: " + (data.error || "Invalid Credentials"));
          return;
        }

        gameState.user.username = username;
        gameState.userEmail = email;
        gameState.role = activeRole;

        const authScreen = document.getElementById('authLoginPage');
        if (authScreen) authScreen.style.display = 'none';

        updateProfileHud();
        updateRoleView();
        
        if (activeRole === 'admin') {
          openAdminAuditModal();
        } else if (activeRole === 'staff' || activeRole === 'teacher') {
          if (teacherQbModal) teacherQbModal.classList.remove('hidden');
        } else {
          startPracticeMode();
        }
      } catch (err) {
        console.warn("Login server error, proceeding in offline mode:", err);
        const authScreen = document.getElementById('authLoginPage');
        if (authScreen) authScreen.style.display = 'none';
        updateProfileHud();
        updateRoleView();
        startPracticeMode();
      }
    });
  }

  function updateRoleView() {
    if (el.hudUserRank) {
      if (activeRole === 'student') el.hudUserRank.textContent = 'STUDENT EVALUATION';
      else if (activeRole === 'staff' || activeRole === 'teacher') el.hudUserRank.textContent = 'FACULTY TEACHER';
      else if (activeRole === 'admin') el.hudUserRank.textContent = 'SYSTEM ADMINISTRATOR';
    }
  }

  // Student AI Self-Practice Mode
  if (studentPracticeBtn) {
    studentPracticeBtn.addEventListener('click', startPracticeMode);
  }

  async function startPracticeMode() {
    isPracticeMode = true;
    isProtectedTest = false;
    enableAntiCheatProtection(false);

    if (protectedTestBanner) protectedTestBanner.classList.add('hidden');
    if (practiceAnswerBox) practiceAnswerBox.classList.remove('hidden');

    if (window.AptitudeAiEngine) {
      gameState.activeQuestions = await window.AptitudeAiEngine.generatePracticeQuestions(
        gameState.selectedTopics,
        gameState.difficulty,
        5
      );
      gameState.currentQuestionIndex = 0;
      loadPracticeQuestion(0);
    }
  }

  function loadPracticeQuestion(index) {
    if (!gameState.activeQuestions || index >= gameState.activeQuestions.length) return;
    const q = gameState.activeQuestions[index];

    if (el.questionText) el.questionText.textContent = q.question;
    if (el.qCurrentNum) el.qCurrentNum.textContent = index + 1;
    if (el.qTotalNum) el.qTotalNum.textContent = gameState.activeQuestions.length;

    if (el.optionBtns) {
      const prefixes = ['A', 'B', 'C', 'D'];
      el.optionBtns.forEach((btn, idx) => {
        btn.className = 'option-btn';
        btn.disabled = false;
        const pref = btn.querySelector('.opt-prefix');
        const txt = btn.querySelector('.opt-text');
        if (pref) pref.textContent = prefixes[idx];
        if (txt) txt.textContent = q.options[idx];
      });
    }

    if (practiceAnswerText && practiceExplanationText) {
      practiceAnswerText.textContent = q.correctAnswerDisplay || `Option ${['A','B','C','D'][q.correctIndex]}: ${q.options[q.correctIndex]}`;
      practiceExplanationText.textContent = q.explanationDisplay || q.explanation || 'Detailed step-by-step reasoning.';
    }
  }

  if (toggleAnswerVisibilityBtn) {
    toggleAnswerVisibilityBtn.addEventListener('click', () => {
      if (practiceAnswerText.style.display === 'none') {
        practiceAnswerText.style.display = 'block';
        practiceExplanationText.style.display = 'block';
        toggleAnswerVisibilityBtn.textContent = '👁️ HIDE ANSWER';
      } else {
        practiceAnswerText.style.display = 'none';
        practiceExplanationText.style.display = 'none';
        toggleAnswerVisibilityBtn.textContent = '👁️ SHOW ANSWER';
      }
    });
  }

  // Anti-Cheat Question Copy Block & Tab Switch Proctoring
  function enableAntiCheatProtection(enable) {
    if (enable) {
      document.body.classList.add('no-copy-protected');
      document.addEventListener('copy', preventCopy);
      document.addEventListener('cut', preventCopy);
      document.addEventListener('contextmenu', preventCopy);
      document.addEventListener('selectstart', preventCopy);
      document.addEventListener('keydown', preventShortcuts);
    } else {
      document.body.classList.remove('no-copy-protected');
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('contextmenu', preventCopy);
      document.removeEventListener('selectstart', preventCopy);
      document.removeEventListener('keydown', preventShortcuts);
    }
  }

  function preventCopy(e) {
    if (isProtectedTest) {
      e.preventDefault();
      return false;
    }
  }

  function preventShortcuts(e) {
    if (isProtectedTest) {
      if ((e.ctrlKey || e.metaKey) && ['c','C','a','A','u','U','p','P','s','S'].includes(e.key)) {
        e.preventDefault();
        return false;
      }
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
    }
  }

  function handleTabSwitchViolation() {
    if (!isProtectedTest || isTerminated) return;

    tabSwitchCount++;
    if (liveTabSwitchCount) liveTabSwitchCount.textContent = tabSwitchCount;

    if (tabSwitchCount === 1) {
      if (gameState.timerInterval) clearInterval(gameState.timerInterval);
      if (tabWarningModal) tabWarningModal.classList.remove('hidden');
    } else if (tabSwitchCount >= 2) {
      // 2nd Tab Switch: TERMINATE TEST IMMEDIATELY! (<2 limit)
      terminateTestForCheating("Tab Switch Limit Exceeded (Count >= 2)");
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) handleTabSwitchViolation();
  });
  window.addEventListener('blur', () => {
    handleTabSwitchViolation();
  });

  if (resumeTestBtn) {
    resumeTestBtn.addEventListener('click', () => {
      if (tabWarningModal) tabWarningModal.classList.add('hidden');
      if (gameState.timerSeconds > 0) startTimer(gameState.timerSeconds);
    });
  }

  async function terminateTestForCheating(reason) {
    isTerminated = true;
    isProtectedTest = false;
    enableAntiCheatProtection(false);

    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    if (tabWarningModal) tabWarningModal.classList.add('hidden');
    if (tabTerminatedModal) tabTerminatedModal.classList.remove('hidden');

    try {
      await fetch('/api/tests/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: activeAttemptId || 'ATT-' + Date.now(),
          testId: activeTestId || 'TEST-PROTECTED',
          testTitle: activeTestTitle || 'Protected Test',
          studentEmail: gameState.userEmail || 'scholar@example.com',
          studentName: gameState.user.username || 'Scholar',
          score: gameState.score,
          accuracy: `${Math.round((gameState.score / Math.max(1, gameState.currentQuestionIndex * 100)) * 100)}%`,
          totalQuestions: gameState.activeQuestions.length,
          tabSwitchCount: tabSwitchCount,
          violationReason: reason,
          deviceDetails: getDeviceDetails()
        })
      });
    } catch (err) {
      console.warn("Failed to report cheating termination:", err);
    }
  }

  if (exitTerminatedModalBtn) {
    exitTerminatedModalBtn.addEventListener('click', () => {
      if (tabTerminatedModal) tabTerminatedModal.classList.add('hidden');
      startPracticeMode();
    });
  }

  // Student Assigned Tests Launcher
  if (studentAssignedTestsBtn) {
    studentAssignedTestsBtn.addEventListener('click', openStudentAssignedTestsModal);
  }

  if (refreshAssignedTestsBtn) {
    refreshAssignedTestsBtn.addEventListener('click', fetchAssignedTests);
  }

  if (closeAssignedTestsModalBtn) {
    closeAssignedTestsModalBtn.addEventListener('click', () => {
      if (studentAssignedTestsModal) studentAssignedTestsModal.classList.add('hidden');
    });
  }

  async function openStudentAssignedTestsModal() {
    if (studentAssignedTestsModal) studentAssignedTestsModal.classList.remove('hidden');
    await fetchAssignedTests();
  }

  async function fetchAssignedTests() {
    if (!studentAssignedTestsList) return;
    studentAssignedTestsList.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2rem;">Loading assigned tests...</div>`;

    try {
      const response = await fetch('/api/tests/list');
      const data = await response.json();
      const tests = data.tests || [];

      studentAssignedTestsList.innerHTML = '';
      if (tests.length === 0) {
        studentAssignedTestsList.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2rem;">No tests currently assigned by teachers.</div>`;
        return;
      }

      tests.forEach(test => {
        const card = document.createElement('div');
        card.className = 'test-card';
        card.innerHTML = `
          <div>
            <div class="test-card-header">
              <span class="test-subject-tag">${test.subject || 'APTITUDE'}</span>
              <span style="font-size: 0.75rem; color: var(--accent-emerald-bright); font-weight: 700;">🔒 PROTECTED</span>
            </div>
            <div class="test-card-title">${test.title}</div>
            <div class="test-card-meta">
              Faculty: ${test.teacherName || 'Prof. Vance'} • ⏱️ ${test.durationMinutes || 10} Mins • ${test.totalQuestions || test.questions.length} Questions
            </div>
          </div>
          <button class="modal-primary-btn start-test-btn" style="padding: 0.7rem; font-size: 0.9rem;">START PROTECTED TEST ▶</button>
        `;

        card.querySelector('.start-test-btn').addEventListener('click', () => {
          if (studentAssignedTestsModal) studentAssignedTestsModal.classList.add('hidden');
          startAssignedProtectedTest(test);
        });

        studentAssignedTestsList.appendChild(card);
      });
    } catch (err) {
      studentAssignedTestsList.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 2rem;">Failed to load assigned tests. Please check connection.</div>`;
    }
  }

  async function startAssignedProtectedTest(test) {
    isPracticeMode = false;
    isProtectedTest = true;
    tabSwitchCount = 0;
    isTerminated = false;
    activeTestId = test.testId;
    activeTestTitle = test.title;

    enableAntiCheatProtection(true);

    if (practiceAnswerBox) practiceAnswerBox.classList.add('hidden');
    if (protectedTestBanner) protectedTestBanner.classList.remove('hidden');
    if (liveTabSwitchCount) liveTabSwitchCount.textContent = '0';

    gameState.activeQuestions = test.questions;
    gameState.currentQuestionIndex = 0;

    try {
      const res = await fetch('/api/tests/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: test.testId,
          studentEmail: gameState.userEmail || 'scholar@example.com',
          studentName: gameState.user.username || 'Scholar',
          deviceDetails: getDeviceDetails()
        })
      });
      const resData = await res.json();
      activeAttemptId = resData.attemptId || 'ATT-' + Date.now();
    } catch (e) {
      activeAttemptId = 'ATT-' + Date.now();
    }

    loadQuestion(0);
  }

  // Admin Audit Logs Handler
  if (adminAuditBtn) {
    adminAuditBtn.addEventListener('click', openAdminAuditModal);
  }

  if (refreshAuditBtn) {
    refreshAuditBtn.addEventListener('click', fetchAuditLogsData);
  }

  if (closeAuditModalBtn) {
    closeAuditModalBtn.addEventListener('click', () => {
      if (adminAuditModal) adminAuditModal.classList.add('hidden');
    });
  }

  const auditTabBtns = document.querySelectorAll('.audit-tab-btn');
  if (auditTabBtns) {
    auditTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        auditTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tab = btn.dataset.tab;
        if (auditLoginsView) auditLoginsView.classList.toggle('hidden', tab !== 'logins');
        if (auditTestsView) auditTestsView.classList.toggle('hidden', tab !== 'tests');
        if (auditDevicesView) auditDevicesView.classList.toggle('hidden', tab !== 'devices');
      });
    });
  }

  async function openAdminAuditModal() {
    if (adminAuditModal) adminAuditModal.classList.remove('hidden');
    await fetchAuditLogsData();
  }

  async function fetchAuditLogsData() {
    try {
      const response = await fetch('/api/admin/audit-logs');
      const data = await response.json();

      const logins = data.logins || [];
      const testAttempts = data.testAttempts || [];
      const deviceLogs = data.deviceLogs || [];

      if (auditLoginCount) auditLoginCount.textContent = logins.length;
      if (auditTestCount) auditTestCount.textContent = testAttempts.length;
      if (auditDeviceCount) auditDeviceCount.textContent = deviceLogs.length;

      // 1. Render Logins Table
      if (auditLoginsTableBody) {
        auditLoginsTableBody.innerHTML = '';
        if (logins.length === 0) {
          auditLoginsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No login records found.</td></tr>`;
        } else {
          logins.forEach(l => {
            const tr = document.createElement('tr');
            const statusClass = l.status && l.status.includes('FAILED') ? 'terminated' : 'success';
            tr.innerHTML = `
              <td><code>${l.loginId || 'LOG-100'}</code></td>
              <td style="font-weight: 700;">${l.username || 'User'}</td>
              <td>${l.email || 'N/A'}</td>
              <td style="color: var(--accent-cyan-bright); font-weight: 700;">${(l.role || 'student').toUpperCase()}</td>
              <td style="color: var(--text-muted);">${new Date(l.timestamp).toLocaleString()}</td>
              <td>${l.ip || '127.0.0.1'}</td>
              <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${l.userAgent || 'Chrome'}</td>
              <td><span class="badge-status ${statusClass}">${l.status || 'SUCCESS'}</span></td>
            `;
            auditLoginsTableBody.appendChild(tr);
          });
        }
      }

      // 2. Render Test Attempts Table
      if (auditTestsTableBody) {
        auditTestsTableBody.innerHTML = '';
        if (testAttempts.length === 0) {
          auditTestsTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No test evaluation attempt records found.</td></tr>`;
        } else {
          testAttempts.forEach(t => {
            const tr = document.createElement('tr');
            const statusClass = t.status === 'TERMINATED' ? 'terminated' : 'success';
            tr.innerHTML = `
              <td><code>${t.attemptId || 'ATT-001'}</code></td>
              <td style="font-weight: 700;">${t.testTitle || 'Aptitude Test'}</td>
              <td>${t.studentName || 'Scholar'}</td>
              <td>${t.studentEmail || 'N/A'}</td>
              <td style="color: var(--accent-emerald-bright); font-weight: 700;">${t.score || 0} pts</td>
              <td>${t.accuracy || '100%'}</td>
              <td><span class="badge-status ${statusClass}">${t.status || 'COMPLETED'}</span></td>
              <td style="text-align: center; font-weight: 700; color: ${t.tabSwitchCount >= 2 ? '#ef4444' : '#34d399'};">${t.tabSwitchCount || 0}</td>
              <td style="color: var(--text-muted);">${new Date(t.completedAt || t.terminatedAt || Date.now()).toLocaleString()}</td>
            `;
            auditTestsTableBody.appendChild(tr);
          });
        }
      }

      // 3. Render Device Specs & Cheating Alerts Table
      if (auditDevicesTableBody) {
        auditDevicesTableBody.innerHTML = '';
        if (deviceLogs.length === 0) {
          auditDevicesTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No candidate device logs found.</td></tr>`;
        } else {
          deviceLogs.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td style="font-weight: 700;">${d.studentName || 'Scholar'} (${d.studentEmail || 'N/A'})</td>
              <td>${d.testId || 'TEST-SOLO'}</td>
              <td style="color: var(--accent-cyan-bright); font-weight: 700;">${d.browser || 'Chrome'}</td>
              <td>${d.os || 'Windows'}</td>
              <td>${d.screenResolution || '1920x1080'}</td>
              <td>${d.ip || '127.0.0.1'}</td>
              <td style="text-align: center; font-weight: 800;">${d.tabSwitchCount || 0}</td>
              <td><span class="badge-status ${d.status === 'TERMINATED' ? 'terminated' : 'success'}">${d.status || 'ACTIVE SESSION'}</span></td>
            `;
            auditDevicesTableBody.appendChild(tr);
          });
        }
      }
    } catch (e) {
      console.warn("Audit logs fetch error:", e);
    }
  }

});
