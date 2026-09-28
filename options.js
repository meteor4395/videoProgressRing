const DEFAULT_SETTINGS = {
    siteFilterMode: "blocklist",
    siteFilterDomains: []
};

const form = document.getElementById("settings-form");
const domainsInput = document.getElementById("site-domains");
const status = document.getElementById("save-status");

function showStatus(message, isError = false) {
    status.textContent = message;
    status.dataset.error = String(isError);
}

function normalizeDomainEntries(text) {
    const domains = new Set();
    const invalidEntries = [];

    for (const rawEntry of text.split(/\r?\n/)) {
        let entry = rawEntry.trim().toLowerCase().replace(/^\*\./, "");
        if (!entry) continue;

        try {
            const url = new URL(entry.includes("://") ? entry : `https://${entry}`);
            const hostname = url.hostname.replace(/\.$/, "");
            const validHostname = /^(\[[0-9a-f:]+\]|[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*)$/i;
            if (!hostname || !validHostname.test(hostname)) throw new Error("Invalid hostname");
            domains.add(hostname);
        } catch {
            invalidEntries.push(rawEntry.trim());
        }
    }

    return { domains: [...domains], invalidEntries };
}

async function loadSettings() {
    const saved = await browser.storage.sync.get(DEFAULT_SETTINGS);
    const mode = saved.siteFilterMode === "allowlist" ? "allowlist" : "blocklist";
    document.querySelector(`input[name="filter-mode"][value="${mode}"]`).checked = true;
    domainsInput.value = Array.isArray(saved.siteFilterDomains)
        ? saved.siteFilterDomains.join("\n")
        : "";
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const { domains, invalidEntries } = normalizeDomainEntries(domainsInput.value);
    if (invalidEntries.length > 0) {
        showStatus(`Check these entries: ${invalidEntries.join(", ")}`, true);
        return;
    }

    const mode = form.querySelector('input[name="filter-mode"]:checked').value;
    try {
        await browser.storage.sync.set({
            siteFilterMode: mode,
            siteFilterDomains: domains
        });
        domainsInput.value = domains.join("\n");
        showStatus("Settings saved. Open tabs update automatically.");
    } catch {
        showStatus("Settings could not be saved. Try again.", true);
    }
});

loadSettings().catch(() => showStatus("Could not load saved settings.", true));