import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Eleven VR Table Tennis — Waikato KC Cluster Pilot" },
      { name: "description", content: "Sport Waikato × Beyond VR Table Tennis interschool pilot — Piopio, Taumarunui, Ōtorohanga and Te Kuiti, tournament week 31 Aug – 4 Sep 2025." },
    ],
  }),
  component: Index,
});

function Index() {
  if (typeof window !== "undefined") {
    window.location.replace("/site.html");
  }
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#f5f5f5", fontFamily: "system-ui, sans-serif" }}>
      <a href="/site.html" style={{ color: "#d42b2b", fontWeight: 700, textDecoration: "none" }}>
        Enter site →
      </a>
    </div>
  );
}
