Faceto0l Chrome extension — v0.3.2
==================================

Download:
  https://faceto0l.vercel.app/extension/faceto0l-extension.zip

IMPORTANT — how to Load unpacked (fixes "Manifest file is missing"):
1. Download the zip
2. Right-click zip → Extract All…
3. Open the extracted folder — you must SEE manifest.json inside it
4. chrome://extensions → Developer mode ON → Load unpacked
5. Select THAT folder (the one that contains manifest.json)

WRONG: selecting Downloads, or a parent folder that only contains another folder
RIGHT: the folder that directly contains manifest.json, background.js, popup.html

If extract created nested folders, keep opening until you see manifest.json, then Load that.

Local developers can Load unpacked this path directly:
  C:\Users\M-C-S\faceto0l\extension

After install, version must show 0.3.2.
Then hard-refresh https://faceto0l.vercel.app/dashboard
