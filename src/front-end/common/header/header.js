async function loadHeader() {
    const headerContainer = document.querySelector("#header-container");

    if (!headerContainer) {
        console.error("Header container was not found.");
        return;
    }

    /*
     * import.meta.url points to this JavaScript file.
     * This lets the paths work regardless of which page loads the header.
     */
    const headerHtmlUrl = new URL("./header.html", import.meta.url);
    const headerCssUrl = new URL("./header.css", import.meta.url);

    // Add the header stylesheet if it has not already been loaded.
    if (!document.querySelector('link[data-seekrx-header="true"]')) {
        const stylesheet = document.createElement("link");

        stylesheet.rel = "stylesheet";
        stylesheet.href = headerCssUrl.href;
        stylesheet.dataset.seekrxHeader = "true";

        document.head.appendChild(stylesheet);
    }

    try {
        const response = await fetch(headerHtmlUrl);

        if (!response.ok) {
            throw new Error(`Header request failed: ${response.status}`);
        }

        headerContainer.innerHTML = await response.text();
    } catch (error) {
        console.error("The SeekrX header could not be loaded.", error);
    }
}

loadHeader();