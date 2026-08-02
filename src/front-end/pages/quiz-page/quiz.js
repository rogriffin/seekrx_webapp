(function () {
    "use strict";

    var engine = window.SeekrXQuiz;
    var session = engine.createSession();
    var sections = [];
    var currentStep = 0;

    engine.QUESTIONS.forEach(function (question) {
        if (sections.indexOf(question.section) === -1) sections.push(question.section);
    });

    var form = document.querySelector("#quiz-form");
    var container = document.querySelector("#questions-container");
    var message = document.querySelector("#form-message");
    var backButton = document.querySelector("#back-button");
    var nextButton = document.querySelector("#next-button");
    var finishButton = document.querySelector("#finish-button");
    var results = document.querySelector("#results");

    function makeOption(question, optionId, text, type, value) {
        var wrapper = document.createElement("div");
        var input = document.createElement("input");
        var label = document.createElement("label");
        var inputId = question.id + "-" + optionId;

        wrapper.className = "option";
        input.type = type;
        input.id = inputId;
        input.name = question.id;
        input.value = value;
        label.htmlFor = inputId;
        label.textContent = text;

        if (question.type === "likert") {
            input.checked = session.answers[question.id] === Number(value);
        } else if (question.type === "single") {
            input.checked = session.answers[question.id] === value;
        } else {
            input.checked = Array.isArray(session.answers[question.id])
                && session.answers[question.id].indexOf(value) !== -1;
        }

        input.addEventListener("change", function () {
            var response;
            if (question.type === "likert") {
                response = engine.setLikert(session, question.id, input.value);
            } else if (question.type === "single") {
                response = engine.setSingle(session, question.id, input.value);
            } else {
                response = engine.toggleMulti(session, question.id, input.value);
            }

            if (!response.ok) {
                input.checked = false;
                message.textContent = response.error;
                return;
            }

            message.textContent = "";
            input.closest(".question").classList.remove("missing");
        });

        wrapper.append(input, label);
        return wrapper;
    }

    function renderQuestion(question, number) {
        var fieldset = document.createElement("fieldset");
        var legend = document.createElement("legend");
        var grid = document.createElement("div");

        fieldset.className = "question";
        fieldset.id = "q-" + question.id;
        legend.textContent = number + ". " + question.text;
        grid.className = "option-grid";

        if (question.type === "multi") {
            var hint = document.createElement("span");
            hint.className = "question-hint";
            hint.textContent = question.id === "b_goals"
                ? "Choose exactly " + question.maxSelections + "."
                : "Choose up to " + question.maxSelections + ".";
            legend.appendChild(hint);
        }

        if (question.type === "likert") {
            grid.classList.add("likert-grid");
            engine.LIKERT_LABELS.forEach(function (label, value) {
                grid.appendChild(makeOption(question, value, label, "radio", value));
            });
        } else {
            question.options.forEach(function (option) {
                var inputType = question.type === "single" ? "radio" : "checkbox";
                grid.appendChild(makeOption(question, option.id, option.text, inputType, option.id));
            });
        }

        fieldset.append(legend, grid);
        return fieldset;
    }

    function renderStep() {
        var activeSection = sections[currentStep];
        var questions = engine.QUESTIONS.filter(function (question) {
            return question.section === activeSection;
        });
        var section = document.createElement("div");
        var title = document.createElement("h2");
        var intro = document.createElement("p");

        section.className = "question-section";
        title.textContent = activeSection;
        intro.className = "section-intro";
        intro.textContent = "Choose the answers that feel most like you.";
        section.append(title, intro);

        questions.forEach(function (question) {
            section.appendChild(renderQuestion(question, engine.QUESTIONS.indexOf(question) + 1));
        });

        container.replaceChildren(section);
        document.querySelector("#step-label").textContent = "Step " + (currentStep + 1) + " of " + sections.length;
        document.querySelector("#section-label").textContent = activeSection;
        document.querySelector("#progress-bar").style.width = ((currentStep + 1) / sections.length * 100) + "%";
        backButton.hidden = currentStep === 0;
        nextButton.hidden = currentStep === sections.length - 1;
        finishButton.hidden = currentStep !== sections.length - 1;
        message.textContent = "";
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function validateCurrentStep() {
        var activeIds = engine.QUESTIONS.filter(function (question) {
            return question.section === sections[currentStep];
        }).map(function (question) {
            return question.id;
        });
        var missing = engine.getUnansweredQuestions(session).filter(function (id) {
            return activeIds.indexOf(id) !== -1;
        });

        missing.forEach(function (id) {
            var question = document.querySelector("#q-" + id);
            if (question) question.classList.add("missing");
        });

        if (missing.length) {
            message.textContent = "Please answer every question before continuing.";
            document.querySelector("#q-" + missing[0]).scrollIntoView({ behavior: "smooth", block: "center" });
            return false;
        }
        return true;
    }

    function showResults(profile) {
        var heading = document.createElement("h2");
        var intro = document.createElement("p");
        heading.textContent = "Your player profile is ready";
        intro.className = "results-intro";
        intro.textContent = "We'll use these preferences to find games that fit you.";
        results.replaceChildren(heading, intro);

        engine.TRAITS.forEach(function (trait) {
            var row = document.createElement("div");
            var labels = document.createElement("div");
            var name = document.createElement("strong");
            var score = document.createElement("span");
            var track = document.createElement("div");
            var fill = document.createElement("div");
            row.className = "trait-row";
            labels.className = "trait-labels";
            name.textContent = trait.label;
            score.textContent = profile.traitScores[trait.key].toFixed(1) + " / 4";
            track.className = "trait-track";
            fill.className = "trait-fill";
            fill.style.width = (profile.traitScores[trait.key] / 4 * 100) + "%";
            labels.append(name, score);
            track.appendChild(fill);
            row.append(labels, track);
            results.appendChild(row);
        });

        var homeLink = document.createElement("a");
        homeLink.className = "primary-button";
        homeLink.href = "../home-page/home.html";
        homeLink.textContent = "Return Home";
        results.appendChild(homeLink);
        form.hidden = true;
        document.querySelector(".progress-header").hidden = true;
        document.querySelector(".progress-track").hidden = true;
        results.hidden = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    nextButton.addEventListener("click", function () {
        if (!validateCurrentStep()) return;
        currentStep += 1;
        renderStep();
    });

    backButton.addEventListener("click", function () {
        currentStep -= 1;
        renderStep();
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!validateCurrentStep()) return;
        var profile = engine.scoreSession(session);
        var saved = engine.saveProfile(profile);
        if (!saved.ok) {
            message.textContent = saved.error;
            return;
        }
        showResults(profile);
    });

    renderStep();
})();
