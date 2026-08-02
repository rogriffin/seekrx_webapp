(function () {
    "use strict";

    var newUserPrompt = document.querySelector(".new-user-prompt");
    var returningUserPrompt = document.querySelector(".returning-user-prompt");
    var status = document.querySelector("#recommendation-status");
    var grid = document.querySelector("#recommendation-grid");

    function formatList(items) {
        if (!Array.isArray(items) || items.length === 0) return "Not listed";
        return items.map(function (item) {
            return String(item).replace(/-/g, " ");
        }).join(" · ");
    }

    function renderGameCard(match) {
        var game = match.game;
        var card = document.createElement("article");
        var header = document.createElement("div");
        var title = document.createElement("h3");
        var score = document.createElement("span");
        var description = document.createElement("p");
        var details = document.createElement("div");
        var genres = document.createElement("p");
        var platforms = document.createElement("p");
        var price = document.createElement("p");

        card.className = "game-card";
        header.className = "game-card-header";
        title.textContent = game.name || "Untitled game";
        score.className = "match-score";
        score.textContent = match.fit + "% Match";
        description.className = "game-description";
        description.textContent = game.shortDescription || "No description is available yet.";
        details.className = "game-details";
        genres.className = "game-genres";
        genres.textContent = formatList(game.genres);
        platforms.textContent = "Platforms: " + formatList(game.platforms);
        price.textContent = "Price: " + formatList(game.priceModel ? [game.priceModel] : []);

        header.append(title, score);
        details.append(genres, platforms, price);
        card.append(header, description, details);
        return card;
    }

    async function loadRecommendations(profile) {
        try {
            var gamesUrl = new URL("../../../back-end/storage/games.example.json", window.location.href);
            var response = await fetch(gamesUrl);

            if (!response.ok) throw new Error("Game catalogue request failed with status " + response.status + ".");

            var data = await response.json();
            if (!Array.isArray(data.games) || data.games.length === 0) {
                throw new Error("The game catalogue does not contain any games.");
            }

            var matches = window.SeekrXRecommend.recommend(profile, data.games, { limit: 9 });
            grid.replaceChildren();
            matches.forEach(function (match) {
                grid.appendChild(renderGameCard(match));
            });
            status.hidden = true;
        } catch (error) {
            status.classList.add("error");
            status.textContent = "Recommendations could not be loaded. Please try refreshing the page.";
            console.error("SeekrX recommendations could not be loaded.", error);
        }
    }

    var savedProfile = window.SeekrXQuiz.loadProfile();
    if (!savedProfile || savedProfile.complete !== true) return;

    newUserPrompt.hidden = true;
    returningUserPrompt.hidden = false;
    loadRecommendations(savedProfile);
})();
