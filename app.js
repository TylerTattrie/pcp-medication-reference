// PCP Med Reference app logic
// Medication records are loaded from medications-data.js.

const medications = Array.isArray(window.PCP_MEDICATIONS)
  ? window.PCP_MEDICATIONS
  : [];

const $ = (selector) => document.querySelector(selector);

const medicationList = $("#medication-list");
const detailView = $("#detail-view");
const medicationView = $("#medication-view");
const quizView = $("#quiz-view");
const searchInput = $("#med-search");

let currentView = "medications";
let activeMedicationId = null;
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;
let answered = false;

const STORAGE_KEY = "pcp-med-reference-study-list-v2";

function loadStudyList() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter(id => medications.some(med => med.id === id));
      }
    }
  } catch (error) {
    console.warn("Could not load saved study list:", error);
  }

  return medications.filter(med => med.studyList).map(med => med.id);
}

let studyList = loadStudyList();

function saveStudyList() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(studyList));
  } catch {
    alert("Your browser could not save the study list on this device.");
  }
  updateStudyCount();
}

function updateStudyCount() {
  $("#study-count").textContent = studyList.length;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderMedications() {
  const query = searchInput.value.trim().toLowerCase();

  let results = medications.filter(med => {
    const searchable = [
      med.name,
      med.otherNames,
      med.classifications,
      med.indications,
      med.keywords
    ].join(" ").toLowerCase();

    return searchable.includes(query);
  });

  if (currentView === "study-list") {
    results = results.filter(med => studyList.includes(med.id));
  }

  $("#list-heading").textContent =
    currentView === "study-list" ? "My Study List" : "Medication Library";

  $("#result-count").textContent =
    `${results.length} medication${results.length === 1 ? "" : "s"}`;
  $("#empty-message").hidden = results.length !== 0;

  const medicationIcons = {
  "Acetaminophen": "Tablet.svg",
  "Acetylsalicylic Acid": "Tablet.svg",
  "Ibuprofen": "Tablet.svg",
  "D50W": "IVBag.svg",
  "Dimenhydrinate": "Syringe.svg",
  "Diphenhydramine": "Syringe.svg",
  "Epinephrine": "Syringe.svg",
  "Glucagon": "Syringe.svg",
  "Ketorolac": "Syringe.svg",
  "Metoclopramide": "Syringe.svg",
  "Naloxone": "Syringe.svg",
  "Nitroglycerin": "Syringe.svg",
  "Ondansetron": "Syringe.svg",
  "Ipratropium Bromide": "Inhaler.svg",
  "Salbutamol": "Inhaler.svg",
  "Nitrous Oxide": "Oxygen.svg",
  "Oxygen": "Oxygen.svg",
  "Oral Glucose": "Buccal.svg",
  "Tetracaine": "Eyedrops.svg"
};
  medicationList.innerHTML = results.map(med => `
    <article class="medication-card">
  ${medicationIcons[med.name] ? `
    <img
      class="medication-icon"
      src="MedicationImages/${medicationIcons[med.name]}"
      alt=""
    >
  ` : ""}
      <h3>${escapeHTML(med.name)}</h3>
      ${med.otherNames ? `<p>Also known as: ${escapeHTML(med.otherNames)}</p>` : ""}
      <p>${escapeHTML(med.classifications || "Classification not entered")}</p>
      <p class="card-description">${escapeHTML(med.indications || "No indications entered.")}</p>
      <div class="card-actions">
        <button class="primary-button" data-open="${escapeHTML(med.id)}">
          View drug card
        </button>
        <button class="bookmark-button" data-save="${escapeHTML(med.id)}">
          ${studyList.includes(med.id) ? "★ Saved" : "☆ Save"}
        </button>
      </div>
    </article>
  `).join("");
}

function detailField(label, value) {
  if (!value || !String(value).trim()) return "";
  return `
    <section>
      <h3>${escapeHTML(label)}</h3>
      <p>${escapeHTML(value)}</p>
    </section>
  `;
}

function showDetail(id) {
  const med = medications.find(item => item.id === id);
  if (!med) return;

  activeMedicationId = id;
  medicationView.hidden = true;
  quizView.hidden = true;
  detailView.hidden = false;
  searchInput.closest(".search-section").hidden = true;
  $(".tabs").hidden = true;

  $("#medication-detail").innerHTML = `
    ${med.image ? `<img class="detail-image" src="${escapeHTML(med.image)}" alt="${escapeHTML(med.name)}">` : ""}
    <h2>${escapeHTML(med.name)}</h2>
    ${med.otherNames ? `<p><strong>Other names:</strong> ${escapeHTML(med.otherNames)}</p>` : ""}
    <button class="bookmark-button" data-save="${escapeHTML(med.id)}">
      ${studyList.includes(med.id) ? "★ Remove from study list" : "☆ Add to study list"}
    </button>
    ${detailField("Classifications", med.classifications)}
    ${detailField("Mechanism of action", med.mechanism)}
    ${detailField("Indications", med.indications)}
    ${detailField("Contraindications", med.contraindications)}
    ${detailField("Precautions", med.precautions)}
    ${detailField("Adverse effects", med.adverseEffects)}
    ${detailField("Dose", med.dosage)}
    ${detailField("Routes", med.routes)}
    ${detailField("Special notes", med.specialNotes)}
    ${detailField("Keywords", med.keywords)}
    <a class="pronunciation-link" href="${escapeHTML(med.pronunciation)}"
      target="_blank" rel="noopener noreferrer">🔊 Find pronunciation on YouTube</a>
    <p><small>Study aid only. Verify medication information against your current course materials and applicable PCP protocols.</small></p>
  `;
}

function closeDetail() {
  activeMedicationId = null;
  detailView.hidden = true;
  searchInput.closest(".search-section").hidden = false;
  $(".tabs").hidden = false;
  showView(currentView);
}


function showView(view) {
  currentView = view;
  detailView.hidden = true;

  medicationView.hidden =
  view === "quiz" ||
  view === "flashcards" ||
  view === "dashboard";
  quizView.hidden = view !== "quiz";
  document.getElementById("flashcards-view").hidden = view !== "flashcards";
  document.getElementById("dashboard-view").hidden = view !== "dashboard";

  searchInput.closest(".search-section").hidden = view === "flashcards";
  $(".tabs").hidden = false;

  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });

if (view === "quiz") {
  startQuiz();
} else if (view === "dashboard") {
  updateDashboard();
} else if (view === "flashcards") {
  renderMedications();
} else {
  renderMedications();
}
}


function toggleStudyList(id) {
  if (studyList.includes(id)) {
    studyList = studyList.filter(item => item !== id);
  } else {
    studyList.push(id);
  }

  saveStudyList();

  if (activeMedicationId) {
    showDetail(activeMedicationId);
  } else {
    renderMedications();
  }
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}



function buildQuizQuestions() {
  // Only use medications saved to the Study List
  const usable = medications.filter(med =>
    studyList.includes(med.id)
  );

  const fields = [
    { key: "classifications", label: "classifications" },
    { key: "mechanism", label: "mechanism of action" },
    { key: "indications", label: "indications" },
    { key: "contraindications", label: "contraindications" },
    { key: "dosage", label: "dose" }
  ];

  // Use every medication for answer choices,
  // but quiz only medications saved to the Study List.
  const allMedications = medications;
  const questions = [];

  shuffle(usable).forEach(med => {
    fields.forEach(field => {
      const rawValue = med[field.key];
      const correctAnswer =
        rawValue && String(rawValue).trim()
          ? String(rawValue).trim()
          : "Information not entered";

      // Find answer choices from the same field in other saved medications
      const distractors = shuffle(
        [...new Set(
          allMedications
            .filter(other => other.id !== med.id)
            .map(other => other[field.key])
            .filter(value => value && String(value).trim())
            .map(value => String(value).trim())
            .filter(value => value !== correctAnswer)
        )]
      ).slice(0, 3);

      const options = shuffle(
        [...new Set([correctAnswer, ...distractors])]
      );

      questions.push({
        question: `What ${field.label} are listed for ${med.name}?`,
        options,
        answer: options.indexOf(correctAnswer),
        explanation: `Drug-card information: ${correctAnswer}.`
      });
    });
  });

  return questions;
}



function startQuiz() {
  const savedMeds = medications.filter(med =>
    studyList.includes(med.id)
  );

  console.log("Study list count:", studyList.length);
  console.log("Saved medications:", savedMeds.map(med => med.name));

  quizQuestions = buildQuizQuestions();
  quizIndex = 0;
  quizScore = 0;
  answered = false;

if (quizQuestions.length === 0) {
  $("#quiz-content").innerHTML =
    "<p>Add medications to your Study List to generate quiz questions.</p>";
  return;
}

  renderQuiz();
}

function renderQuiz() {
  const savedNames = medications
    .filter(med => studyList.includes(med.id))
    .map(med => med.name)
    .join(", ");

  if (quizIndex >= quizQuestions.length) {
    $("#quiz-content").innerHTML = `
      <h3>Quiz complete!</h3>
      <p>You scored ${quizScore} out of ${quizQuestions.length}.</p>
      <button class="primary-button" id="restart-quiz">Try again</button>
    `;
    return;
  }

  const q = quizQuestions[quizIndex];
console.log("Saved medications:", savedNames);
  $("#quiz-content").innerHTML = `
    
    <p class="eyebrow">QUESTION ${quizIndex + 1} OF ${quizQuestions.length}</p>
    <h3>${escapeHTML(q.question)}</h3>
    <div>
      ${q.options.map((option, index) => `
        <button class="quiz-option" data-answer="${index}">
          ${escapeHTML(option)}
        </button>
      `).join("")}
    </div>
    <p id="quiz-feedback" class="quiz-feedback" aria-live="polite"></p>
    <button class="primary-button" id="next-question" hidden>
      ${quizIndex === quizQuestions.length - 1 ? "See results" : "Next question"}
    </button>
  `;
}

document.addEventListener("click", event => {
  const tab = event.target.closest("[data-view]");
  if (tab) {
    showView(tab.dataset.view);
    return;
  }

  const openButton = event.target.closest("[data-open]");
  if (openButton) {
    showDetail(openButton.dataset.open);
    return;
  }

  const saveButton = event.target.closest("[data-save]");
  if (saveButton) {
    toggleStudyList(saveButton.dataset.save);
    return;
  }

  if (event.target.closest("#back-button")) {
    closeDetail();
    return;
  }

  const answerButton = event.target.closest("[data-answer]");
  if (answerButton && !answered) {
    answered = true;
    const q = quizQuestions[quizIndex];
    const selectedAnswer = Number(answerButton.dataset.answer);
    const correct = selectedAnswer === q.answer;

    if (correct) quizScore++;

    $("#quiz-feedback").textContent =
      `${correct ? "Correct!" : "Not quite."} ${q.explanation}`;

    document.querySelectorAll("[data-answer]").forEach(button => {
      button.disabled = true;
    });

    $("#next-question").hidden = false;
    return;
  }

  if (event.target.closest("#next-question")) {
    quizIndex++;
    answered = false;
    renderQuiz();
    return;
  }

  if (event.target.closest("#restart-quiz")) {
    startQuiz();
  }
});

searchInput.addEventListener("input", renderMedications);

function updateConnectionStatus() {
  $("#connection-status").textContent = navigator.onLine
    ? "Online"
    : "Offline mode";
}

window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);

updateStudyCount();
updateConnectionStatus();
renderMedications();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(error => console.error("Service worker registration failed:", error));
  });
}




let deferredInstallPrompt;

const installButton = document.getElementById("install-button");
const installHelp = document.getElementById("install-help");

function showInstallHelp(message) {
  installHelp.textContent = message;
  installHelp.hidden = false;
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();

    const choice = await deferredInstallPrompt.userChoice;

    if (choice.outcome === "accepted") {
      installButton.hidden = true;
      showInstallHelp("App installation started.");
    }

    deferredInstallPrompt = null;
    return;
  }

  showInstallHelp(
    "To install on iPhone or iPad: open this site in Safari, tap Share, then Add to Home Screen. On Mac Safari, use File > Add to Dock if available."
  );
});

window.addEventListener("appinstalled", () => {
  installButton.hidden = true;
  showInstallHelp("PCP Med Reference is installed.");
});

if (window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true) {
  installButton.hidden = true;
} else {
  installButton.hidden = false;
}

let flashcards = [];
let originalFlashcards = [];
let currentFlashcardIndex = 0;

const flashcardCategories = {
  classifications: "Classifications",
  mechanism: "Mechanism of action",
  indications: "Indications",
  contraindications: "Contraindications",
  dosage: "Dosage",
  routes: "Routes",
  adverseEffects: "Adverse effects",
  precautions: "Precautions",
  otherNames: "Other names"
};

function startFlashcards() {
  const selectedCategories = Array.from(
    document.querySelectorAll(
      "#flashcards-content .flashcard-options input:checked"
    )
  ).map(input => input.value);

  if (selectedCategories.length === 0) {
    alert("Please select at least one category.");
    return;
  }

  const studyMedications = medications.filter(med =>
    studyList.includes(med.id)
  );

  if (studyMedications.length === 0) {
    alert("Add medications to My Study List before starting flashcards.");
    return;
  }

  flashcards = [];

  studyMedications.forEach(med => {
    selectedCategories.forEach(category => {
      const answer = med[category];

      if (answer && String(answer).trim() !== "") {
        flashcards.push({
          medication: med.name,
          category: category,
          question: `${med.name} — ${flashcardCategories[category]}`,
          answer: String(answer).trim()
        });
      }
    });
  });

  if (flashcards.length === 0) {
    alert("No flashcards could be created from those selections.");
    return;
  }
  originalFlashcards = [...flashcards];
  console.log("Flashcards created:", flashcards.length);
console.log("First flashcard:", flashcards[0]);
  currentFlashcardIndex = 0;

  document.getElementById("flashcard-study-area").hidden = false;
  document.getElementById("start-flashcards").textContent =
    "Refresh Flashcards";

  showFlashcard();
}

function startDifficultFlashcards() {
  const selectedCategories = Array.from(
    document.querySelectorAll(
      "#flashcards-content .flashcard-options input:checked"
    )
  ).map(input => input.value);

  if (selectedCategories.length === 0) {
    alert("Please select at least one category.");
    return;
  }

  const studyMedications = medications.filter(med =>
    studyList.includes(med.id)
  );

  flashcards = [];

  studyMedications.forEach(med => {
    selectedCategories.forEach(category => {
      const answer = med[category];
      const resultKey = `${med.name}|${category}`;

      if (
        answer &&
        String(answer).trim() !== "" &&
        flashcardResults[resultKey] === "practice"
      ) {
        flashcards.push({
          medication: med.name,
          category: category,
          question: `${med.name} — ${flashcardCategories[category]}`,
          answer: String(answer).trim()
        });
      }
    });
  });

  const help = document.getElementById("difficult-cards-help");

  if (flashcards.length === 0) {
    help.textContent =
      "No difficult cards found in your selected categories. Mark cards as Need Practice to review them here.";
    return;
  }

  originalFlashcards = [...flashcards];
  currentFlashcardIndex = 0;

  document.getElementById("flashcard-study-area").hidden = false;
  document.getElementById("start-flashcards").textContent =
    "Refresh Flashcards";

  help.textContent = `Reviewing ${flashcards.length} difficult card(s).`;

  showFlashcard();
}


function updateFlashcardStats() {
  let known = 0;
  let practice = 0;
  let unrated = 0;

  flashcards.forEach(card => {
    const key = `${card.medication}|${card.category}`;
    const result = flashcardResults[key];

    if (result === "known") {
      known++;
    } else if (result === "practice") {
      practice++;
    } else {
      unrated++;
    }
  });

  document.getElementById("flashcard-stats").textContent =
    `Know It: ${known} | Need Practice: ${practice} | Unrated: ${unrated}`;
}



function updateDashboard() {
  const studyMedications = medications.filter(med =>
    studyList.includes(med.id)
  );

  let known = 0;
  let practice = 0;
  let unrated = 0;

  const categoryStats = {};

  Object.keys(flashcardCategories).forEach(category => {
    categoryStats[category] = {
      known: 0,
      practice: 0,
      unrated: 0,
      total: 0
    };
  });

  studyMedications.forEach(med => {
    Object.keys(flashcardCategories).forEach(category => {
      const answer = med[category];

      if (!answer || String(answer).trim() === "") {
        return;
      }

      const result = flashcardResults[`${med.name}|${category}`];
      categoryStats[category].total++;

      if (result === "known") {
        known++;
        categoryStats[category].known++;
      } else if (result === "practice") {
        practice++;
        categoryStats[category].practice++;
      } else {
        unrated++;
        categoryStats[category].unrated++;
      }
    });
  });

const total = known + practice + unrated;
const overallPercent = total
  ? Math.round((known / total) * 100)
  : 0;

  const categoryRows = Object.keys(flashcardCategories).map(category => {
    const stats = categoryStats[category];
    console.log(
  flashcardCategories[category],
  "Know It:", stats.known,
  "Need Practice:", stats.practice,
  "Unrated:", stats.unrated,
  "Total:", stats.total
);
const percent = stats.total
  ? Math.round((stats.known / stats.total) * 100)
  : 0;

    return `
      <div class="dashboard-category">
        <div class="dashboard-category-heading">
          <strong>${flashcardCategories[category]}</strong>
          <span>${percent}% Done</span>
        </div>
        <div class="dashboard-progress-track">
          <div class="dashboard-progress-fill" style="width: ${percent}%"></div>
        </div>
        <p>Know It: ${stats.known} · Need Practice: ${stats.practice} · Unrated: ${stats.unrated}</p>
      </div>
    `;
  }).join("");

  const content = document.getElementById("dashboard-content");

  content.innerHTML = `
    <h3>Your Study Progress</h3>
    <p>Based on medications in My Study List.</p>

    <div class="dashboard-stats">
      <div class="dashboard-stat known-stat">
        <strong>${known}</strong>
        <span>Know It</span>
      </div>
      <div class="dashboard-stat practice-stat">
        <strong>${practice}</strong>
        <span>Need Practice</span>
      </div>
      <div class="dashboard-stat unrated-stat">
        <strong>${unrated}</strong>
        <span>Unrated</span>
      </div>
    </div>

    <div class="dashboard-overall">
      <div class="dashboard-category-heading">
        <strong>Overall progress</strong>
        <span>${overallPercent}% Known</span>
      </div>
      <div class="dashboard-progress-track overall-track">
        <div class="dashboard-progress-fill" style="width: ${overallPercent}%"></div>
      </div>
      <p>${known} of ${total} available flashcards mastered</p>
    </div>

    <h3>Progress by Category</h3>
    <div class="dashboard-categories">
      ${categoryRows}
    </div>
  `;
}




function showFlashcard() {
  const card = flashcards[currentFlashcardIndex];

  document.getElementById("flashcard-progress").textContent =
    `Card ${currentFlashcardIndex + 1} of ${flashcards.length}`;
  updateFlashcardStats();
  document.getElementById("flashcard-question").textContent =
    card.question;

  document.getElementById("flashcard-answer-text").textContent =
    card.answer;

  document.getElementById("flashcard-answer").hidden = true;

  document.getElementById("flashcard-rating").hidden = true;

  document.getElementById("flashcard-show-answer").hidden = false;

  document.getElementById("flashcard-previous").disabled =
    currentFlashcardIndex === 0;

  document.getElementById("flashcard-next").disabled =
    currentFlashcardIndex === flashcards.length - 1;
}

document.getElementById("start-flashcards").addEventListener("click", startFlashcards);
document.getElementById("review-difficult-cards").addEventListener("click", startDifficultFlashcards);

document.getElementById("flashcard-show-answer").addEventListener("click", () => {
  document.getElementById("flashcard-answer").hidden = false;
  document.getElementById("flashcard-show-answer").hidden = true;
  document.getElementById("flashcard-rating").hidden = false;
});

document.getElementById("flashcard-previous").addEventListener("click", () => {
  if (currentFlashcardIndex > 0) {
    currentFlashcardIndex--;
    showFlashcard();
  }
});

document.getElementById("flashcard-next").addEventListener("click", () => {
  if (currentFlashcardIndex < flashcards.length - 1) {
    currentFlashcardIndex++;
    showFlashcard();
  }
});

const FLASHCARD_RESULTS_KEY = "pcp-med-reference-flashcard-results-v1";

let flashcardResults = {};

try {
  flashcardResults = JSON.parse(
    localStorage.getItem(FLASHCARD_RESULTS_KEY) || "{}"
  );
} catch (error) {
  flashcardResults = {};
}

function saveFlashcardResults() {
  localStorage.setItem(
    FLASHCARD_RESULTS_KEY,
    JSON.stringify(flashcardResults)
  );
}

document.getElementById("flashcard-know-it").addEventListener("click", () => {
  const card = flashcards[currentFlashcardIndex];
  flashcardResults[`${card.medication}|${card.category}`] = "known";
  saveFlashcardResults();
  updateFlashcardStats();

  document.getElementById("flashcard-rating").hidden = true;
  document.getElementById("flashcard-answer").hidden = true;
  document.getElementById("flashcard-show-answer").hidden = false;

  if (currentFlashcardIndex < flashcards.length - 1) {
    currentFlashcardIndex++;
    showFlashcard();
  } else {
    alert("You've reached the end of your flashcards!");
  }
});

document.getElementById("flashcard-need-practice").addEventListener("click", () => {
  const card = flashcards[currentFlashcardIndex];
  flashcardResults[`${card.medication}|${card.category}`] = "practice";
  saveFlashcardResults();
  updateFlashcardStats();

  document.getElementById("flashcard-rating").hidden = true;
  document.getElementById("flashcard-answer").hidden = true;
  document.getElementById("flashcard-show-answer").hidden = false;

  if (currentFlashcardIndex < flashcards.length - 1) {
    currentFlashcardIndex++;
    showFlashcard();
  } else {
    alert("You've reached the end of your flashcards!");
  }
});

document.getElementById("flashcard-shuffle").addEventListener("click", () => {
  flashcards = [...originalFlashcards];

  for (let i = flashcards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flashcards[i], flashcards[j]] = [flashcards[j], flashcards[i]];
  }

  currentFlashcardIndex = 0;
  showFlashcard();
});

document.getElementById("flashcard-original-order").addEventListener("click", () => {
  flashcards = [...originalFlashcards];
  currentFlashcardIndex = 0;
  showFlashcard();
});

