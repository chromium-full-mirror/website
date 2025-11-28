---
breadcrumbs:
- - /chromium-os
  - Chromium OS
- - /chromium-os/developer-library
  - Developer Library
- - /chromium-os/developer-library/guides
  - Guides
- - /chromium-os/developer-library/guides/testing
  - Testing
page_name: puppeteer-system-app-testing-on-cros
title: Running Puppeteer Tests to interact with System apps on CrOS Devices
---

This document outlines techniques for automating CrOS system
applications (System Web Apps) such as Files, Media App, and Settings using
Puppeteer and the Chrome DevTools Protocol (CDP).
For a general guide on setting up Puppeteer for web testing on CrOS, refer to
[Running Puppeteer Tests on CrOS Devices](/chromium-os/developer-library/guides/testing/web-testing/).

[TOC]

## Prerequisites

This guide assumes you have completed the [Prerequisites for Running Puppeteer Tests on CrOS Devices](/chromium-os/developer-library/guides/testing/web-testing/#1-prerequisites).


**Stability Warning** While Puppeteer allows you to interact with system-level
apps, these tests rely on internal DOM structures (often specific Shadow DOM
hierarchies). unlike public web APIs, ChromeOS system UI changes frequently.

*   Tests will break if the UI structure changes in a future OS update.
*   Selectors (e.g., xf-tree-item) should be considered brittle and require
    regular maintenance.

## Finding App Targets

System apps do not appear as standard browser tabs. You must locate the correct
"Target" (window or background page) to attach your Puppeteer session.

*   Manual Inspection: Open `chrome://inspect/#other` on your host machine while
    connected to the DUT to inspect system app targets and find their URLs.
*   Automation: Use `browser.waitForTarget` to filter by URL and type.

```javascript
// Example: Finding the Files App target
const filesAppTarget = await browser.waitForTarget(
    target => target.url().startsWith('chrome://file-manager') && target.type()
    === 'page'
);
```

## Key Automation Techniques

*   Launching Apps: System Web Apps usually require the [PWA CDP Domain](https://chromedevtools.github.io/devtools-protocol/tot/PWA/)
    to launch via manifest IDs.
    ```javascript
    await send(null, 'PWA.launch', { manifestId: 'chrome://file-manager' });
    ```
*   Handling Shadow DOM: System apps heavily utilize Web Components. Standard
    Puppeteer selectors (e.g., page.$('#id')) cannot pierce the Shadow DOM
    boundary. You must traverse .shadowRoot explicitly.
    ```javascript
    // Example: Piercing Shadow DOM to find the "Downloads" folder
    const element = await page.waitForFunction(() => {
        const host = document.querySelector('xf-tree-item');
        return host.shadowRoot?.querySelector('span#tree-label');
    });
    ```

## Example: Interacting with the Files App

This test simulates a full user workflow:
1.  **Download a file:** Initiates a download within the browser.
2.  **Launch Files App:** Opens the native ChromeOS Files application.
3.  **Navigate to Downloads:** Selects the "Downloads" folder in the Files app.
4.  **Find and Open File:** Locates the newly downloaded file and double-clicks
    it to open in the appropriate viewer (e.g., the Media App for text files).
5.  **Verify Content:** Extracts and validates the content of the opened file.
6.  **Cleanup:** Deletes the downloaded file using the Files app UI.

The `test-file-download.js` script is available in the same directory as this
guide. You can view its content [here](./test-file-download.js).

To run this test:
1.  Ensure your SSH tunnel is active.

    (host)
    ```bash
    $ ssh -L ${PORT}:localhost:${PORT} root@${DEVICE_IP}
    ```
2.  Open a new terminal on your Linux host, navigate to the directory where
    you saved `test-file-download.js`, and run:

    (host)
    ```bash
    $ node test-file-download.js ${PORT}
    ```
