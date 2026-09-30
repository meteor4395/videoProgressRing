const currentSite = document.getElementById("current-site");
const siteStatus = document.getElementById("site-status");
const toggleSiteButton = document.getElementById("toggle-site");
let activeHostname = "";
let settings = { siteFilterMode: "blocklist", siteFilterDomains: [] };

function getMatchingDomain(hostname) {
    return settings.siteFilterDomains
        .filter((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
        .sort((first, second) => second.length - first.length)[0] || "";
}

function updateToggleButton() {
    const matchingDomain = getMatchingDomain(activeHostname);
    const modeName = settings.siteFilterMode === "allowlist" ? "whitelist" : "blacklist";
    const action = matchingDomain ? "Remove from" : "Add to";
    toggleSiteButton.textContent = `${action} ${modeName}`;
    siteStatus.textContent = matchingDomain
        ? `Listed as ${matchingDomain}`
        : `Not in the ${modeName}`;
    toggleSiteButton.disabled = false;
}

async function loadCurrentSite() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    try {
        activeHostname = new URL(tab.url).hostname.toLowerCase().replace(/\.$/, "");
    } catch {
        throw new Error("This page cannot be added to a site list.");
    }
    if (!activeHostname) throw new Error("This page has no site domain.");

    currentSite.textContent = activeHostname;
    const saved = await browser.storage.sync.get({
        siteFilterMode: "blocklist",
        siteFilterDomains: []
    });
    settings = {
        siteFilterMode: saved.siteFilterMode === "allowlist" ? "allowlist" : "blocklist",
        siteFilterDomains: Array.isArray(saved.siteFilterDomains)
            ? saved.siteFilterDomains.filter((domain) => typeof domain === "string").map((domain) => domain.toLowerCase())
            : []
    };
    updateToggleButton();
}

toggleSiteButton.addEventListener("click", async () => {
    const matchingDomain = getMatchingDomain(activeHostname);
    const nextDomains = matchingDomain
        ? settings.siteFilterDomains.filter((domain) => domain !== matchingDomain)
        : [...settings.siteFilterDomains, activeHostname];

    toggleSiteButton.disabled = true;
    try {
        await browser.storage.sync.set({ siteFilterDomains: nextDomains });
        settings.siteFilterDomains = nextDomains;
        updateToggleButton();
    } catch {
        siteStatus.textContent = "Could not save this site. Try again.";
        toggleSiteButton.disabled = false;
    }
});

browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || (!changes.siteFilterMode && !changes.siteFilterDomains)) return;

    if (changes.siteFilterMode) {
        settings.siteFilterMode = changes.siteFilterMode.newValue === "allowlist" ? "allowlist" : "blocklist";
    }
    if (changes.siteFilterDomains) {
        settings.siteFilterDomains = Array.isArray(changes.siteFilterDomains.newValue)
            ? changes.siteFilterDomains.newValue
                .filter((domain) => typeof domain === "string")
                .map((domain) => domain.toLowerCase())
            : [];
    }
    updateToggleButton();
});

document.getElementById("open-settings").addEventListener("click", () => {
    browser.runtime.openOptionsPage();
});

loadCurrentSite().catch((error) => {
    currentSite.textContent = "Unavailable";
    siteStatus.textContent = error.message;
    toggleSiteButton.disabled = true;
});