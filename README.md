# Faceto0l

Facebook automation toolkit (FaceBot-style): Chrome extension bridge + dashboard tools.

## Foundation D (current)

- Extension v0.2.0 lists Facebook pages from your session
- Tool pages show **Select Pages** picker
- Smoke test: Open page / Business Suite from selection
- Grab + real publish = next (Foundation E)

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

- App: http://localhost:5173
- Extension: `C:\Users\M-C-S\faceto0l\extension` (reload to v0.2.0)

## Verify Foundation D

1. Reload extension on `chrome://extensions` (must be **0.2.0**)
2. Log into Faceto0l + Facebook in same Chrome
3. Open a tool → **Refresh pages**
4. Pages appear → select one → **Open first page**

Then say **Foundation D OK** to continue to TikTok → FB grab (Foundation E).

## Planned MVP tools

1. TikTok → Facebook scheduler
2. Instagram → Facebook scheduler
3. YouTube → Facebook scheduler
4. Bulk schedule (Interval / Daily Window + thumbnail queue)
