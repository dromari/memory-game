const ANIMAL_IMAGES = [
  "assets/deer.jpg",
  "assets/fox.jpg",
  "assets/koala.jpg",
  "assets/owl.jpg",
  "assets/panda.jpg",
  "assets/penguin.jpg",
  "assets/raccoon.jpg",
  "assets/tiger.jpg",
];

const TOTAL_PAIRS = 8;
const FLIP_DELAY_MS = 1000;
const LEADERBOARD_KEY = "memoryGameLeaderboard";
const LEADERBOARD_MAX_SIZE = 10;

const state = {
  moves: 0,
  matchedPairs: 0,
  flippedCards: [],
  isBoardLocked: false,
  isGameFinished: false,
  pendingTimeoutId: null,
  boardElement: null,
  movesElement: null,
  pairsElement: null,
};

const activeModals = [];

function createElement(tag, options = {}) {
  const element = document.createElement(tag);

  if (options.className) {
    options.className
      .split(" ")
      .filter(Boolean)
      .forEach((className) => element.classList.add(className));
  }

  if (options.text !== undefined) {
    element.textContent = options.text;
  }

  if (options.ariaLabel) {
    element.setAttribute("aria-label", options.ariaLabel);
  }

  return element;
}

function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function updateCounters() {
  state.movesElement.textContent = String(state.moves);
  state.pairsElement.textContent = `${state.matchedPairs} / ${TOTAL_PAIRS}`;
}

function createCardElement(imagePath, index) {
  const card = createElement("div", {
    className: "card",
    ariaLabel: "Карточка",
  });
  card.dataset.image = imagePath;
  card.dataset.index = String(index);

  const inner = createElement("div", { className: "card-inner" });
  const front = createElement("div", { className: "card-face card-front" });
  const img = createElement("img", { className: "card-image" });
  img.src = imagePath;
  img.alt = "Животное";
  img.style.userSelect = "none";
  img.setAttribute("draggable", "false");
  front.append(img);

  const back = createElement("div", { className: "card-face card-back" });

  inner.append(front, back);
  card.append(inner);

  card.addEventListener("click", () => handleCardClick(card));

  return card;
}

function renderBoard() {
  clearElement(state.boardElement);
  const deck = shuffle([...ANIMAL_IMAGES, ...ANIMAL_IMAGES]);

  deck.forEach((imagePath, index) => {
    const card = createCardElement(imagePath, index);
    state.boardElement.append(card);
  });
}

function handleCardClick(card) {
  if (state.isBoardLocked) return;
  if (state.isGameFinished) return;
  if (card.classList.contains("flipped") || card.classList.contains("matched"))
    return;

  card.classList.add("flipped");
  state.flippedCards.push(card);

  if (state.flippedCards.length === 2) {
    state.moves += 1;
    updateCounters();
    state.isBoardLocked = true;
    setTimeout(() => {
      checkMatch();
    }, 550);
  }
}

function checkMatch() {
  const [firstCard, secondCard] = state.flippedCards;
  const isMatch = firstCard.dataset.image === secondCard.dataset.image;

  if (isMatch) {
    firstCard.classList.add("matched");
    secondCard.classList.add("matched");
    state.matchedPairs += 1;
    state.flippedCards = [];
    state.isBoardLocked = false;
    updateCounters();

    if (state.matchedPairs === TOTAL_PAIRS) {
      state.isGameFinished = true;
      saveResult(state.moves);
      setTimeout(() => showWinModal(state.moves), 300);
    }
  } else {
    state.pendingTimeoutId = setTimeout(() => {
      firstCard.classList.remove("flipped");
      secondCard.classList.remove("flipped");
      state.flippedCards = [];
      state.isBoardLocked = false;
      state.pendingTimeoutId = null;
    }, FLIP_DELAY_MS);
  }
}

function resetGame() {
  clearTimeout(state.pendingTimeoutId);
  state.pendingTimeoutId = null;

  closeAllModals();

  state.moves = 0;
  state.matchedPairs = 0;
  state.flippedCards = [];
  state.isBoardLocked = false;
  state.isGameFinished = false;

  updateCounters();
  renderBoard();
}

function saveResult(moves) {
  const stored = localStorage.getItem(LEADERBOARD_KEY);
  const results = stored ? JSON.parse(stored) : [];
  const now = new Date();

  results.push({
    moves,
    date: formatDate(now),
    timestamp: now.getTime(),
  });

  results.sort((a, b) => {
    if (a.moves !== b.moves) {
      return a.moves - b.moves;
    }
    return a.timestamp - b.timestamp;
  });

  const topResults = results.slice(0, LEADERBOARD_MAX_SIZE);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(topResults));
}

function getLeaderboard() {
  const stored = localStorage.getItem(LEADERBOARD_KEY);
  return stored ? JSON.parse(stored) : [];
}

class Modal {
  constructor({ title, buildContent, actions }) {
    this.overlay = createElement("div", { className: "modal-overlay" });
    this.modal = createElement("div", { className: "modal" });

    this.header = createElement("div", { className: "modal-header" });
    this.titleElement = createElement("h2", {
      className: "modal-title",
      text: title,
    });
    this.closeButton = createElement("button", {
      className: "modal-close",
      ariaLabel: "Закрыть",
      text: "×",
    });
    this.header.append(this.titleElement, this.closeButton);

    this.content = createElement("div", { className: "modal-content" });
    if (typeof buildContent === "function") {
      buildContent(this.content);
    }

    this.footer = createElement("div", { className: "modal-footer" });
    actions.forEach((action) => {
      const button = createElement("button", {
        className: `btn ${action.className || ""}`,
        text: action.text,
      });
      button.addEventListener("click", () => {
        if (typeof action.handler === "function") {
          action.handler();
        }
        if (action.close !== false) {
          this.close();
        }
      });
      this.footer.append(button);
    });

    this.modal.append(this.header, this.content, this.footer);
    this.overlay.append(this.modal);

    this.closeButton.addEventListener("click", () => this.close());
    this.overlay.addEventListener("click", (event) =>
      this.handleOverlayClick(event),
    );
    this.handleEscape = (event) => this.handleEscapeKey(event);
  }

  open() {
    document.body.append(this.overlay);
    document.body.classList.add("modal-open");
    document.addEventListener("keydown", this.handleEscape);
    activeModals.push(this);
  }

  close() {
    this.overlay.remove();
    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", this.handleEscape);

    const index = activeModals.indexOf(this);
    if (index !== -1) {
      activeModals.splice(index, 1);
    }
  }

  handleOverlayClick(event) {
    if (event.target === this.overlay) {
      this.close();
    }
  }

  handleEscapeKey(event) {
    if (event.key === "Escape") {
      this.close();
    }
  }
}

function closeAllModals() {
  [...activeModals].forEach((modal) => modal.close());
}

function showWinModal(moves) {
  const modal = new Modal({
    title: "Поздравляем!",
    buildContent: (content) => {
      const message = createElement("p", {
        text: `Вы нашли все пары за ${moves} ${declineMoves(moves)}!`,
      });
      content.append(message);
    },
    actions: [
      {
        text: "Новая игра",
        className: "btn-primary",
        handler: () => resetGame(),
      },
      {
        text: "Закрыть",
        className: "btn-secondary",
      },
    ],
  });
  modal.open();
}

function showLeaderboardModal() {
  const results = getLeaderboard();

  const modal = new Modal({
    title: "Таблица лидеров",
    buildContent: (content) => {
      if (results.length === 0) {
        const emptyMessage = createElement("p", {
          className: "empty-message",
          text: "Пока нет результатов",
        });
        content.append(emptyMessage);
        return;
      }

      const table = createElement("table", { className: "leaderboard-table" });
      const thead = createElement("thead");
      const headerRow = createElement("tr");

      ["Место", "Ходы", "Дата"].forEach((text) => {
        const th = createElement("th", { text });
        headerRow.append(th);
      });
      thead.append(headerRow);

      const tbody = createElement("tbody");
      results.forEach((result, index) => {
        const row = createElement("tr");
        const placeCell = createElement("td", { text: String(index + 1) });
        const movesCell = createElement("td", { text: String(result.moves) });
        const dateCell = createElement("td", { text: result.date });
        row.append(placeCell, movesCell, dateCell);
        tbody.append(row);
      });

      table.append(thead, tbody);
      content.append(table);
    },
    actions: [
      {
        text: "Закрыть",
        className: "btn-secondary",
      },
    ],
  });
  modal.open();
}

function declineMoves(moves) {
  const lastDigit = moves % 10;
  const lastTwoDigits = moves % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "ходов";
  }
  if (lastDigit === 1) {
    return "ход";
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return "хода";
  }
  return "ходов";
}

function createHeader() {
  const header = createElement("header", { className: "header" });
  const title = createElement("h1", {
    className: "header-title",
    text: "Memory Game",
  });
  const nav = createElement("nav", { className: "header-nav" });
  const newGameButton = createElement("button", {
    className: "btn",
    text: "Новая игра",
  });
  newGameButton.addEventListener("click", resetGame);
  const leaderboardButton = createElement("button", {
    className: "btn",
    text: "Таблица лидеров",
  });
  leaderboardButton.addEventListener("click", showLeaderboardModal);

  nav.append(newGameButton, leaderboardButton);
  header.append(title, nav);

  return header;
}

function createSidebar() {
  const sidebar = createElement("aside", { className: "sidebar" });

  const stats = createElement("div", { className: "stats" });

  const movesStat = createElement("div", { className: "stat" });
  const movesLabel = createElement("span", {
    className: "stat-label",
    text: "Ходы",
  });
  state.movesElement = createElement("span", {
    className: "stat-value",
    text: "0",
  });
  movesStat.append(movesLabel, state.movesElement);

  const pairsStat = createElement("div", { className: "stat" });
  const pairsLabel = createElement("span", {
    className: "stat-label",
    text: "Пары",
  });
  state.pairsElement = createElement("span", {
    className: "stat-value",
    text: `0 / ${TOTAL_PAIRS}`,
  });
  pairsStat.append(pairsLabel, state.pairsElement);

  stats.append(movesStat, pairsStat);
  sidebar.append(stats);

  return sidebar;
}

function createBoard() {
  state.boardElement = createElement("div", { className: "game-board" });
  return state.boardElement;
}

function initApp() {
  document.body.replaceChildren(createHeader(), createSidebar(), createBoard());
  resetGame();
}

initApp();
