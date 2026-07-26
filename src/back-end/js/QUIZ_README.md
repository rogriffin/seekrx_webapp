# SeekrX — Taste Quiz Engine

The sign-up quiz that turns a new user into ten numbers, plus a matcher that ranks games against those numbers.

**Files in this folder**

| File | What it does | Do you edit it? |
|---|---|---|
| `quiz.js` | Questions, answer tracking, scoring, saving | Yes — this is where questions live |
| `recommend.js` | Ranks games against a finished profile | Rarely — tune the weights later |
| `games.example.json` | 18 example game records to test against | Yes — this becomes your database |
| `README.md` | This file | Keep it updated |

There is deliberately **no HTML and no CSS here.** The quiz logic does not know or care what your page looks like, which means you can rebuild the visuals as many times as you want without touching the scoring.

---

## 1. Quick start

```html
<!DOCTYPE html>
<html>
<body>
  <div id="quiz"></div>
  <button id="finish">See my recommendations</button>

  <script src="quiz.js"></script>
  <script src="recommend.js"></script>
  <script src="app.js"></script>   <!-- the file YOU write -->
</body>
</html>
```

Load order matters: `quiz.js` first, then `recommend.js`, then your own code.

Inside `app.js`:

```js
// 1. Start a quiz
const session = SeekrXQuiz.createSession();

// 2. Loop over SeekrXQuiz.QUESTIONS and build your HTML from the data

// 3. When an input changes, record it
SeekrXQuiz.setLikert(session, "a_action", 3);
SeekrXQuiz.setSingle(session, "b_enemy", "plan");
SeekrXQuiz.toggleMulti(session, "b_goals", "story");

// 4. When they submit
if (SeekrXQuiz.isComplete(session)) {
  const profile = SeekrXQuiz.scoreSession(session);
  SeekrXQuiz.saveProfile(profile);
  console.log(profile.traitScores);
}
```

**Try it with no HTML at all.** Open any page with the two scripts loaded, open the browser console, and paste the block above. You should see ten numbers. That's the whole engine working.

---

## 2. The ten traits

Every question feeds points into these. They are the shared language between a player and a game, so the keys must be identical in both places.

| Key | 0 means | 4 means |
|---|---|---|
| `action` | Slow and calm | Constant action |
| `strategy` | Mostly instinctive | Heavy planning and decision-making |
| `mechanical` | Easy to control | Demanding execution and skill |
| `exploration` | Guided and contained | Discovery-focused and open |
| `narrative` | Little emphasis on story | Story is central |
| `creative` | Predetermined actions and solutions | Building, designing, experimenting |
| `social` | Entirely independent | Teamwork and communication essential |
| `competitive` | No emphasis on beating others | Competition is the main purpose |
| `progression` | Mostly self-contained sessions | Extensive upgrading and collecting |
| `tension` | Relaxing and forgiving | Stressful, punishing, suspenseful |

---

## 3. The API

Everything hangs off the global `SeekrXQuiz` object.

### Data to render from

| Thing | Type | Notes |
|---|---|---|
| `SeekrXQuiz.QUESTIONS` | array | Loop over this to build the form |
| `SeekrXQuiz.TRAITS` | array | `{ key, label, low, high }` — use for a results summary |
| `SeekrXQuiz.TRAIT_KEYS` | array of strings | Just the keys |
| `SeekrXQuiz.LIKERT_LABELS` | array of 5 strings | "Strongly disagree" → "Strongly agree" |

### Question shapes

Read `question.type` and render accordingly. Three types, nothing else:

```js
// type: "likert"  -> five radio buttons or a slider, values 0..4
{ id: "a_action", type: "likert", section: "About how you play",
  text: "I prefer games with frequent action...", points: { action: 1 } }

// type: "single"  -> radio buttons, one per option
{ id: "b_enemy", type: "single", section: "Scenarios", text: "...",
  options: [ { id: "rush", text: "Rush in...", points: {...} }, ... ] }

// type: "multi"   -> checkboxes, cap selections at maxSelections
{ id: "b_goals", type: "multi", maxSelections: 2, section: "Scenarios",
  text: "...", options: [ ... ] }
```

You never need to read `points` in your UI code. That's the scoring engine's business. Do use `section` to group questions into pages or headings, and `maxSelections` to write hints like "choose up to 3."

### Recording answers

| Function | When to call it | Returns |
|---|---|---|
| `createSession()` | Once, when the quiz page loads | a session object |
| `setLikert(session, id, 0..4)` | On a scale input change | `{ ok: true }` or `{ ok: false, error }` |
| `setSingle(session, id, optionId)` | On a radio change | same |
| `toggleMulti(session, id, optionId)` | On a checkbox change | `{ ok, selected }` or `{ ok: false, error }` |

**Always check `.ok`.** `toggleMulti` refuses to go over `maxSelections` and returns an error instead. Use that to show the message and un-check the box the user just clicked:

```js
const result = SeekrXQuiz.toggleMulti(session, question.id, optionId);
if (!result.ok) {
  checkbox.checked = false;        // undo the click
  showMessage(result.error);       // "You can choose at most 2 options here."
}
```

`toggleMulti` is a toggle: clicking a selected option removes it. That's usually the behaviour you want.

### Finishing

| Function | Purpose |
|---|---|
| `getUnansweredQuestions(session)` | Array of question ids still missing. Empty = done |
| `isComplete(session)` | `true` / `false` |
| `scoreSession(session)` | Returns the profile DTO. Safe to call mid-quiz for a live preview |
| `saveProfile(profile)` | Writes to localStorage |
| `loadProfile()` | Reads it back, or `null` if nobody has taken the quiz |
| `clearProfile()` | Wipes it — useful for a "retake quiz" button |

Use `getUnansweredQuestions` to keep the submit button disabled and to highlight what's missing:

```js
const missing = SeekrXQuiz.getUnansweredQuestions(session);
finishButton.disabled = missing.length > 0;
missing.forEach(id => document.getElementById("q-" + id).classList.add("missing"));
```

---

## 4. The two JSON shapes

### The player profile (output of `scoreSession`)

```json
{
  "schemaVersion": "1.0.0",
  "startedAt": "2026-07-24T18:02:11.004Z",
  "completedAt": "2026-07-24T18:05:49.882Z",
  "complete": true,
  "answers": {
    "a_action": 4,
    "b_enemy": "rush",
    "b_goals": ["rank", "train"],
    "c_genres": ["shooter", "fighting", "action"]
  },
  "rawScores":   { "action": 9,  "strategy": 5,  "...": 0 },
  "maxScores":   { "action": 13, "strategy": 13, "...": 0 },
  "traitScores": { "action": 2.77, "strategy": 0.62, "...": 0 },
  "lowConfidenceTraits": []
}
```

- `traitScores` is the part recommendations use. Always 0 to 4.
- `rawScores` / `maxScores` are kept for debugging. When a score looks wrong, these tell you whether the user under-earned or the question set over-offered.
- `answers` is kept so you can let someone edit their quiz later instead of retaking it.
- `lowConfidenceTraits` lists traits that no answered question could measure. Those get the neutral value 2 rather than 0, so they don't drag matching around. Should normally be empty.

### A game record

See `games.example.json`. One record, trimmed:

```json
{
  "id": "elden-ring",
  "name": "Elden Ring",
  "releaseYear": 2022,
  "developer": "FromSoftware",
  "publisher": "Bandai Namco Entertainment",
  "storefronts": ["steam", "playstation", "xbox"],
  "steamAppId": 1245620,
  "platforms": ["windows", "playstation5", "xbox-series"],
  "playerModes": ["singleplayer", "co-op", "pvp"],
  "genres": ["action", "rpg", "adventure"],
  "tags": ["souls-like", "open-world", "difficult"],
  "priceModel": "paid",
  "shortDescription": "Punishing open-world action RPG...",
  "traits": {
    "action": 3, "strategy": 2.5, "mechanical": 4, "exploration": 4,
    "narrative": 2.5, "creative": 1.5, "social": 1.5, "competitive": 1,
    "progression": 3.5, "tension": 4
  },
  "dataQuality": { "verified": false, "ratingMethod": "manual-estimate", "ratedBy": "seed" }
}
```

Rules for adding games:

1. **All ten traits, every time.** A missing trait is treated as 2 (neutral), which quietly makes bad matches look fine.
2. **Rate it as most people play it.** Fortnite has a creative mode, but the median session is Battle Royale. Rate the median.
3. **`genres` must use the same ids as the `c_genres` options** in `quiz.js` (`shooter`, `roguelike`, `visual_novel`, …). That lets you filter *and* match with one field.
4. **`id` is permanent.** Once a user has it in a wishlist, changing it breaks their data.
5. **Sanity-check traits against `playerModes`.** A game with `["singleplayer"]` and `social: 4` is a data-entry mistake.

`games.example.json` wraps the array in an object, so load it like this:

```js
fetch("games.example.json")
  .then(response => response.json())
  .then(data => {
    const games = data.games;   // <-- note the .games
  });
```

---

## 5. How scoring works

The trait table in the design doc is a 0-to-4 scale, but the questions hand out points in chunks of 1, 2, 3 and 4 across many questions. Add them up naively and `action` can reach 13 while `narrative` caps out at 9 — so a 9 in narrative (a perfect score) would look *worse* than a 10 in action (a mediocre one).

So the engine tracks two numbers per trait and divides:

```
raw   = points the user actually earned
max   = the most they COULD have earned, given the answers they gave
score = raw / max * 4
```

Everything lands back on 0-to-4 and every trait is comparable.

**"Given the answers they gave"** matters for the checkbox questions. If someone picks one genre instead of three, we only count the best *one* genre's worth of points in `max`. Otherwise picking fewer options would silently punish them.

**Reverse-scored questions.** One question — *"I prefer games that feel relaxing and forgiving"* — points the wrong way. Agreeing means you want **less** tension. It's marked `reverse: true` and the engine uses `4 - answer`. Without that flag the quiz would recommend horror games to people who asked for calm ones. If you add more "I prefer the low end" statements, mark them the same way.

**"Playing alone" earns zero points on purpose.** Because `max` still counts what that question *could* have paid out, choosing solo produces a genuinely low `social` score instead of a missing one. Don't "fix" this by adding negative points.

---

## 6. Known behaviour worth understanding

These aren't bugs, but they're the levers you'll want when the recommendations feel off.

**Tension is measured three times, everything else once.** Three separate statements feed `tension`; the other nine traits get one each. Normalisation keeps the scale fair, but `tension` is measured more *precisely* than the rest. If a trait feels noisy, the fix is to write a second statement for it.

**The "pick two goals" question dilutes traits you didn't pick.** It offers points across seven traits but only lets you choose two, so a player who is genuinely action-focused loses `action` points if they pick "climb leaderboards" and "train skills" instead of "defeat a foe." In testing, a maxed-out shooter fan came out at `action: 2.77` rather than 4. That's arguably correct — they told you what satisfies them — but if you'd rather that question only *add* signal, change the multi-select branch in `scoreSession` so `max` counts only the traits the selected options touch. Try both and see which produces better recommendations.

**Scenario answers can outweigh the direct statements.** Answering "neutral" on the strategy statement but choosing "rush in on instinct" gives a low strategy score, because the scenario is worth 4 points and the statement is worth 4 at most. If that feels too aggressive, add a `weight` to the scenario `points` values.

**18 games is not enough to feel smart.** With a small library, the best match for an unusual profile can still be a mediocre fit. Nothing is wrong with the maths — it needs volume. Aim for a few hundred before judging quality.

---

## 7. The question we haven't built yet

The design doc has *"Select up to five games you have enjoyed."* It's deliberately missing from `quiz.js`, because unlike every other question its scoring isn't hand-written — it comes from the game database:

1. Look up the trait values of the games they picked.
2. Average them.
3. Blend that average into the trait scores from the rest of the quiz (start at something like 30% games / 70% questions).

That means it can only be built after there's a real database, and its accuracy is capped by the accuracy of the trait ratings in that database. Build the database first.

---

## 8. Handoff prompt for building the HTML and CSS

Paste this into whatever assistant is building the front end, along with the contents of `quiz.js`:

> I have a finished JavaScript quiz engine (`quiz.js`, attached) that exposes a global object `SeekrXQuiz`. Build me `index.html` and `styles.css` for it. Requirements:
>
> - Do not modify `quiz.js` and do not rewrite the scoring. Only call its public functions.
> - Build the form dynamically by looping over `SeekrXQuiz.QUESTIONS`. Do not hard-code question text — if a question changes in the data file, the page must update on its own.
> - Render by `question.type`: `"likert"` → five radio buttons labelled with `SeekrXQuiz.LIKERT_LABELS`; `"single"` → one radio per option; `"multi"` → checkboxes, with a hint showing `maxSelections`.
> - Group questions using `question.section` — one section per screen, with a progress indicator.
> - On every input change, call `setLikert` / `setSingle` / `toggleMulti`. Check the returned `.ok`; if it's false, show `.error` and revert the input.
> - Keep the submit button disabled while `SeekrXQuiz.getUnansweredQuestions(session).length > 0`, and mark the unanswered questions visually.
> - On submit: call `scoreSession`, then `saveProfile`, then show a results screen with a bar per trait using `SeekrXQuiz.TRAITS` for labels (`low` on the left, `high` on the right).
> - Vanilla HTML/CSS/JS only. No frameworks, no build step, no libraries. It has to run by opening `index.html` in a browser.
> - Keyboard accessible: real `<label>` elements tied to inputs, visible focus outlines.
>
> Put your JS in a separate `app.js` file. Comment it heavily — a beginner needs to be able to follow it.

---

## 9. Moving off localStorage

`saveProfile` / `loadProfile` currently use `localStorage`, which lives in one browser on one device. It's the right choice for a prototype and the wrong choice for a real site — a user who signs in on their phone would have to retake the quiz.

When there's a backend, change the insides of those two functions to `fetch()` calls and leave the names alone. Nothing else in the codebase has to change, which is the entire reason they're wrapped in functions.

---

## 10. Before this touches real users

- [ ] Verify every `steamAppId` in `games.example.json` against the Steam API. They are best-effort and unverified.
- [ ] Have two or three people rate the same 10 games independently and compare. Where they disagree by more than 1, the trait definition needs sharpening, not the rating.
- [ ] Replace `dataQuality.ratingMethod: "manual-estimate"` as ratings get better sourced.
- [ ] Decide what happens to a stored profile when `QUESTIONS` changes. `schemaVersion` exists for this — bump it when you add or remove a question, and decide whether old profiles get rescored from `answers` or asked to retake.
