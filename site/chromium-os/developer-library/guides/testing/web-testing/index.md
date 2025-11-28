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
page_name: puppeteer-web-testing-on-cros
title: Running Puppeteer Tests on CrOS Devices
---

This document outlines the steps required to run Puppeteer tests on a
host/development machine (e.g. Linux, macOS or Windows), controlling a Google
Chrome browser instance on a CrOS Device or VM in dev-mode.

[TOC]

## Typography Conventions

Commands are shown with different labels to indicate whether they apply to
* (1) Your host machine (the machine on which you're doing development)
* (2) Your CrOS device or VM (the device on which you test your
web apps)

| Label | Commands |
| --- | --- |
| (host) | on your host machine |
| (device) | on your CrOS device or VM |

Beneath the label, the command(s) you should type are prefixed with a generic
shell prompt, `$`. This distinguishes input from the output of commands, which
is not so prefixed.

Notes are shown using the following conventions:

*   **IMPORTANT NOTE** describes required actions and critical information
*   **SIDE NOTE** describes explanations, related information, and alternative
    options

## 1. Prerequisites

### 1.1.CrOS Device or VM Setup

Your CrOS device needs to be properly configured to allow remote control
of the browser. It is required to use a device or VM with at least CrOS
version `M141-16376.0.0`.

**Recommendation: Use a ChromiumOS VM**
Starting your testing with a ChromiumOS VM is highly recommended. This allows
for faster iteration, easier debugging, and a more controlled environment.
Follow the [Running a Prebuilt ChromiumOS VM](/chromium-os/developer-library/guides/containers/prebuilt-vm-guide/) guide.

#### a. Enable Developer Mode

The device must be in Developer Mode to allow system-level changes.

**IMPORTANT NOTE:** Enabling Developer Mode will wipe all local data from the
device. Ensure you have backed up anything important.

**How to:** The process for enabling Developer Mode can vary slightly by device.
Please refer to the [official Chromium OS documentation for your specific device](/chromium-os/developer-library/guides/device/developer-mode/).

#### b. Remove Root File System (rootfs) Verification

To modify Chrome's startup flags, you'll need to disable rootfs verification.
This allows you to make changes to the otherwise read-only parts of the
filesystem.

For detailed instructions, refer to the official documentation on
[Making Changes to the Filesystem](/chromium-os/developer-library/guides/device/developer-mode/#making-changes-to-the-filesystem).

**SECURITY WARNING:** Disabling rootfs verification and enabling remote
debugging significantly reduces the security of your CrOS device. Do not
perform these actions on a device that contains sensitive information.
Avoid connecting the device to public or untrusted networks while in this
state, as it could be vulnerable to attacks.

First, execute the script to disable rootfs verification:
(device)
```bash
$ sudo /usr/share/vboot/bin/make_dev_ssd.sh \
  --remove_rootfs_verification --force && sudo reboot
```

After the device reboots, you must remount the filesystem as read-write each
time you want to make changes:
(device)
```bash
$ sudo mount -o remount,rw /
```

#### c. Enable Chrome DevTools Remote Debugging

You need to start Chrome with the remote debugging port and the PWA handler
enabled.

**How to:**
1.  After removing rootfs verification and rebooting, open a shell on the
    device (as root).
2.  Add the `--remote-debugging-port` flag to Chrome's startup by editing or
    creating the `/etc/chrome_dev.conf` file:
    (device)
    ```bash
    $ echo "--remote-debugging-port=${PORT}" >> /etc/chrome_dev.conf
    ```
3.  Add the `--enable-devtools-pwa-handler` flag to the same file. This flag
    enables testing PWAs and IWAs on the platform:
    (device)
    ```bash
    $ echo "--enable-devtools-pwa-handler" >> /etc/chrome_dev.conf
    ```
4.  **For IWA testing, enable the `IsolatedWebAppDevMode` feature flag:**
    You can achieve this manually:
    *   On the CrOS device, open `chrome://flags`.
    *   Search for the flag `#enable-isolated-web-app-dev-mode`.
    *   Change it to `Enabled`.
    Alternatively, you can set it in the command line flags:
    (device)
    ```bash
    $ echo "--enable-features=IsolatedWebAppDevMode" >> /etc/chrome_dev.conf
    ```
5.  Reboot the device or restart the UI:
    (device)
    ```bash
    $ sudo reboot
    ```
    **Verification:** After Chrome restarts, you can check if the port is
    listening locally on the device:
    (device)
    ```bash
    $ netstat -tulnp | grep ${PORT}
    ```
    You should see a line indicating that a process is listening on port 9222,
    similar to this:
    ```
    tcp   0   0.  127.0.0.1:9222    0.0.0.0:*     LISTEN      112370/chrome
    ```

Your CrOS device is now ready for testing. You can proceed to
login as a user through the UI (with a dedicated account used for testing).

### 1.2. Host Machine

The host machine can be any operating system, but in this guide, we will use
Linux as an example. Install packages and dependencies for Puppeteer. Refer
to the [official Puppeteer installation documentation](https://pptr.dev/guides/installation) for details.

## 2. Establishing the Connection

To allow Puppeteer on your Linux host to communicate with Chrome on the
CrOS device, you'll set up an SSH tunnel. This forwards a local
port on your host to the remote debugging port on the device.

Before you proceed, it's recommended to set the IP address of your device and
the remote debugging port as environment variables. This will make the following
commands easier to copy and paste.
(host)
```bash
$ export DEVICE_IP=<your_device_ip>
$ export PORT=9222
```

### a. Create an SSH Tunnel

Open a terminal on your Linux host and run the following command:
(host)
```bash
$ ssh -L ${PORT}:localhost:${PORT} root@${DEVICE_IP}
```
*   `-L ${PORT}:localhost:${PORT}`: Forwards the local port `${PORT}` on your
    host to `localhost:${PORT}` on the device.
*   `root@${DEVICE_IP}`: Uses the device's IP. The default password for `root`
    on test devices or VMs is `test0000`.

### b. Verify the Tunnel and Remote Debugging

Before running your Puppeteer script, verify that the tunnel is working and
the Chrome browser on the CrOS device is accessible:

1.  Keep the SSH tunnel command running in its terminal.
2.  Use `curl` in another terminal on your Linux host:
    (host)
    ```bash
    $ curl http://localhost:${PORT}/json/version
    ```
    This should return a JSON object with details about the browser,
    including `Browser`, `Protocol-Version`, and `webSocketDebuggerUrl`. For
    example:
    ```json
    {
       "Browser": "Chrome/144.0.7524.0",
       "Protocol-Version": "1.3",
       "User-Agent": "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) ...",
       "V8-Version": "14.4.95",
       "WebKit-Version": "537.36 (@e8644584e0429213c91c06528e8c7e6f58d4964a)",
       "webSocketDebuggerUrl": "ws://localhost:9222/devtools/browser/..."
    }
    ```
    Look for `"User-Agent"` containing `"CrOS"` to confirm it's a CrOS
    device. If you can access this information, your tunnel is working, and
    Chrome on the device is correctly configured for remote debugging.

## 3. Running Puppeteer Tests

### 3.1. Browser Connection Testing

This test serves two purposes: it verifies that the Puppeteer
connection to your CrOS device is working, and it checks that the
necessary command-line flags have been correctly applied to Chrome.

It connects to the remote CrOS instance and opens the `chrome://version`
page to retrieve its content. In the output, you should verify that the
following flags are present:
*   `--system-developer-mode`
*   `--remote-debugging-port=9222`
*   `--enable-devtools-pwa-handler`

The `test-chrome-connection.js` script is available in the same directory as
this guide. You can view its content [here](./test-chrome-connection.js).

To run this script:

1.  Ensure your SSH tunnel is active.
    (host)
    ```bash
    $ ssh -L ${PORT}:localhost:${PORT} root@${DEVICE_IP}
    ```

2.  Open a new terminal on your Linux host, navigate to the directory where you
    saved `test-chrome-connection.js`, and run:
    (host)
    ```bash
    $ node test-chrome-connection.js ${PORT}
    ```
    You should see output that includes the "Command Line" section.

### 3.2. PWA Testing

This test demonstrates a complete lifecycle of a Progressive Web App (PWA)
using the Chrome DevTools Protocol (CDP) via Puppeteer. It programmatically
installs the PWA, launches it, verifies its state, and then uninstalls it,
providing an end-to-end example of PWA management.

The `test-pwa-lifecycle.js` script is available in the same directory as this
guide. You can view its content [here](./test-pwa-lifecycle.js).

To run this test:
1.  Ensure your SSH tunnel is active.
    (host)
    ```bash
    $ ssh -L ${PORT}:localhost:${PORT} root@${DEVICE_IP}
    ```
2.  Open a new terminal on your Linux host, navigate to the directory where
    you saved `test-pwa-lifecycle.js`, and run:
    (host)
    ```bash
    $ node test-pwa-lifecycle.js ${PORT}
    ```

### 3.3. IWA Testing

This test showcases how to interact with an Isolated Web App (IWA). The
script connects to the remote CrOS instance, installs the Kitchen Sink IWA
from its web bundle, and launches it. It then interacts with the app's UI to
simulate sending and receiving messages via direct sockets, verifying the IWA's
ability to communicate and function correctly in a real CrOS environment.

The `test-iwa-interaction.js` script is available in the same directory as
this guide. You can view its content [here](./test-iwa-interaction.js).
To run this test:
1.  Ensure your SSH tunnel is active.
    (host)
    ```bash
    $ ssh -L ${PORT}:localhost:${PORT} root@${DEVICE_IP}
    ```
1.  Open a new terminal on your Linux host, navigate to the directory where
    you saved `test-iwa-interaction.js`, and run:
    (host)
    ```bash
    $ node test-iwa-interaction.js ${PORT}
    ```

## 4. Running Puppeteer Tests in Kiosk Mode

Testing web applications in Kiosk mode requires specific device policies to be
set to auto-launch the app. This functionality is typically available on
ChromiumOS test images (VMs). For detailed instructions on how to set these
policies on your test device, please refer to the
[Testing Enterprise Policies with a Local Server](/chromium-os/developer-library/guides/enterprise/local-policy-testing/) guide.

In addition to the flags mentioned in [1.1.c Enable Chrome DevTools Remote
Debugging](#c-enable-chrome-devtools-remote-debugging), you must also enable
the following flags by adding them to `/etc/chrome_dev.conf`:

**SECURITY WARNING:** The following flags significantly reduce the security of
your device by allowing remote access and exposing internal protocols.
**Never enable these flags on a device connected to a public or untrusted
network,** as it could lead to unauthorized access and data compromise.

*   `--remote-debugging-address=0.0.0.0`: Allows connections from remote
    machines, not just localhost on the DUT.
*   `--force-devtools-available`: **This is the most critical flag.** It
    ensures that the app's target is exposed to the DevTools protocol,
    even in the highly restricted kiosk mode.

### 4.1. Example: Testing an IWA in Kiosk Mode

This test demonstrates how to interact with an Isolated Web App (IWA) running
in a locked-down Kiosk mode. Since Kiosk mode restricts browser functionality,
the script uses lower-level Chrome DevTools Protocol (CDP) commands to find
the IWA's target, connect to it, and interact with its UI. This provides a
robust example for testing apps in a restricted environment.

The `test-iwa-kiosk.js` script is available in the same directory as this
guide. You can view its content [here](./test-iwa-kiosk.js).

To run this test:
1.  Ensure your SSH tunnel is active.
    (host)
    ```bash
    $ ssh -L ${PORT}:localhost:${PORT} root@${DEVICE_IP}
    ```
2.  Ensure your ChromiumOS VM is configured with the necessary Kiosk mode
    policies as described in the linked guide.
3.  Open a new terminal on your Linux host, navigate to the directory where
    you saved `test-iwa-kiosk.js`, and run:
    (host)
    ```bash
    $ node test-iwa-kiosk.js ${PORT}
    ```

## 5. Testing System Web Apps

Beyond standard web pages, Puppeteer can also be used to automate and test CrOS
system web applications (System Web Apps) such as the Files app, Media app, and
Settings. For detailed guidance on this, refer to
[Running Puppeteer Tests to interact with System apps on CrOS Devices](/chromium-os/developer-library/guides/testing/puppeteer-system-apps/).
