/* ==========================================================================
   SeekrX — Recommendation Matcher
   File: recommend.js
   Version: 1.0.0

   WHAT THIS FILE IS
   -----------------
   quiz.js turns a person into ten numbers. games.example.json describes each
   game with the same ten numbers. This file compares the two and ranks the
   games from best fit to worst.

   THE IDEA (no scary maths, promise)
   ----------------------------------
   Think of each trait as one question: "how far apart are the player and the
   game on this?" A player at 4.0 action and a game at 1.0 action are 3 apart.
   Add up the distances across all ten traits, and the game with the SMALLEST
   total distance is the best match.

   Two refinements on top of that:
     1. We square each distance before adding it. This punishes one big
        mismatch more than several small ones — being wrong by 4 on tension
        matters much more than being wrong by 1 on four different traits.
     2. Traits can be weighted. A player who scored 4.0 on competitive
        clearly cares about competition, so getting that trait right should
        count for more than a trait they scored near the middle on.

   HOW TO LOAD IT
   --------------
       <script src="quiz.js"></script>
       <script src="recommend.js"></script>
       <script src="app.js"></script>
   ========================================================================== */

(function () {
  "use strict";

  /* The ten trait keys, borrowed from quiz.js so the two files can never
     drift apart. If quiz.js has not loaded yet, we stop with a clear error
     instead of failing mysteriously later. */
  if (!window.SeekrXQuiz) {
    throw new Error("recommend.js requires quiz.js to be loaded first.");
  }
  var TRAIT_KEYS = window.SeekrXQuiz.TRAIT_KEYS;

  /* ------------------------------------------------------------------------
     buildWeights(traitScores)
     Decides how much each trait matters to THIS player.

     A score of 0 or 4 is a strong opinion. A score of 2 is a shrug.
     `distanceFromMiddle` is 0 for a shrug and 2 for a strong opinion, so
     the weight lands between 1.0 (ignore-ish) and 2.0 (matters a lot).
  ------------------------------------------------------------------------ */
  function buildWeights(traitScores) {
    var weights = {};
    TRAIT_KEYS.forEach(function (key) {
      var score = (typeof traitScores[key] === "number") ? traitScores[key] : 2;
      var distanceFromMiddle = Math.abs(score - 2); // 0 .. 2
      weights[key] = 1 + (distanceFromMiddle / 2);  // 1.0 .. 2.0
    });
    return weights;
  }

  /* ------------------------------------------------------------------------
     matchScore(traitScores, gameTraits, weights)
     Returns a 0..100 fit percentage for one game. Higher is better.
  ------------------------------------------------------------------------ */
  function matchScore(traitScores, gameTraits, weights) {
    var weightedSquares = 0; // running total of weight x (gap squared)
    var weightTotal = 0;

    TRAIT_KEYS.forEach(function (key) {
      var player = (typeof traitScores[key] === "number") ? traitScores[key] : 2;
      var game = (typeof gameTraits[key] === "number") ? gameTraits[key] : 2;
      var weight = weights[key];

      var gap = player - game;              // can be negative
      weightedSquares += weight * gap * gap; // squaring also removes the sign
      weightTotal += weight;
    });

    /* Turn the total into an average gap, then flip it into a percentage.
       The worst possible gap on a 0..4 scale is 4, so gap/4 gives 0..1. */
    var averageSquaredGap = weightedSquares / weightTotal;
    var averageGap = Math.sqrt(averageSquaredGap);
    var fit = (1 - (averageGap / 4)) * 100;

    return Math.round(Math.max(0, Math.min(100, fit)));
  }

  /* ------------------------------------------------------------------------
     recommend(profile, games, options)

     profile : the object returned by SeekrXQuiz.scoreSession()
     games   : the array loaded from games.example.json
     options : { limit: 10 }   (optional — how many results to return)

     Returns an array sorted best-first:
       [ { game: {...}, fit: 87, worstTrait: "tension" }, ... ]
  ------------------------------------------------------------------------ */
  function recommend(profile, games, options) {
    options = options || {};
    var limit = options.limit || 10;

    if (!profile || !profile.traitScores) {
      throw new Error("recommend() needs a profile from SeekrXQuiz.scoreSession().");
    }
    if (!Array.isArray(games)) {
      throw new Error("recommend() needs an array of games.");
    }

    var weights = buildWeights(profile.traitScores);

    var results = games.map(function (game) {
      return {
        game: game,
        fit: matchScore(profile.traitScores, game.traits || {}, weights),
        worstTrait: findWorstTrait(profile.traitScores, game.traits || {})
      };
    });

    /* Sort by fit, highest first. */
    results.sort(function (a, b) { return b.fit - a.fit; });

    return results.slice(0, limit);
  }

  /* Which single trait is this game furthest off on? Handy for showing the
     user "great match, but more stressful than you usually like." */
  function findWorstTrait(traitScores, gameTraits) {
    var worstKey = null;
    var worstGap = -1;

    TRAIT_KEYS.forEach(function (key) {
      var player = (typeof traitScores[key] === "number") ? traitScores[key] : 2;
      var game = (typeof gameTraits[key] === "number") ? gameTraits[key] : 2;
      var gap = Math.abs(player - game);
      if (gap > worstGap) {
        worstGap = gap;
        worstKey = key;
      }
    });

    return worstKey;
  }

  /* Public API. */
  window.SeekrXRecommend = {
    recommend: recommend,
    matchScore: matchScore,
    buildWeights: buildWeights
  };
})();
