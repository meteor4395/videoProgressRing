# Video Progress Ring

Video Progress Ring is a Firefox extension that displays a compact circular progress indicator over videos while they are playing. The ring shows the current playback percentage, so you can check how far a video has progressed without looking for the player's timeline.

The extension tracks standard HTML video elements. The indicator follows the video as the page scrolls or resizes, and disappears when playback is paused or ends. It does not add controls or change playback.

## Site Settings

By default, the extension uses a **blacklist**: the indicator can appear on all sites except domains you list. You can switch to a **whitelist** to show it only on listed domains. Entries match their subdomains too, so `example.com` also matches `video.example.com`.

Use the extension button in the Firefox toolbar to see the current site's domain and add or remove it from the active list. Select **Blacklist and whitelist settings** to change the mode or edit the full list. Save your settings; open tabs update automatically.

## Install in Firefox

To try the extension locally, load it as a temporary add-on:

1. Download or clone this project and extract it if it is an archive.
2. Open Firefox and enter `about:debugging` in the address bar.
3. Select **This Firefox** in the sidebar.
4. Select **Load Temporary Add-on...**.
5. Browse to the project folder and select `manifest.json`.
6. Open a page with a video and start playback. The progress ring should appear over the video.

Temporary add-ons are removed when Firefox closes. To use the extension beyond a temporary session, package and sign it through Mozilla Add-ons (AMO), then install the signed add-on.

## Requirements and Limitations

- Firefox 109 or later.
- The ring works with HTML video elements on pages where Firefox allows extensions to run. It may not appear on browser-internal pages or in players that do not expose a standard video element.
- Site filtering is based on the page's domain, and settings are stored with Firefox extension sync storage.