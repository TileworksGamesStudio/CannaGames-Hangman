/**
 * Hangman — Unified Modern Engine & Shared Daily Release Architecture
 * Engineered for static GitHub Pages with authoritative London 00:00 release sync.
 * Rebranded with Sophisticated Cannabis Botanical Theme & Exact Asset Geometry.
 */
(function () {
  'use strict';

  // ==========================================================================
  // AUTHORITATIVE SHARED DAILY RELEASE CLOCK
  // ==========================================================================

  const SHARED_CLOCK_CONFIG = Object.freeze({
    releaseTimezone: 'Europe/London',
    releaseHour: 0,
    releaseMinute: 0,
    releaseSecond: 0,
    resyncIntervalMs: 30 * 60 * 1000,
    primaryEndpoint: window.location.href,
    fallbackTimeApi: 'https://worldtimeapi.org/api/timezone/Europe/London'
  });

  class SharedDailyClock {
    constructor(config = SHARED_CLOCK_CONFIG) {
      this.cfg = config;
      this.serverTimeAnchor = null;
      this.perfTimeAnchor = null;
      this.isSynchronized = false;
      this.lastSyncTimestamp = 0;
      this.listeners = new Set();
    }

    async synchronize() {
      // 1. Same-Origin HTTP HEAD request (Date header)
      try {
        const startPerf = performance.now();
        const response = await fetch(this.cfg.primaryEndpoint, {
          method: 'HEAD',
          cache: 'no-store'
        });

        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          const roundTripMs = performance.now() - startPerf;
          const parsedServerTime = new Date(dateHeader).getTime() + (roundTripMs / 2);
          if (!isNaN(parsedServerTime)) {
            this.setAnchor(parsedServerTime);
            return true;
          }
        }
      } catch (err) {
        // Fall through
      }

      // 2. Internet Time API Fallback
      try {
        const startPerf = performance.now();
        const res = await fetch(this.cfg.fallbackTimeApi, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const roundTripMs = performance.now() - startPerf;
          const parsedServerTime = new Date(data.utc_datetime || data.datetime).getTime() + (roundTripMs / 2);
          if (!isNaN(parsedServerTime)) {
            this.setAnchor(parsedServerTime);
            return true;
          }
        }
      } catch (err) {
        // Fall through
      }

      // 3. Monotonic Device Clock Fallback
      if (!this.serverTimeAnchor) {
        this.setAnchor(Date.now());
      }
      return false;
    }

    setAnchor(epochMs) {
      this.serverTimeAnchor = epochMs;
      this.perfTimeAnchor = performance.now();
      this.isSynchronized = true;
      this.lastSyncTimestamp = Date.now();
      this.notifyListeners();
    }

    addListener(fn) {
      this.listeners.add(fn);
    }

    notifyListeners() {
      this.listeners.forEach(fn => {
        try { fn(this); } catch (e) { console.error(e); }
      });
    }

    now() {
      if (!this.serverTimeAnchor || !this.perfTimeAnchor) {
        return new Date();
      }
      const elapsed = performance.now() - this.perfTimeAnchor;
      return new Date(this.serverTimeAnchor + elapsed);
    }

    getReleaseDateString(d = this.now()) {
      try {
        const formatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: this.cfg.releaseTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const parts = formatter.formatToParts(d);
        const year = parts.find(p => p.type === 'year').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        return `${year}-${month}-${day}`;
      } catch (e) {
        return d.toISOString().slice(0, 10);
      }
    }

    getTimeUntilNextRelease() {
      const now = this.now();
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: this.cfg.releaseTimezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      });
      const parts = formatter.formatToParts(now);
      const getVal = type => parseInt(parts.find(p => p.type === type).value, 10);

      const h = getVal('hour') % 24;
      const m = getVal('minute');
      const s = getVal('second');

      const secondsPassedToday = (h * 3600) + (m * 60) + s;
      const secondsInDay = 86400;
      let remainingSec = secondsInDay - secondsPassedToday;
      if (remainingSec <= 0) remainingSec = secondsInDay;

      return remainingSec * 1000;
    }
  }

  // ==========================================================================
  // CONFIGURATION & PERSISTENCE
  // ==========================================================================

  const CONFIG = Object.freeze({
    csvPath: './puzzles.csv',
    maxStrikes: 6,
    storageKey: 'universal_hangman_v3',
    legacyStorageKeys: ['universal_hangman_v2', 'universal_hangman_v1'],
    homeUrl: '#',
    toastDurationMs: 2200,
    revealStaggerMs: 50
  });

  const FALLBACK_PUZZLES = [
    {
      date: '2026-09-08',
      category: 'Geography',
      clue: 'The planned federal capital city of Australia.',
      answer: 'CANBERRA',
      note: 'Selected as a compromise location between rivals Sydney and Melbourne in 1908.'
    },
    {
      date: '2026-09-09',
      category: 'Science',
      clue: 'The biological process by which plants convert light into chemical energy.',
      answer: 'PHOTOSYNTHESIS',
      note: 'Produces atmospheric oxygen as a byproduct using water and carbon dioxide.'
    },
    {
      date: '2026-09-10',
      category: 'Astronomy',
      clue: 'The largest planet in our solar system.',
      answer: 'JUPITER',
      note: 'Its Great Red Spot is an ancient storm larger than Earth.'
    }
  ];

  function parseCSV(text) {
    let p = '', row = [''], ret = [row], i = 0, r = 0, s = true;
    for (let l of text) {
      if ('"' === l) {
        if (s && l === p) row[i] += l;
        s = !s;
      } else if (',' === l && s) {
        l = row[++i] = '';
      } else if ('\n' === l && s) {
        if ('\r' === p) row[i] += row[i].slice(0, -1);
        row = ret[++r] = [l = ''];
        i = 0;
      } else {
        row[i] += l;
      }
      p = l;
    }
    if (ret[ret.length - 1].length === 1 && ret[ret.length - 1][0] === '') ret.pop();
    return ret;
  }

  function getCalendarDayDifference(d1, d2) {
    try {
      const [y1, m1, day1] = d1.split('-').map(Number);
      const [y2, m2, day2] = d2.split('-').map(Number);
      const utc1 = Date.UTC(y1, m1 - 1, day1);
      const utc2 = Date.UTC(y2, m2 - 1, day2);
      return Math.round((utc1 - utc2) / 86400000);
    } catch (e) {
      return 999;
    }
  }

  class Storage {
    static load() {
      try {
        let raw = localStorage.getItem(CONFIG.storageKey);
        if (!raw) {
          for (const key of CONFIG.legacyStorageKeys) {
            raw = localStorage.getItem(key);
            if (raw) break;
          }
        }
        if (!raw) return this.defaultData();
        return this.sanitize(JSON.parse(raw));
      } catch (e) {
        return this.defaultData();
      }
    }

    static sanitize(data) {
      const def = this.defaultData();
      if (!data || typeof data !== 'object') return def;

      const stats = data.stats || {};
      const history = (data.history && typeof data.history === 'object') ? data.history : {};
      const settings = (data.settings && typeof data.settings === 'object') ? data.settings : {};

      let dist = Array.isArray(stats.distribution) ? stats.distribution.map(Number) : [];
      if (dist.length !== CONFIG.maxStrikes + 1) {
        dist = new Array(CONFIG.maxStrikes + 1).fill(0);
      }

      return {
        version: 3,
        settings: {
          bgAnimation: settings.bgAnimation !== undefined ? Boolean(settings.bgAnimation) : true
        },
        stats: {
          played: Number(stats.played) || 0,
          won: Number(stats.won) || 0,
          currentStreak: Number(stats.currentStreak) || 0,
          maxStreak: Number(stats.maxStreak) || 0,
          lastDailyWinDate: typeof stats.lastDailyWinDate === 'string' ? stats.lastDailyWinDate : null,
          flawlessWins: Number(stats.flawlessWins) || 0,
          totalStrikesInWins: Number(stats.totalStrikesInWins) || 0,
          distribution: dist
        },
        history
      };
    }

    static save(data) {
      try {
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
      } catch (e) {}
    }

    static defaultData() {
      return {
        version: 3,
        settings: {
          bgAnimation: true
        },
        stats: {
          played: 0,
          won: 0,
          currentStreak: 0,
          maxStreak: 0,
          lastDailyWinDate: null,
          flawlessWins: 0,
          totalStrikesInWins: 0,
          distribution: new Array(CONFIG.maxStrikes + 1).fill(0)
        },
        history: {}
      };
    }
  }

  // ==========================================================================
  // FLOATING BACKGROUND CANNABIS LEAF SYSTEM (EXACT PRESERVED SVG ASSET)
  // ==========================================================================

  const CANNABIS_LEAF_RAW_SVG = `<svg xmlns="http://w3.org" viewBox="0 0 512 546" width="512" height="546">
  <g fill="#2e7d32">
    <!-- Center / Main Leaf Blade -->
    <path d="M256,20 C240,100 245,180 256,260 C267,180 272,100 256,20 Z" />
    <!-- Upper Side Lobes -->
    <path d="M256,260 C210,140 140,100 80,110 C140,160 200,230 256,260 Z" />
    <path d="M256,260 C302,140 372,100 432,110 C372,160 312,230 256,260 Z" />
    <!-- Middle Side Lobes -->
    <path d="M256,260 C180,200 100,210 50,250 C110,280 180,290 256,260 Z" />
    <path d="M256,260 C332,200 412,210 462,250 C402,280 332,290 256,260 Z" />
    <!-- Lower Side Lobes -->
    <path d="M256,260 C190,270 130,310 90,360 C140,360 200,340 256,260 Z" />
    <path d="M256,260 C322,270 382,310 422,360 C372,360 312,340 256,260 Z" />
    <!-- Stem / Petiole -->
    <path d="M246,260 L246,510 L266,510 L266,260 Z" />
  </g>
</svg>`;

  class BackgroundAtmosphere {
    constructor(container, isEnabled = true) {
      this.container = container;
      this.isEnabled = isEnabled;
      this.items = [];
      this.init();
    }

    init() {
      if (!this.container) return;
      this.container.innerHTML = '';
      if (!this.isEnabled) return;

      const isMobile = window.innerWidth < 640;
      const count = isMobile ? 8 : 12;

      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'bg-floating-icon';
        el.innerHTML = CANNABIS_LEAF_RAW_SVG;

        const depth = Math.random();
        let size, opacity, duration, rotationSpeed;

        if (depth < 0.45) {
          size = Math.random() * 10 + 26;
          opacity = Math.random() * 0.05 + 0.06;
          duration = Math.random() * 12 + 28;
          rotationSpeed = Math.random() * 10 + 20;
        } else if (depth < 0.8) {
          size = Math.random() * 14 + 36;
          opacity = Math.random() * 0.06 + 0.10;
          duration = Math.random() * 10 + 22;
          rotationSpeed = Math.random() * 12 + 18;
        } else {
          size = Math.random() * 18 + 48;
          opacity = Math.random() * 0.06 + 0.14;
          duration = Math.random() * 8 + 18;
          rotationSpeed = Math.random() * 14 + 14;
        }

        const left = Math.random() * 92 + 4;
        const delay = Math.random() * duration * -1;
        const initialRotate = Math.floor(Math.random() * 360);

        el.style.left = `${left}%`;
        el.style.width = `${size}px`;
        el.style.height = `${size * 1.066}px`;
        el.style.opacity = `${opacity}`;
        el.style.setProperty('--initial-rot', `${initialRotate}deg`);
        el.style.setProperty('--rot-duration', `${rotationSpeed}s`);
        el.style.animation = `floatUpwardBotanical ${duration}s linear infinite`;
        el.style.animationDelay = `${delay}s`;

        this.container.appendChild(el);
      }
    }

    setEnabled(enabled) {
      this.isEnabled = enabled;
      this.init();
    }
  }

  // ==========================================================================
  // CONFETTI CELEBRATION
  // ==========================================================================

  class ConfettiCelebration {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas?.getContext('2d');
      this.particles = [];
      this.animId = null;
      this.resize();
      window.addEventListener('resize', () => this.resize(), { passive: true });
    }

    resize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    fire() {
      if (!this.ctx) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      this.particles = [];
      const colors = ['#687A3F', '#879652', '#B3BD85', '#D9C8A1', '#A78BC8', '#E5E5CF'];
      for (let i = 0; i < 52; i++) {
        this.particles.push({
          x: this.canvas.width / 2,
          y: this.canvas.height / 2 - 20,
          vx: (Math.random() - 0.5) * 11,
          vy: (Math.random() - 0.75) * 13,
          size: Math.random() * 6 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 8,
          opacity: 1
        });
      }

      cancelAnimationFrame(this.animId);
      this.loop();
    }

    loop() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      let alive = false;

      this.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38;
        p.vx *= 0.98;
        p.opacity -= 0.016;
        p.rotation += p.rotSpeed;

        if (p.opacity > 0) {
          alive = true;
          this.ctx.save();
          this.ctx.translate(p.x, p.y);
          this.ctx.rotate((p.rotation * Math.PI) / 180);
          this.ctx.globalAlpha = Math.max(0, p.opacity);
          this.ctx.fillStyle = p.color;
          this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          this.ctx.restore();
        }
      });

      if (alive) {
        this.animId = requestAnimationFrame(() => this.loop());
      } else {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  // ==========================================================================
  // HANGMAN MASTER GAME CONTROLLER
  // ==========================================================================

  class HangmanGame {
    constructor() {
      this.clock = new SharedDailyClock();
      this.store = Storage.load();
      this.puzzles = [];
      this.todayPuzzle = null;
      this.archivePuzzles = [];
      this.activePuzzle = null;
      this.guessedLetters = new Set();
      this.strikes = 0;
      this.isGameOver = false;
      this.isReviewMode = false;
      this.isClueVisible = true;
      this.navigationSource = 'menu';
      this.lastFocusedElement = null;
      this.countdownInterval = null;

      this.cacheDom();
      this.atmosphere = new BackgroundAtmosphere(
        this.dom.bgIconsContainer,
        this.store.settings.bgAnimation
      );
      this.confetti = new ConfettiCelebration(this.dom.confettiCanvas);

      this.initEvents();
      this.initHistoryRouting();
      this.initVisibilityAndResync();
    }

    cacheDom() {
      this.dom = {
        menuScreen: document.getElementById('menu-screen'),
        vaultScreen: document.getElementById('vault-screen'),
        gameScreen: document.getElementById('game-screen'),
        confettiCanvas: document.getElementById('confetti-canvas'),
        bgIconsContainer: document.getElementById('bg-icons-container'),
        navHomeBtn: document.getElementById('nav-home-btn'),
        clockSyncIndicator: document.getElementById('clock-sync-indicator'),
        menuPlayBtn: document.getElementById('menu-play-btn'),
        playBtnLabel: document.getElementById('play-btn-label'),
        playBtnSub: document.getElementById('play-btn-sub'),
        playBtnStatus: document.getElementById('play-btn-status'),
        menuVaultBtn: document.getElementById('menu-vault-btn'),
        vaultCountBadge: document.getElementById('vault-count-badge'),
        menuSettingsBtn: document.getElementById('menu-settings-btn'),
        menuRulesBtn: document.getElementById('menu-rules-btn'),
        menuStatsBtn: document.getElementById('menu-stats-btn'),
        menuShareBtn: document.getElementById('menu-share-btn'),
        menuPlusBtn: document.getElementById('menu-plus-btn'),
        rulesOverlay: document.getElementById('rules-overlay'),
        rulesPanel: document.getElementById('rules-panel'),
        rulesPanelClose: document.getElementById('rules-panel-close'),
        settingsModal: document.getElementById('settings-modal'),
        settingAnimationToggle: document.getElementById('setting-animation-toggle'),
        vaultBackBtn: document.getElementById('vault-back-btn'),
        vaultList: document.getElementById('vault-list'),
        gameBackBtn: document.getElementById('game-back-btn'),
        gameSummaryBtn: document.getElementById('game-summary-btn'),
        reviewBanner: document.getElementById('review-banner'),
        reviewStatusText: document.getElementById('review-status-text'),
        gameToast: document.getElementById('game-toast'),
        puzzleTitle: document.getElementById('puzzle-title'),
        apparatusSection: document.getElementById('apparatus-section'),
        strikeCountText: document.getElementById('strike-count-text'),
        strikePips: document.getElementById('strike-pips'),
        wordBoard: document.getElementById('word-board'),
        gameCategoryTag: document.getElementById('game-category-tag'),
        clueToggleBtn: document.getElementById('clue-toggle-btn'),
        gameClueText: document.getElementById('game-clue-text'),
        keyboard: document.getElementById('keyboard'),
        statsModal: document.getElementById('stats-modal'),
        resultModal: document.getElementById('result-modal'),
        statPlayed: document.getElementById('stat-played'),
        statWinRate: document.getElementById('stat-win-rate'),
        statStreak: document.getElementById('stat-streak'),
        statMaxStreak: document.getElementById('stat-max-streak'),
        statFlawless: document.getElementById('stat-flawless'),
        statAvgStrikes: document.getElementById('stat-avg-strikes'),
        strikeDistributionBars: document.getElementById('strike-distribution-bars'),
        resultStatusBadge: document.getElementById('result-status-badge'),
        resultAnswer: document.getElementById('result-answer'),
        resultNote: document.getElementById('result-note'),
        resultCountdownBox: document.getElementById('result-countdown-box'),
        resultCountdownTimer: document.getElementById('result-countdown-timer'),
        resultShareBtn: document.getElementById('result-share-btn'),
        resultMenuBtn: document.getElementById('result-menu-btn'),
        shareToast: document.getElementById('share-toast'),
        announcer: document.getElementById('screen-reader-feed')
      };

      if (this.dom.settingAnimationToggle) {
        this.dom.settingAnimationToggle.checked = this.store.settings.bgAnimation;
      }

      this.dom.navHomeBtn.setAttribute('href', CONFIG.homeUrl);
      this.dom.navHomeBtn.onclick = (e) => {
        if (CONFIG.homeUrl === '#') {
          e.preventDefault();
          this.showGameToast('Portal hub placeholder active');
        }
      };
    }

    async init() {
      await this.clock.synchronize();
      this.updateClockIndicator();

      try {
        const res = await fetch(CONFIG.csvPath);
        if (!res.ok) throw new Error(`HTTP status: ${res.status}`);
        const csvText = await res.text();
        this.processPuzzles(csvText);
      } catch (err) {
        this.puzzles = FALLBACK_PUZZLES;
        this.partitionPuzzles();
        this.renderMenu();
      }

      this.startCountdownLoop();
    }

    updateClockIndicator() {
      if (!this.dom.clockSyncIndicator) return;
      if (this.clock.isSynchronized) {
        this.dom.clockSyncIndicator.textContent = '● London Live';
        this.dom.clockSyncIndicator.style.color = 'var(--color-highlight)';
      } else {
        this.dom.clockSyncIndicator.textContent = '○ Device Clock';
        this.dom.clockSyncIndicator.style.color = 'var(--color-secondary)';
      }
    }

    processPuzzles(csvText) {
      const rows = parseCSV(csvText);
      if (rows.length < 2) {
        this.puzzles = FALLBACK_PUZZLES;
      } else {
        const headers = rows[0].map(h => h.trim().toLowerCase());
        this.puzzles = [];
        const seenDates = new Set();

        for (let i = 1; i < rows.length; i++) {
          if (rows[i].length !== headers.length) continue;
          const item = {};
          headers.forEach((h, idx) => item[h] = rows[i][idx].trim());

          if (!item.date || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) continue;
          if (seenDates.has(item.date)) continue;
          if (!item.answer || item.answer.trim().length === 0) continue;

          item.answer = item.answer
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();

          item.category = (item.category || 'General').trim();
          item.clue = (item.clue || '').trim();
          item.note = (item.note || '').trim();

          seenDates.add(item.date);
          this.puzzles.push(item);
        }
      }

      if (this.puzzles.length === 0) {
        this.puzzles = FALLBACK_PUZZLES;
      }

      this.partitionPuzzles();
      this.renderMenu();
    }

    partitionPuzzles() {
      const canonicalDate = this.clock.getReleaseDateString();
      this.todayPuzzle = this.puzzles.find(p => p.date === canonicalDate) || null;

      if (!this.todayPuzzle && this.puzzles.length > 0) {
        const epoch = new Date(2025, 0, 1);
        const now = this.clock.now();
        const diffDays = Math.max(0, Math.floor((now - epoch) / 86400000));
        const fallbackIndex = diffDays % this.puzzles.length;
        this.todayPuzzle = { ...this.puzzles[fallbackIndex], date: canonicalDate };
      }

      this.archivePuzzles = this.puzzles
        .filter(p => p.date < canonicalDate)
        .sort((a, b) => b.date.localeCompare(a.date));

      this.dom.vaultCountBadge.textContent = `${this.archivePuzzles.length} Available`;
    }

    showScreen(target, push = true) {
      const activeScreens = [this.dom.menuScreen, this.dom.vaultScreen, this.dom.gameScreen];
      activeScreens.forEach(s => s.classList.remove('screen-active'));
      target.classList.add('screen-active');
      window.scrollTo(0, 0);

      if (push && window.history && target.id) {
        window.history.pushState({ screenId: target.id }, '', `#${target.id.replace('-screen', '')}`);
      }
    }

    initHistoryRouting() {
      window.addEventListener('popstate', (e) => {
        if (this.dom.rulesOverlay.classList.contains('panel-open')) {
          this.closeRulesPanel();
          return;
        }
        if (document.querySelector('dialog[open]')) {
          this.closeAllDialogs();
          return;
        }

        const screenId = e.state?.screenId;
        if (screenId && this.dom[screenId]) {
          this.showScreen(this.dom[screenId], false);
        } else {
          this.showScreen(this.dom.menuScreen, false);
        }
      });
    }

    renderMenu() {
      this.showScreen(this.dom.menuScreen, false);
      const p = this.todayPuzzle;
      if (!p) return;

      const rec = this.store.history[p.date];
      this.dom.playBtnSub.textContent = `Category: ${p.category}`;

      if (rec && rec.completed) {
        this.dom.playBtnLabel.textContent = 'Review Puzzle';
        this.dom.playBtnStatus.textContent = rec.won ? '✓ Solved' : '✕ Complete';
        this.dom.playBtnStatus.className = `status-badge ${rec.won ? 'badge-ready' : 'badge-done'}`;
      } else if (rec && rec.guesses && rec.guesses.length > 0) {
        this.dom.playBtnLabel.textContent = 'Resume Puzzle';
        this.dom.playBtnStatus.textContent = '● In Progress';
        this.dom.playBtnStatus.className = 'status-badge badge-progress';
      } else {
        this.dom.playBtnLabel.textContent = 'Play Daily';
        this.dom.playBtnStatus.textContent = 'Ready';
        this.dom.playBtnStatus.className = 'status-badge badge-ready';
      }
    }

    loadPuzzle(puzzle, source = 'menu') {
      const canonicalDate = this.clock.getReleaseDateString();
      if (puzzle.date > canonicalDate) {
        this.showGameToast('Puzzle locked until release date');
        return;
      }

      this.activePuzzle = puzzle;
      this.navigationSource = source;
      this.guessedLetters.clear();
      this.strikes = 0;
      this.isGameOver = false;
      this.isReviewMode = false;
      this.isClueVisible = true;

      this.dom.gameBackBtn.textContent = source === 'vault' ? '← Vault' : '← Menu';
      this.dom.gameBackBtn.setAttribute('aria-label', source === 'vault' ? 'Back to Vault Archive' : 'Back to Main Menu');

      const isDaily = puzzle.date === canonicalDate;
      this.dom.puzzleTitle.textContent = isDaily ? `Daily • ${puzzle.date}` : `Vault • ${puzzle.date}`;
      this.dom.gameCategoryTag.textContent = puzzle.category || 'Category';
      this.dom.gameClueText.textContent = puzzle.clue || '';
      this.dom.clueToggleBtn.style.display = puzzle.clue ? 'inline-flex' : 'none';

      const rec = this.store.history[puzzle.date];
      if (rec) {
        (rec.guesses || []).forEach(l => this.guessedLetters.add(l));
        this.strikes = Math.min(rec.strikes || 0, CONFIG.maxStrikes);
        this.isGameOver = rec.completed || false;
        this.isReviewMode = rec.completed || false;
      }

      this.renderApparatus();
      this.renderBoard();
      this.renderKeyboard();

      if (this.isReviewMode) {
        this.dom.reviewBanner.style.display = 'block';
        this.dom.reviewStatusText.textContent = rec.won ? '✓ Solved (Review Mode)' : '✕ Complete (Review Mode)';
        this.dom.gameSummaryBtn.classList.remove('btn-summary-hidden');
      } else {
        this.dom.reviewBanner.style.display = 'none';
        this.dom.gameSummaryBtn.classList.add('btn-summary-hidden');

        if (rec && rec.guesses && rec.guesses.length > 0 && !rec.completed) {
          this.showGameToast(`Resumed • ${this.strikes} strike${this.strikes === 1 ? '' : 's'}`);
        }
      }

      this.showScreen(this.dom.gameScreen);
      this.announceBoardState();
    }

    renderApparatus() {
      for (let i = 1; i <= CONFIG.maxStrikes; i++) {
        const part = document.getElementById(`strike-${i}`);
        if (part) part.classList.toggle('active', i <= this.strikes);
      }
      this.dom.strikeCountText.textContent = `${this.strikes} / ${CONFIG.maxStrikes}`;

      this.dom.strikePips.innerHTML = '';
      for (let i = 1; i <= CONFIG.maxStrikes; i++) {
        const pip = document.createElement('div');
        const isStruck = i <= this.strikes;
        pip.className = `strike-pip ${isStruck ? 'pip-struck' : ''}`;
        pip.setAttribute('aria-label', `Strike ${i}: ${isStruck ? 'Struck' : 'Clean'}`);
        pip.textContent = isStruck ? '✕' : '';
        this.dom.strikePips.appendChild(pip);
      }
    }

    renderBoard(staggerChar = null) {
      this.dom.wordBoard.innerHTML = '';
      const phrase = (this.activePuzzle.answer || '').toUpperCase();
      const words = phrase.split(' ');

      let globalSlotIndex = 0;
      words.forEach((word, wIdx) => {
        const group = document.createElement('div');
        group.className = 'word-group';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', `Word ${wIdx + 1} of ${words.length}`);

        for (let cIdx = 0; cIdx < word.length; cIdx++) {
          const char = word[cIdx];
          const slot = document.createElement('div');
          slot.className = 'letter-slot';

          if (/^[A-Z]$/.test(char)) {
            const isGuessed = this.guessedLetters.has(char);
            const showMissed = this.isGameOver && !isGuessed;

            if (isGuessed || showMissed) {
              slot.textContent = char;
              slot.classList.add('revealed');
              if (showMissed) slot.classList.add('missed');

              if (char === staggerChar) {
                slot.classList.add('pop-in');
                slot.style.animationDelay = `${globalSlotIndex * CONFIG.revealStaggerMs}ms`;
              }

              slot.setAttribute('aria-label', `Letter ${cIdx + 1}: ${char}`);
            } else {
              slot.textContent = '';
              slot.setAttribute('aria-label', `Letter ${cIdx + 1}: Blank`);
            }
          } else {
            slot.textContent = char;
            slot.classList.add('punctuation');
            slot.setAttribute('aria-label', `Symbol: ${char}`);
          }

          group.appendChild(slot);
          globalSlotIndex++;
        }
        this.dom.wordBoard.appendChild(group);
      });
    }

    announceBoardState() {
      if (!this.activePuzzle) return;
      const phrase = (this.activePuzzle.answer || '').toUpperCase();
      const words = phrase.split(' ');
      const lettersCount = phrase.replace(/[^A-Z]/g, '').length;
      this.announce(`Puzzle loaded. Category: ${this.activePuzzle.category}. ${words.length} word${words.length === 1 ? '' : 's'}, ${lettersCount} letters total.`);
    }

    renderKeyboard() {
      this.dom.keyboard.innerHTML = '';
      const rows = [
        ['Q','W','E','R','T','Y','U','I','O','P'],
        ['A','S','D','F','G','H','J','K','L'],
        ['Z','X','C','V','B','N','M']
      ];
      const answer = (this.activePuzzle.answer || '').toUpperCase();

      rows.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';

        row.forEach(letter => {
          const btn = document.createElement('button');
          btn.className = 'key-btn';
          btn.textContent = letter;
          btn.setAttribute('data-key', letter);
          btn.setAttribute('aria-label', `Letter ${letter}`);

          if (this.guessedLetters.has(letter)) {
            btn.disabled = true;
            btn.classList.add(answer.includes(letter) ? 'key-correct' : 'key-wrong');
          }

          btn.onclick = () => this.handleGuess(letter);
          rowDiv.appendChild(btn);
        });

        this.dom.keyboard.appendChild(rowDiv);
      });
    }

    handleGuess(letter) {
      if (this.isGameOver || this.guessedLetters.has(letter)) return;
      this.guessedLetters.add(letter);

      const answer = (this.activePuzzle.answer || '').toUpperCase();
      const isCorrect = answer.includes(letter);

      if (!isCorrect) {
        this.strikes++;
        this.triggerStrikeImpact();
        this.announce(`Incorrect. Letter ${letter} is not in the puzzle.`);
      } else {
        this.announce(`Correct. Letter ${letter} revealed.`);
      }

      this.renderApparatus();
      this.renderBoard(isCorrect ? letter : null);

      const btn = this.dom.keyboard.querySelector(`button[data-key="${letter}"]`);
      if (btn) {
        btn.disabled = true;
        btn.classList.add(isCorrect ? 'key-correct' : 'key-wrong');
      }

      this.checkGameState();
      this.saveProgress();
    }

    triggerStrikeImpact() {
      this.dom.apparatusSection.classList.remove('shake');
      void this.dom.apparatusSection.offsetWidth;
      this.dom.apparatusSection.classList.add('shake');

      if (navigator.vibrate) {
        try { navigator.vibrate(40); } catch (e) {}
      }
    }

    checkGameState() {
      const cleanLetters = (this.activePuzzle.answer || '')
        .toUpperCase()
        .replace(/[^A-Z]/g, '');

      const won = cleanLetters.split('').every(l => this.guessedLetters.has(l));

      if (won) {
        this.endGame(true);
      } else if (this.strikes >= CONFIG.maxStrikes) {
        this.endGame(false);
      }
    }

    endGame(won) {
      this.isGameOver = true;
      this.saveProgress(true, won);

      const canonicalDate = this.clock.getReleaseDateString();
      const isDaily = this.activePuzzle.date === canonicalDate;
      const s = this.store.stats;
      s.played++;

      if (won) {
        s.won++;
        if (this.strikes === 0) s.flawlessWins++;
        s.totalStrikesInWins += this.strikes;

        if (isDaily) {
          if (!s.lastDailyWinDate) {
            s.currentStreak = 1;
          } else {
            const daysDiff = getCalendarDayDifference(canonicalDate, s.lastDailyWinDate);
            if (daysDiff === 1) {
              s.currentStreak++;
            } else if (daysDiff === 0) {
              // Re-solve on same day
            } else {
              s.currentStreak = 1;
            }
          }
          s.lastDailyWinDate = canonicalDate;
          s.maxStreak = Math.max(s.maxStreak, s.currentStreak);
        }

        if (s.distribution[this.strikes] !== undefined) {
          s.distribution[this.strikes]++;
        }
      } else {
        if (isDaily) {
          s.currentStreak = 0;
        }
        if (s.distribution[CONFIG.maxStrikes] !== undefined) {
          s.distribution[CONFIG.maxStrikes]++;
        }
      }
      Storage.save(this.store);

      this.renderBoard();

      if (won) {
        const slots = this.dom.wordBoard.querySelectorAll('.letter-slot');
        slots.forEach((slot, idx) => {
          setTimeout(() => slot.classList.add('celebrate'), idx * 35);
        });
        this.confetti.fire();

        if (navigator.vibrate) {
          try { navigator.vibrate([40, 50, 40, 70]); } catch (e) {}
        }
        setTimeout(() => this.showResult(true), 1100);
      } else {
        setTimeout(() => this.showResult(false), 500);
      }
    }

    saveProgress(completed = false, won = false) {
      const dateKey = this.activePuzzle.date;
      const prev = this.store.history[dateKey] || {};
      this.store.history[dateKey] = {
        completed: completed || prev.completed || false,
        won: completed ? won : (prev.won || false),
        strikes: this.strikes,
        guesses: Array.from(this.guessedLetters)
      };
      Storage.save(this.store);
    }

    showResult(won) {
      this.dom.resultStatusBadge.textContent = won ? '✓ Solved' : '✕ Complete';
      this.dom.resultStatusBadge.className = `result-banner ${won ? 'banner-win' : 'banner-loss'}`;
      this.dom.resultAnswer.textContent = (this.activePuzzle.answer || '').toUpperCase();
      this.dom.resultNote.textContent = this.activePuzzle.note || '';

      const canonicalDate = this.clock.getReleaseDateString();
      const isDaily = this.activePuzzle.date === canonicalDate;
      this.dom.resultCountdownBox.style.display = isDaily ? 'block' : 'none';

      this.openDialog(this.dom.resultModal);
    }

    renderVault() {
      this.dom.vaultList.innerHTML = '';

      if (this.archivePuzzles.length === 0) {
        this.dom.vaultList.innerHTML = '<p class="empty-state">No archive puzzles released yet.</p>';
      } else {
        this.archivePuzzles.forEach(p => {
          const rec = this.store.history[p.date];
          const item = document.createElement('div');
          item.className = 'vault-item';
          item.setAttribute('tabindex', '0');
          item.setAttribute('role', 'button');
          item.setAttribute('aria-label', `Puzzle from ${p.date}, Category: ${p.category}`);

          let statusTag = 'Unplayed';
          let tagClass = 'status-badge';
          if (rec && rec.completed) {
            statusTag = rec.won ? '✓ Solved' : '✕ Complete';
            tagClass = `status-badge ${rec.won ? 'badge-ready' : 'badge-done'}`;
          } else if (rec && rec.guesses && rec.guesses.length > 0) {
            statusTag = '● In Progress';
            tagClass = 'status-badge badge-progress';
          }

          item.innerHTML = `
            <div class="vault-meta">
              <span class="vault-date">${p.date}</span>
              <span class="vault-category">${p.category}</span>
            </div>
            <div class="vault-actions">
              <span class="${tagClass}">${statusTag}</span>
              <button class="btn btn-secondary btn-nav-back" tabindex="-1">
                ${rec?.completed ? 'Review' : 'Play'}
              </button>
            </div>
          `;

          const launch = () => this.loadPuzzle(p, 'vault');
          item.onclick = launch;
          item.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              launch();
            }
          };

          this.dom.vaultList.appendChild(item);
        });
      }

      this.showScreen(this.dom.vaultScreen);
    }

    openStats() {
      const s = this.store.stats;
      this.dom.statPlayed.textContent = s.played;
      this.dom.statWinRate.textContent = `${s.played ? Math.round((s.won / s.played) * 100) : 0}%`;
      this.dom.statStreak.textContent = s.currentStreak;
      this.dom.statMaxStreak.textContent = s.maxStreak;
      this.dom.statFlawless.textContent = s.flawlessWins;

      const avgStrikes = s.won > 0 ? (s.totalStrikesInWins / s.won).toFixed(1) : '0.0';
      this.dom.statAvgStrikes.textContent = avgStrikes;

      this.dom.strikeDistributionBars.innerHTML = '';
      const maxVal = Math.max(...s.distribution, 1);

      for (let i = 0; i <= CONFIG.maxStrikes; i++) {
        const row = document.createElement('div');
        row.className = 'dist-bar-row';
        const val = s.distribution[i] || 0;
        const pct = Math.max(Math.round((val / maxVal) * 100), val > 0 ? 5 : 0);
        const label = i === CONFIG.maxStrikes ? '✕' : `${i}`;

        row.innerHTML = `
          <span style="width: 14px; text-align: center;">${label}</span>
          <div class="dist-bar-track">
            <div class="dist-bar-fill" style="width: ${pct}%;"></div>
          </div>
          <span style="width: 24px; text-align: right;">${val}</span>
        `;
        this.dom.strikeDistributionBars.appendChild(row);
      }

      this.openDialog(this.dom.statsModal);
    }

    async shareResult() {
      const puzzle = this.activePuzzle || this.todayPuzzle;
      if (!puzzle) return;

      const rec = this.store.history[puzzle.date];
      const strikesCount = rec?.strikes || 0;
      const outcome = rec?.won
        ? `Solved (${strikesCount}/${CONFIG.maxStrikes})`
        : `Complete (${CONFIG.maxStrikes}/${CONFIG.maxStrikes})`;

      const strikePattern = Array.from({ length: CONFIG.maxStrikes })
        .map((_, i) => (i < strikesCount ? '🟥' : '🟩'))
        .join('');

      const shareText = `Hangman • ${puzzle.date}\n${outcome}\n${strikePattern}\n${window.location.href.split('#')[0]}`;

      if (navigator.share) {
        try {
          await navigator.share({ title: 'Hangman Daily Challenge', text: shareText });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(shareText);
          if (this.dom.shareToast) {
            this.dom.shareToast.classList.add('show');
            setTimeout(() => this.dom.shareToast.classList.remove('show'), CONFIG.toastDurationMs);
          }
          this.showGameToast('Results copied to clipboard!');
          return;
        } catch (e) {}
      }

      prompt('Copy result score:', shareText);
    }

    showGameToast(msg) {
      if (!this.dom.gameToast) return;
      this.dom.gameToast.textContent = msg;
      this.dom.gameToast.classList.add('show');
      setTimeout(() => this.dom.gameToast.classList.remove('show'), CONFIG.toastDurationMs);
    }

    openRulesPanel() {
      this.lastFocusedElement = document.activeElement;
      this.dom.rulesOverlay.setAttribute('aria-hidden', 'false');
      this.dom.rulesOverlay.classList.add('panel-open');
      this.dom.rulesPanelClose.focus();
    }

    closeRulesPanel() {
      this.dom.rulesOverlay.classList.remove('panel-open');
      this.dom.rulesOverlay.setAttribute('aria-hidden', 'true');
      if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
        this.lastFocusedElement.focus();
      }
    }

    startCountdownLoop() {
      const update = () => {
        const diffMs = this.clock.getTimeUntilNextRelease();

        const h = String(Math.floor(diffMs / 3600000)).padStart(2, '0');
        const m = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, '0');
        const s = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, '0');

        const str = `${h}:${m}:${s}`;
        if (this.dom.resultCountdownTimer) this.dom.resultCountdownTimer.textContent = str;

        if (diffMs <= 1000) {
          setTimeout(() => {
            this.partitionPuzzles();
            if (this.dom.menuScreen.classList.contains('screen-active')) {
              this.renderMenu();
            }
          }, 1500);
        }
      };

      update();
      this.countdownInterval = setInterval(update, 1000);
    }

    initVisibilityAndResync() {
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
          const elapsed = Date.now() - this.clock.lastSyncTimestamp;
          if (elapsed > SHARED_CLOCK_CONFIG.resyncIntervalMs) {
            await this.clock.synchronize();
            this.updateClockIndicator();
            this.partitionPuzzles();
            if (this.dom.menuScreen.classList.contains('screen-active')) {
              this.renderMenu();
            }
          }
        }
      });

      window.addEventListener('online', async () => {
        await this.clock.synchronize();
        this.updateClockIndicator();
      });
    }

    announce(msg) {
      if (this.dom.announcer) {
        this.dom.announcer.textContent = msg;
      }
    }

    openDialog(dialog) {
      this.lastFocusedElement = document.activeElement;
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', 'true');
      }
      const closeBtn = dialog.querySelector('.modal-close');
      if (closeBtn) closeBtn.focus();
    }

    closeDialog(dialog) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
      if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
        this.lastFocusedElement.focus();
      }
    }

    closeAllDialogs() {
      document.querySelectorAll('dialog[open]').forEach(d => this.closeDialog(d));
    }

    initEvents() {
      this.dom.menuPlayBtn.onclick = () => {
        if (this.todayPuzzle) this.loadPuzzle(this.todayPuzzle, 'menu');
      };

      this.dom.menuVaultBtn.onclick = () => this.renderVault();

      this.dom.menuSettingsBtn.onclick = () => this.openDialog(this.dom.settingsModal);
      this.dom.settingAnimationToggle.onchange = (e) => {
        const enabled = e.target.checked;
        this.store.settings.bgAnimation = enabled;
        Storage.save(this.store);
        this.atmosphere.setEnabled(enabled);
      };

      this.dom.menuRulesBtn.onclick = () => this.openRulesPanel();
      this.dom.rulesPanelClose.onclick = () => this.closeRulesPanel();
      this.dom.rulesOverlay.onclick = (e) => {
        if (e.target === this.dom.rulesOverlay) this.closeRulesPanel();
      };

      this.dom.menuStatsBtn.onclick = () => this.openStats();
      this.dom.menuShareBtn.onclick = () => this.shareResult();
      this.dom.menuPlusBtn.onclick = () => {
        this.showGameToast('Tileworks Hub placeholder active');
      };

      this.dom.vaultBackBtn.onclick = () => this.renderMenu();
      this.dom.gameBackBtn.onclick = () => {
        if (this.navigationSource === 'vault') {
          this.renderVault();
        } else {
          this.renderMenu();
        }
      };

      this.dom.gameSummaryBtn.onclick = () => {
        const rec = this.store.history[this.activePuzzle.date];
        this.showResult(rec?.won || false);
      };

      this.dom.clueToggleBtn.onclick = () => {
        this.isClueVisible = !this.isClueVisible;
        this.dom.gameClueText.style.display = this.isClueVisible ? 'block' : 'none';
        this.dom.clueToggleBtn.innerHTML = this.isClueVisible
          ? '<span class="hint-icon" aria-hidden="true">💡</span> Hide'
          : '<span class="hint-icon" aria-hidden="true">💡</span> Hint';
      };

      this.dom.resultMenuBtn.onclick = () => {
        this.closeDialog(this.dom.resultModal);
        if (this.navigationSource === 'vault') {
          this.renderVault();
        } else {
          this.renderMenu();
        }
      };
      this.dom.resultShareBtn.onclick = () => this.shareResult();

      document.querySelectorAll('[data-close]').forEach(btn => {
        btn.onclick = (e) => this.closeDialog(e.target.closest('dialog'));
      });

      document.querySelectorAll('dialog').forEach(d => {
        d.onclick = (e) => {
          if (e.target === d) this.closeDialog(d);
        };
      });

      window.addEventListener('keydown', e => {
        if (this.dom.rulesOverlay.classList.contains('panel-open')) {
          if (e.key === 'Escape') this.closeRulesPanel();
          return;
        }

        if (document.querySelector('dialog[open]')) return;
        if (!this.dom.gameScreen.classList.contains('screen-active')) return;

        const key = e.key.toUpperCase();
        if (/^[A-Z]$/.test(key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const btn = this.dom.keyboard.querySelector(`button[data-key="${key}"]`);
          if (btn && !btn.disabled) {
            btn.classList.add('key-pressed');
            setTimeout(() => btn.classList.remove('key-pressed'), 110);
          }
          this.handleGuess(key);
        }
      });
    }
  }

  window.SharedDailyClock = SharedDailyClock;

  document.addEventListener('DOMContentLoaded', () => {
    new HangmanGame().init();
  });
})();