(function () {
    "use strict";

    var engine = window.SeekrXQuiz;
    var profile = engine.loadProfile();
    var results = document.querySelector("#profile-results");
    var emptyProfile = document.querySelector("#empty-profile");

    if (!profile || profile.complete !== true || !profile.traitScores) {
        results.hidden = true;
        emptyProfile.hidden = false;
        return;
    }

    var intro = document.createElement("p");
    intro.className = "profile-intro";
    intro.textContent = "These scores range from 0 to 4 and represent the preferences you shared in the SeekrX Quiz.";
    results.appendChild(intro);

    engine.TRAITS.forEach(function (trait) {
        var scoreValue = profile.traitScores[trait.key];
        var row = document.createElement("div");
        var labels = document.createElement("div");
        var name = document.createElement("strong");
        var score = document.createElement("span");
        var track = document.createElement("div");
        var fill = document.createElement("div");

        row.className = "trait-row";
        labels.className = "trait-labels";
        name.textContent = trait.label;
        score.className = "trait-score";
        score.textContent = scoreValue.toFixed(1) + " / 4";
        track.className = "trait-track";
        fill.className = "trait-fill";
        fill.style.width = (scoreValue / 4 * 100) + "%";

        labels.append(name, score);
        track.appendChild(fill);
        row.append(labels, track);
        results.appendChild(row);
    });

    var actions = document.createElement("div");
    var homeLink = document.createElement("a");
    var retakeLink = document.createElement("a");

    actions.className = "profile-actions";
    homeLink.className = "primary-button";
    homeLink.href = "../home-page/home.html";
    homeLink.textContent = "Return Home";
    retakeLink.className = "secondary-button";
    retakeLink.href = "../quiz-page/quiz.html";
    retakeLink.textContent = "Retake Quiz";
    actions.append(homeLink, retakeLink);
    results.appendChild(actions);
})();
