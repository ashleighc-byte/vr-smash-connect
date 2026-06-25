// @ssr-safe — do not import browser-only APIs here
import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const AdminReport = lazy(() => import("./-components/AdminReport"));

const Fallback = () => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", color: "#555", fontFamily: "system-ui, sans-serif" }}>
    Loading report…
  </div>
);

export const Route = createFileRoute("/admin/report")({
  head: () => ({ meta: [{ title: "Survey Report — VR Table Tennis Pilot" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <ClientOnly fallback={<Fallback />}>
      <Suspense fallback={<Fallback />}>
        <AdminReport />
      </Suspense>
    </ClientOnly>
  ),
});
