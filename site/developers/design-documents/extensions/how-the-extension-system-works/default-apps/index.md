---
breadcrumbs:
- - /developers
  - For Developers
- - /developers/design-documents
  - Design Documents
- - /developers/design-documents/extensions
  - Extensions
- - /developers/design-documents/extensions/how-the-extension-system-works
  - How the Extension System Works
page_name: default-apps
title: Default Apps
---

Branded Chrome builds ship with default extensions that are installed for new
users. The bar for a default-installed extension is quite high, since it gets
automatically added for a billion or so users. However, if you have approval to
add a new one, here's how.

**Adding a new default extension**

1.  Locate the extension in the Chrome Web Store
2.  Determine its extension ID (part of the URL)
3.  Add the ID to
[preinstalled_apps.cc](https://source.chromium.org/chromium/chromium/src/+/main:chrome/browser/extensions/preinstalled_apps.cc;drc=a86f59b7e60cf5e5563cf6c5d905787a740b65a4;l=188)
(the file is named "apps" for historical reasons)

Test your changes with a branded build (is_chrome_branded = true). Start chrome
with out/Debug/chrome --user-data-dir=/tmp/&lt;somenewdir&gt; to simulate the
new user experience.

For an example, see [the changelist](https://crrev.com/c/7899711) that added
Docs Offline as a default extension.
