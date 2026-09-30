(() => {
    const circumference = 2 * Math.PI * 24;
    const trackedVideos = new Map();
    const defaultSettings = {
        siteFilterMode: "blocklist",
        siteFilterDomains: [],
        middleClickSeekEnabled: true
    };
    let settings = { ...defaultSettings };
    let settingsLoaded = false;

    function getSiteHostname() {
        let hostname = window.location.hostname;
        try {
            if (window !== window.top && document.referrer) {
                hostname = new URL(document.referrer).hostname || hostname;
            }
        } catch {
            // Keep the frame's own hostname if its referrer is unavailable.
        }
        return hostname.toLowerCase().replace(/\.$/, "");
    }

    function isSiteAllowed() {
        if (!settingsLoaded) return false;
        const hostname = getSiteHostname();
        const matchesDomain = settings.siteFilterDomains.some((domain) =>
            hostname === domain || hostname.endsWith(`.${domain}`)
        );
        return settings.siteFilterMode === "allowlist" ? matchesDomain : !matchesDomain;
    }

    function createOverlay() {
        const overlay = document.createElement("div");
        overlay.className = "video-progress-ring";
        overlay.setAttribute("aria-hidden", "true");
        overlay.setAttribute("popover", "manual");
        overlay.innerHTML = `
            <svg viewBox="0 0 56 56">
                <circle class="video-progress-ring__track" cx="28" cy="28" r="24"></circle>
                <circle class="video-progress-ring__value" cx="28" cy="28" r="24"></circle>
            </svg>
            <span class="video-progress-ring__label">0%</span>
        `;
        document.documentElement.append(overlay);
        if (typeof overlay.showPopover === "function") overlay.showPopover();
        return overlay;
    }

    function updateOverlay(video, overlay) {
        if (video.paused || video.ended || !video.isConnected) {
            overlay.remove();
            trackedVideos.delete(video);
            return;
        }

        const bounds = video.getBoundingClientRect();
        const size = Math.min(56, bounds.width - 12, bounds.height - 12);
        const isVisible = bounds.width > 0 && bounds.height > 0 && size >= 36;
        overlay.hidden = !isVisible;

        if (isVisible) {
            overlay.style.width = `${size}px`;
            overlay.style.height = `${size}px`;
            overlay.style.top = `${Math.max(0, bounds.top + 8)}px`;
            overlay.style.left = `${Math.min(window.innerWidth - size - 8, bounds.right - size - 8)}px`;
            const progress = Number.isFinite(video.duration) && video.duration > 0
                ? Math.min(1, Math.max(0, video.currentTime / video.duration))
                : 0;
            overlay.style.setProperty("--progress-offset", `${circumference * (1 - progress)}`);
            overlay.querySelector(".video-progress-ring__label").textContent = `${Math.round(progress * 100)}%`;
        }
    }

    function startTracking(video) {
        if (trackedVideos.has(video) || !isSiteAllowed()) return;
        const overlay = createOverlay();
        trackedVideos.set(video, overlay);
        updateOverlay(video, overlay);
    }

    function stopTracking(video) {
        const overlay = trackedVideos.get(video);
        if (!overlay) return;
        overlay.remove();
        trackedVideos.delete(video);
    }

    function updateActiveVideos() {
        if (!settingsLoaded) return;
        if (!isSiteAllowed()) {
            for (const video of trackedVideos.keys()) stopTracking(video);
            return;
        }
        document.querySelectorAll("video").forEach((video) => {
            if (!video.paused && !video.ended) startTracking(video);
        });
        scheduleRefresh();
    }

    async function loadSettings() {
        try {
            const saved = await browser.storage.sync.get(defaultSettings);
            settings = {
                siteFilterMode: saved.siteFilterMode === "allowlist" ? "allowlist" : "blocklist",
                siteFilterDomains: Array.isArray(saved.siteFilterDomains)
                    ? saved.siteFilterDomains.filter((domain) => typeof domain === "string").map((domain) => domain.toLowerCase())
                    : [],
                middleClickSeekEnabled: saved.middleClickSeekEnabled !== false
            };
        } catch {
            settings = { ...defaultSettings };
        }
        settingsLoaded = true;
        updateActiveVideos();
    }

    document.addEventListener("play", (event) => {
        if (event.target instanceof HTMLVideoElement && isSiteAllowed()) startTracking(event.target);
    }, true);

    document.addEventListener("pause", (event) => {
        if (event.target instanceof HTMLVideoElement) stopTracking(event.target);
    }, true);

    document.addEventListener("ended", (event) => {
        if (event.target instanceof HTMLVideoElement) stopTracking(event.target);
    }, true);

    function getVideoAtClick(event) {
        const pathVideo = event.composedPath().find((element) => element instanceof HTMLVideoElement);
        if (pathVideo) return pathVideo;

        if (event.target instanceof Element) {
            const parentVideo = event.target.closest("video");
            if (parentVideo instanceof HTMLVideoElement) return parentVideo;
        }

        return document.elementsFromPoint(event.clientX, event.clientY)
            .find((element) => element instanceof HTMLVideoElement) || null;
    }

    document.addEventListener("auxclick", (event) => {
        if (event.button !== 1 || !settings.middleClickSeekEnabled) return;
        const video = getVideoAtClick(event);
        if (!video) return;

        event.preventDefault();
        const nextTime = video.currentTime + 10;
        video.currentTime = Number.isFinite(video.duration)
            ? Math.min(video.duration, nextTime)
            : nextTime;
    }, true);

    function refreshOverlays() {
        for (const [video, overlay] of trackedVideos) updateOverlay(video, overlay);
        if (trackedVideos.size > 0) requestAnimationFrame(refreshOverlays);
    }

    const scheduleRefresh = () => {
        if (trackedVideos.size === 0) return;
        requestAnimationFrame(refreshOverlays);
    };

    document.addEventListener("play", scheduleRefresh, true);
    window.addEventListener("resize", scheduleRefresh);
    window.addEventListener("scroll", scheduleRefresh, true);

    browser.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "sync" && (
            changes.siteFilterMode ||
            changes.siteFilterDomains ||
            changes.middleClickSeekEnabled
        )) loadSettings();
    });
    loadSettings();
})();