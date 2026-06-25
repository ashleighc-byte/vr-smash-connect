// @ssr-safe — do not import browser-only APIs here
import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const SchoolBracket = lazy(() => import("./-components/SchoolBracket"));

const Fallback = () => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", color: "#555", fontFamily: "system-ui, sans-serif" }}>
    Loading bracket…
  </div>
);

export const Route = createFileRoute("/school-bracket")({
  validateSearch: (search: Record<string, string | undefined>) => ({
    school: search.school as string | undefined,
    players: search.players as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: "School Playoff Bracket — VR Table Tennis" },
      { name: "description", content: "Generate and manage your school's internal playoff bracket for VR Table Tennis." },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<Fallback />}>
      <Suspense fallback={<Fallback />}>
        <SchoolBracket />
      </Suspense>
    </ClientOnly>
  ),
});
