/* ==========================================================================
   SeekrX — Player Taste Quiz Engine
   File: quiz.js
   Version: 1.0.0

   WHAT THIS FILE IS
   -----------------
   This is the "brain" of the sign-up quiz. It does four jobs:

     1. Holds the QUESTIONS as plain data (so you never write scoring logic
        by hand — you just add or edit objects in a list).
     2. Records the user's answers in memory.
     3. Turns those answers into 10 "trait scores" from 0 to 4.
     4. Saves the finished result as a JSON object in the browser
        (localStorage) so the rest of the site can read it.

   WHAT THIS FILE IS *NOT*
   -----------------------
   There is NO HTML and NO CSS in here on purpose. This file does not know
   what your page looks like. You (or an AI assistant) build the visual form
   separately and call the functions below. See README.md for the exact
   list of functions and a copy-paste starter prompt.

   HOW TO LOAD IT
   --------------
   In your HTML, before your own script:
       <script src="quiz.js"></script>
       <script src="app.js"></script>   <!-- your form code -->

   Everything is exposed on one global object called `SeekrXQuiz`.
   Open the browser console and type `SeekrXQuiz` to poke at it.
   ========================================================================== */

/* We wrap the whole file in a function that runs itself (an "IIFE").
   Why: it keeps our helper variables private so they can't accidentally
   collide with variables in your other files. Only the things we attach
   to `window.SeekrXQuiz` at the very bottom are visible outside. */
(function () {
  "use strict"; // turns on stricter error checking — catches typos early

  /* ========================================================================
     SECTION 1 — THE TEN TRAITS
     ========================================================================
     Every question feeds points into one or more of these traits.
     `key`   = the short name used in code and in the saved JSON.
     `label` = what a human sees.
     `low` / `high` = what a score of 0 and a score of 4 mean. Useful if you
     want to show the user a summary of their profile at the end.

     IMPORTANT: these keys must match the trait keys used in your game
     records (see games.example.json), or matching will not work.
  ======================================================================== */
  var TRAITS = [
    { key: "action",      label: "Action intensity",     low: "Slow and calm",                        high: "Constant action" },
    { key: "strategy",    label: "Strategic depth",      low: "Mostly instinctive",                   high: "Heavy planning and decision-making" },
    { key: "mechanical",  label: "Mechanical challenge", low: "Easy to control",                      high: "Demanding execution and skill" },
    { key: "exploration", label: "Exploration",          low: "Guided and contained",                 high: "Discovery-focused and open" },
    { key: "narrative",   label: "Narrative focus",      low: "Little emphasis on story",             high: "Story is central" },
    { key: "creative",    label: "Creative freedom",     low: "Predetermined actions and solutions",  high: "Building, designing, or experimentation" },
    { key: "social",      label: "Social play",          low: "Entirely independent",                 high: "Teamwork and communication are essential" },
    { key: "competitive", label: "Competitive focus",    low: "No emphasis on winning against others", high: "Competition is the main purpose" },
    { key: "progression", label: "Long-term progression", low: "Mostly self-contained sessions",      high: "Extensive upgrading, collecting, or development" },
    { key: "tension",     label: "Tension level",        low: "Relaxing and forgiving",               high: "Stressful, punishing, or suspenseful" }
  ];

  /* A plain list of just the keys — handy for loops. */
  var TRAIT_KEYS = TRAITS.map(function (t) { return t.key; });

  /* ========================================================================
     SECTION 2 — THE QUESTIONS
     ========================================================================
     There are three question TYPES. Your HTML decides how each looks, but
     the data shape tells you what to render:

       "likert"       -> one 0..4 scale. Render 5 radio buttons or a slider.
                         Scoring: (answer value) x weight, per trait.
                         If `reverse: true`, we use (4 - answer) instead.

       "single"       -> pick exactly ONE option. Render radio buttons.
                         Scoring: that option's `points` are added.

       "multi"        -> pick up to `maxSelections` options. Render checkboxes.
                         Scoring: every selected option's `points` are added.

     `id` must be unique. It is the key used in the saved answers object,
     so DO NOT rename ids after you have real users — old data would break.
  ======================================================================== */

  /* Reusable label set for the 0..4 scales. Feed this to your HTML. */
  var LIKERT_LABELS = [
    "Strongly disagree", // 0
    "Disagree",          // 1
    "Neutral",           // 2
    "Agree",             // 3
    "Strongly agree"     // 4
  ];

  var QUESTIONS = [

    /* ---- PART A: direct trait statements (0..4 agreement) -------------- */

    {
      id: "a_action",
      type: "likert",
      section: "About how you play",
      text: "I prefer games with frequent action rather than long quiet periods.",
      points: { action: 1 }
    },
    {
      id: "a_strategy",
      type: "likert",
      section: "About how you play",
      text: "I enjoy games that require me to plan ahead and carefully consider different options.",
      points: { strategy: 1 }
    },
    {
      id: "a_mechanical",
      type: "likert",
      section: "About how you play",
      text: "I enjoy challenges that require precise controls, timing, or mechanical skill.",
      points: { mechanical: 1 }
    },
    {
      id: "a_exploration",
      type: "likert",
      section: "About how you play",
      text: "Exploring unfamiliar places and discovering new things is an important part of my enjoyment.",
      points: { exploration: 1 }
    },
    {
      id: "a_narrative",
      type: "likert",
      section: "About how you play",
      text: "A game's story is a major part of my enjoyment.",
      points: { narrative: 1 }
    },
    {
      id: "a_creative",
      type: "likert",
      section: "About how you play",
      text: "I prefer games that let me choose how to approach goals rather than making me follow one fixed path.",
      points: { creative: 1 }
    },
    {
      id: "a_social",
      type: "likert",
      section: "About how you play",
      text: "I generally enjoy games more when I can play with or alongside other people.",
      points: { social: 1 }
    },
    {
      id: "a_competitive",
      type: "likert",
      section: "About how you play",
      text: "I enjoy directly competing against other players.",
      points: { competitive: 1 }
    },
    {
      id: "a_progression",
      type: "likert",
      section: "About how you play",
      text: "I enjoy games where my character, abilities, collection, or world develops over many play sessions.",
      points: { progression: 1 }
    },

    /* Three questions all feed `tension`. The first one is REVERSED:
       agreeing with "I like relaxing games" means LOW tension, so we flip
       the number with `reverse: true`. Without this flag the quiz would
       score a calm player as a horror fan. Do not remove it. */
    {
      id: "a_tension_relaxing",
      type: "likert",
      section: "About how you play",
      text: "I prefer games that feel relaxing and forgiving rather than tense or punishing.",
      reverse: true,
      points: { tension: 1 }
    },
    {
      id: "a_tension_suspense",
      type: "likert",
      section: "About how you play",
      text: "I enjoy feelings of suspense, danger, or fear while playing games.",
      points: { tension: 1 }
    },
    {
      id: "a_tension_stakes",
      type: "likert",
      section: "About how you play",
      text: "High-stakes consequences make a game more exciting for me.",
      points: { tension: 1 }
    },

    /* ---- PART B: scenarios --------------------------------------------- */

    {
      id: "b_enemy",
      type: "single",
      section: "Scenarios",
      text: "When faced with an enemy, what sounds most enjoyable?",
      options: [
        {
          id: "rush",
          text: "Rush in and rely on skill and instinct.",
          points: { mechanical: 3, action: 3 }
        },
        {
          id: "balanced",
          text: "Consider your options, but don't overthink it — fight it the way that seems right.",
          points: { strategy: 2, action: 2, mechanical: 2 }
        },
        {
          id: "plan",
          text: "Study the enemy and choose from several tools, routes, or tactics to build the best plan.",
          points: { strategy: 4, creative: 2 }
        }
      ]
    },
    {
      id: "b_task",
      type: "single",
      section: "Scenarios",
      text: "When faced with a task, what sounds more fun?",
      options: [
        /* "Alone" earns no points on purpose. Because we divide by the
           maximum that WAS available (see scoreSession), picking this option
           correctly produces a low social score rather than a missing one. */
        { id: "alone",   text: "Complete it alone.",                                  points: {} },
        { id: "coop",    text: "Cooperate with other players and succeed as a team.", points: { social: 4 } },
        { id: "compete", text: "Compete against other players to see who performs best.", points: { competitive: 4, social: 2 } }
      ]
    },
    {
      id: "b_goals",
      type: "multi",
      maxSelections: 2, // "pick two"
      section: "Scenarios",
      text: "During a typical gaming session, which two goals would you find most satisfying?",
      options: [
        { id: "story",       text: "Advance through a storyline.",                                     points: { narrative: 4, progression: 1 } },
        { id: "explore",     text: "Explore unfamiliar places and make new discoveries.",              points: { exploration: 4 } },
        { id: "train",       text: "Train and improve my skills.",                                     points: { mechanical: 3 } },
        { id: "rank",        text: "Climb leaderboards or reach higher rankings.",                     points: { competitive: 4 } },
        { id: "create",      text: "Create something new.",                                            points: { creative: 4 } },
        { id: "defeat",      text: "Defeat a foe.",                                                     points: { action: 4, mechanical: 1 } },
        { id: "develop",     text: "Develop a character or world, unlock upgrades, or expand a collection.", points: { progression: 4 } }
      ]
    },

    /* ---- PART C: preferences ------------------------------------------- */

    {
      id: "c_multiplayer",
      type: "single",
      section: "Preferences",
      text: "Which type of multiplayer experience sounds most enjoyable?",
      options: [
        { id: "solo",            text: "Playing alone.",                                    points: {} },
        { id: "alongside",       text: "Playing alongside others without depending on them.", points: { social: 2 } },
        { id: "team",            text: "Cooperating closely as a team.",                     points: { social: 4 } },
        { id: "casual_compete",  text: "Competing casually.",                                points: { social: 2, competitive: 2 } },
        { id: "ranked_compete",  text: "Competing seriously or climbing ranks.",             points: { social: 2, competitive: 4 } }
      ]
    },
    {
      id: "c_genres",
      type: "multi",
      maxSelections: 3, // "choose up to three"
      section: "Preferences",
      text: "Which genres do you usually enjoy?",
      options: [
        { id: "action",       text: "Action",       points: { action: 1, mechanical: 1 } },
        { id: "adventure",    text: "Adventure",    points: { exploration: 1, narrative: 1 } },
        { id: "rpg",          text: "RPG",          points: { progression: 2 } },
        { id: "strategy",     text: "Strategy",     points: { strategy: 2 } },
        { id: "puzzle",       text: "Puzzle",       points: { strategy: 2 } },
        { id: "simulation",   text: "Simulation",   points: { strategy: 1, progression: 1 } },
        { id: "survival",     text: "Survival",     points: { exploration: 1, tension: 1 } },
        { id: "horror",       text: "Horror",       points: { tension: 2 } },
        { id: "racing",       text: "Racing",       points: { mechanical: 1, competitive: 1 } },
        { id: "sports",       text: "Sports",       points: { mechanical: 1, competitive: 1 } },
        { id: "fighting",     text: "Fighting",     points: { competitive: 1, mechanical: 1 } },
        { id: "shooter",      text: "Shooter",      points: { action: 1, mechanical: 1 } },
        { id: "platformer",   text: "Platformer",   points: { mechanical: 1 } },
        { id: "sandbox",      text: "Sandbox",      points: { creative: 2 } },
        { id: "rhythm",       text: "Rhythm",       points: { mechanical: 1 } },
        { id: "party",        text: "Party",        points: { social: 2 } },
        { id: "roguelike",    text: "Roguelike",    points: { mechanical: 1, tension: 1 } },
        { id: "visual_novel", text: "Visual novel", points: { narrative: 2 } }
      ]
    }

    /* TODO (future): the "select up to five games you have enjoyed" question.
       It needs the game database to exist first, because its scoring is not
       hand-written — you average the trait values of the games the user
       picked and blend that into the profile. See README, section
       "Question we have not built yet". */
  ];

  /* ========================================================================
     SECTION 3 — SESSION STATE (the user's in-progress answers)
     ========================================================================
     A "session" is one person taking the quiz. It is a plain object so you
     can `console.log(session)` at any time and see exactly what is stored.

     session.answers looks like this while the quiz is being filled in:
       {
         a_action: 3,                     // likert  -> a number 0..4
         b_enemy: "plan",                 // single  -> one option id
         b_goals: ["story", "explore"]    // multi   -> array of option ids
       }
     A question that has not been answered yet simply is not a key here.
  ======================================================================== */

  function createSession() {
    return {
      schemaVersion: "1.0.0",
      startedAt: new Date().toISOString(),
      answers: {}
    };
  }

  /* Find a question object by its id. Returns null if the id is unknown. */
  function getQuestion(questionId) {
    for (var i = 0; i < QUESTIONS.length; i++) {
      if (QUESTIONS[i].id === questionId) return QUESTIONS[i];
    }
    return null;
  }

  /* Look up one option inside a question. Returns null if not found. */
  function getOption(question, optionId) {
    if (!question.options) return null;
    for (var i = 0; i < question.options.length; i++) {
      if (question.options[i].id === optionId) return question.options[i];
    }
    return null;
  }

  /* ------------------------------------------------------------------------
     setLikert(session, questionId, value)
     Call this from a radio button / slider change handler.
     `value` must be 0,1,2,3 or 4.
     Returns { ok: true } or { ok: false, error: "why" } — always check it.
  ------------------------------------------------------------------------ */
  function setLikert(session, questionId, value) {
    var q = getQuestion(questionId);
    if (!q) return fail("Unknown question id: " + questionId);
    if (q.type !== "likert") return fail(questionId + " is not a likert question.");

    var n = Number(value); // radio inputs give us strings like "3"
    if (isNaN(n) || n < 0 || n > 4 || n % 1 !== 0) {
      return fail("Likert answers must be a whole number from 0 to 4.");
    }

    session.answers[questionId] = n;
    return { ok: true };
  }

  /* ------------------------------------------------------------------------
     setSingle(session, questionId, optionId)
     Call this from a radio button change handler on a "single" question.
  ------------------------------------------------------------------------ */
  function setSingle(session, questionId, optionId) {
    var q = getQuestion(questionId);
    if (!q) return fail("Unknown question id: " + questionId);
    if (q.type !== "single") return fail(questionId + " is not a single-choice question.");
    if (!getOption(q, optionId)) return fail("Unknown option id: " + optionId);

    session.answers[questionId] = optionId;
    return { ok: true };
  }

  /* ------------------------------------------------------------------------
     toggleMulti(session, questionId, optionId)
     Call this from a checkbox change handler on a "multi" question.
     - If the option was not selected, it gets selected.
     - If it was already selected, it gets removed.
     - If adding it would exceed maxSelections, nothing changes and you get
       back { ok: false, error: ... } so you can show a message and un-check
       the box in your UI.
  ------------------------------------------------------------------------ */
  function toggleMulti(session, questionId, optionId) {
    var q = getQuestion(questionId);
    if (!q) return fail("Unknown question id: " + questionId);
    if (q.type !== "multi") return fail(questionId + " is not a multi-select question.");
    if (!getOption(q, optionId)) return fail("Unknown option id: " + optionId);

    // Make sure there is an array to work with.
    if (!Array.isArray(session.answers[questionId])) {
      session.answers[questionId] = [];
    }
    var selected = session.answers[questionId];
    var position = selected.indexOf(optionId);

    if (position >= 0) {
      selected.splice(position, 1); // already chosen -> remove it
      return { ok: true, selected: selected.slice() };
    }

    if (selected.length >= q.maxSelections) {
      return fail("You can choose at most " + q.maxSelections + " options here.");
    }

    selected.push(optionId);
    return { ok: true, selected: selected.slice() };
  }

  /* Small helper so every error looks the same. */
  function fail(message) {
    return { ok: false, error: message };
  }

  /* ------------------------------------------------------------------------
     getUnansweredQuestions(session)
     Returns an array of question ids that still need an answer. Use it to
     disable your "See my recommendations" button until the array is empty,
     and to highlight the questions the user missed.

     Rules used:
       likert / single -> must have a value
       multi           -> must have at least ONE option selected
                          (b_goals says "pick two", so we require exactly 2)
  ------------------------------------------------------------------------ */
  function getUnansweredQuestions(session) {
    var missing = [];
    QUESTIONS.forEach(function (q) {
      var a = session.answers[q.id];

      if (q.type === "likert") {
        if (typeof a !== "number") missing.push(q.id);

      } else if (q.type === "single") {
        if (typeof a !== "string") missing.push(q.id);

      } else if (q.type === "multi") {
        var count = Array.isArray(a) ? a.length : 0;
        // b_goals explicitly asks for two; other multis allow "up to N".
        var required = (q.id === "b_goals") ? 2 : 1;
        if (count < required) missing.push(q.id);
      }
    });
    return missing;
  }

  function isComplete(session) {
    return getUnansweredQuestions(session).length === 0;
  }

  /* ========================================================================
     SECTION 4 — SCORING
     ========================================================================
     THE PROBLEM: if we just add up points, the totals are meaningless.
     `action` can collect up to 13 points across the quiz while `narrative`
     can only collect 9. A raw total of 9 would look "lower" than 10 even
     though it is a perfect score for that trait.

     THE FIX (two numbers per trait):
       raw = points the user actually earned
       max = the most they COULD have earned, given the answers they gave
       score = raw / max * 4     -> always lands back on the 0..4 scale
                                    used by the trait table and by games.

     Why "given the answers they gave"? For a multi-select we only count the
     best N options where N = how many the user actually picked. If someone
     picks one genre instead of three, they are not punished for it.
  ======================================================================== */

  /* Adds every trait in `points` into the running `totals` object.
     `multiplier` lets us reuse this for likert scaling. */
  function addPoints(totals, points, multiplier) {
    if (!points) return;
    Object.keys(points).forEach(function (traitKey) {
      if (totals[traitKey] === undefined) return; // ignore unknown trait keys
      totals[traitKey] += points[traitKey] * multiplier;
    });
  }

  /* Creates { action: 0, strategy: 0, ... } for all ten traits. */
  function blankTotals() {
    var totals = {};
    TRAIT_KEYS.forEach(function (key) { totals[key] = 0; });
    return totals;
  }

  /* For a multi-select: what is the biggest amount of `traitKey` a user
     could get by choosing `pickCount` options? Sort each option's value for
     that trait, take the top `pickCount`, add them up. */
  function bestPossibleForTrait(question, traitKey, pickCount) {
    var values = question.options.map(function (opt) {
      return (opt.points && opt.points[traitKey]) ? opt.points[traitKey] : 0;
    });
    values.sort(function (a, b) { return b - a; }); // biggest first
    var total = 0;
    for (var i = 0; i < pickCount && i < values.length; i++) {
      total += values[i];
    }
    return total;
  }

  /* ------------------------------------------------------------------------
     scoreSession(session)
     The main event. Returns the finished profile DTO (see README for the
     exact JSON shape). Safe to call at any time — unanswered questions are
     simply skipped, so you can use it for a live preview.
  ------------------------------------------------------------------------ */
  function scoreSession(session) {
    var raw = blankTotals();
    var max = blankTotals();

    QUESTIONS.forEach(function (q) {
      var answer = session.answers[q.id];

      /* ---- likert ---- */
      if (q.type === "likert") {
        if (typeof answer !== "number") return; // not answered, skip entirely

        // Reversed questions flip the scale: 0 becomes 4, 4 becomes 0.
        var effective = q.reverse ? (4 - answer) : answer;

        addPoints(raw, q.points, effective);
        addPoints(max, q.points, 4); // best case is always a 4 on the scale
        return;
      }

      /* ---- single choice ---- */
      if (q.type === "single") {
        if (typeof answer !== "string") return;
        var chosen = getOption(q, answer);
        if (!chosen) return;

        addPoints(raw, chosen.points, 1);

        // The ceiling is the best single option for each trait.
        TRAIT_KEYS.forEach(function (traitKey) {
          max[traitKey] += bestPossibleForTrait(q, traitKey, 1);
        });
        return;
      }

      /* ---- multi select ---- */
      if (q.type === "multi") {
        if (!Array.isArray(answer) || answer.length === 0) return;

        answer.forEach(function (optionId) {
          var opt = getOption(q, optionId);
          if (opt) addPoints(raw, opt.points, 1);
        });

        // Ceiling is based on HOW MANY they picked, not the allowed maximum.
        TRAIT_KEYS.forEach(function (traitKey) {
          max[traitKey] += bestPossibleForTrait(q, traitKey, answer.length);
        });
      }
    });

    /* Turn raw/max into the final 0..4 scores. */
    var traitScores = {};
    var lowConfidence = []; // traits nothing in this session could measure

    TRAIT_KEYS.forEach(function (key) {
      if (max[key] === 0) {
        // Nothing the user answered could touch this trait. Rather than
        // pretend they scored 0 (which would push them away from every game
        // that has the trait), we use the neutral middle and flag it.
        traitScores[key] = 2;
        lowConfidence.push(key);
      } else {
        traitScores[key] = round2((raw[key] / max[key]) * 4);
      }
    });

    return {
      schemaVersion: session.schemaVersion || "1.0.0",
      startedAt: session.startedAt || null,
      completedAt: new Date().toISOString(),
      complete: isComplete(session),
      answers: JSON.parse(JSON.stringify(session.answers)), // a safe copy
      rawScores: raw,        // kept for debugging / tuning the weights
      maxScores: max,        // kept so you can recompute later
      traitScores: traitScores,   // <-- the part recommendations use
      lowConfidenceTraits: lowConfidence
    };
  }

  /* Rounds 2.66666 to 2.67. Keeps the JSON readable. */
  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  /* ========================================================================
     SECTION 5 — SAVING AND LOADING
     ========================================================================
     For now the profile lives in localStorage, which is a small key/value
     store built into the browser. It survives page refreshes but only exists
     on that one device and browser.

     WHEN YOU ADD A REAL BACKEND: keep these function names, and change the
     insides to `fetch("/api/profile", { method: "POST", ... })`. Nothing
     else in your code has to change.
  ======================================================================== */

  var STORAGE_KEY = "seekrx.playerProfile.v1";

  function saveProfile(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return { ok: true };
    } catch (err) {
      // Happens in private browsing modes or when storage is full.
      return fail("Could not save the profile: " + err.message);
    }
  }

  function loadProfile() {
    try {
      var text = localStorage.getItem(STORAGE_KEY);
      if (!text) return null;         // nobody has taken the quiz here yet
      return JSON.parse(text);
    } catch (err) {
      return null;                    // stored text was corrupted
    }
  }

  function clearProfile() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /* ========================================================================
     SECTION 6 — WHAT THE OUTSIDE WORLD CAN USE
     ========================================================================
     Everything below this line is the public API. If it is not listed here,
     your form code cannot reach it.
  ======================================================================== */
  window.SeekrXQuiz = {
    // data you render from
    TRAITS: TRAITS,
    TRAIT_KEYS: TRAIT_KEYS,
    QUESTIONS: QUESTIONS,
    LIKERT_LABELS: LIKERT_LABELS,

    // taking the quiz
    createSession: createSession,
    getQuestion: getQuestion,
    setLikert: setLikert,
    setSingle: setSingle,
    toggleMulti: toggleMulti,

    // validating and finishing
    getUnansweredQuestions: getUnansweredQuestions,
    isComplete: isComplete,
    scoreSession: scoreSession,

    // persistence
    saveProfile: saveProfile,
    loadProfile: loadProfile,
    clearProfile: clearProfile
  };
})();
