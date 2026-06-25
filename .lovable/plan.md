# SSR-safety pass

## Important deviation from the prompt
This project uses `@tanstack/react-router` v1, which exports **`<ClientOnly>` and `useHydrated()`** but does **not** export a `clientOnly(() => import(...))` HOC. There is also no per-route `ssr: false` option in the installed version. I'll achieve the same outcome using `<ClientOnly>` + `React.lazy` (deferred chunk that only loads in the browser). Behaviour is equivalent: zero server execution of the wrapped tree.

## Current state (audit)
Module-level browser API access: none — all `document` / `window` reads in `src/routes/*` are already inside event handlers, `useEffect`, or `typeof window` guards. The remaining SSR crash risk is the *chart/canvas* render path on `/admin/report` and the imperative DOM reads on `/school-bracket` (canvas + `getElementById`). `/standings` currently has no realtime subscription wired (verified).

## Changes

### 1. `/admin/report` — never SSR
- Extract the entire page body (everything after `createFileRoute`) from `src/routes/admin.report.tsx` into a new file `src/routes/-components/AdminReport.tsx` (`-`-prefixed folder is ignored by the route generator).
- Inside that file, drop the runtime `<script>` injection workaround and use `chart.js/auto` as a normal ESM import (install `chart.js` if not present).
- `admin.report.tsx` becomes ~10 lines:
  ```tsx
  import { createFileRoute, ClientOnly } from "@tanstack/react-router";
  import { lazy } from "react";
  const AdminReport = lazy(() => import("./-components/AdminReport"));
  export const Route = createFileRoute("/admin/report")({
    head: () => ({ meta: [{ title: "Survey Report" }, { name: "robots", content: "noindex" }] }),
    component: () => (
      <ClientOnly fallback={<div style={{ padding: 24 }}>Loading…</div>}>
        <AdminReport />
      </ClientOnly>
    ),
  });
  ```

### 2. `/school-bracket` — never SSR
- Move body to `src/routes/-components/SchoolBracket.tsx`.
- Route file wraps it in `<ClientOnly>` + `lazy`, same pattern as above. Keeps the bracket's `document.getElementById` calls safe.

### 3. `/standings` — keep SSR for initial load
- Verified there is no realtime subscription today. No code change needed for live updates. Add a placeholder `-components/LiveUpdates.tsx` only if/when realtime is added; not creating dead code now.

### 4. File-level markers
- Add `// @client-only — this component must never run on the server` to the two extracted component files.
- Add `// @ssr-safe — do not import browser-only APIs here` to the two thin route files and to `src/routes/standings.tsx`.

### 5. Verification
- `bun add chart.js` (if missing).
- Typecheck via the auto-running build.
- Hard refresh preview, confirm `/admin/report`, `/school-bracket`, `/standings` all load with no `document is not defined` error.

## Out of scope
- The `src/components/ui/*` and `src/hooks/use-mobile.tsx` browser refs are already inside `useEffect` — no change.
- `src/lib/lovable-error-reporting.ts` uses `window.__lovableEvents` inside a function body, not module scope — no change.
- No ESLint rule added; the file-header comment markers are the lightweight signal the prompt asked for. A proper `eslint-plugin-ssr-friendly` setup is a larger task and not requested.
