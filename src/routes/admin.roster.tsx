import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SCHOOLS, type School, type TournamentRoster } from "@/lib/tournament";

export const Route = createFileRoute("/admin/roster")({
  head: () => ({
    meta: [
      { title: "Admin — Tournament Roster" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminRosterPage,
});

const BLACK = "#1a1a1a";
const RED = "#d42b2b";
const BG = "#f5f5f5";
const BORDER = "#ddd";

function usePasswordGate() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("check-admin-password", {
        body: { password },
      });
      if (fnError || !data?.ok) {
        setError("Invalid password");
        return;
      }
      setUnlocked(true);
    } catch {
      setError("Invalid password");
    } finally {
      setLoading(false);
    }
  }

  return { password, setPassword, unlocked, setUnlocked, error, loading, unlock };
}

async function fetchRosters(): Promise<TournamentRoster[]> {
  const { data, error } = await supabase.from("tournament_rosters").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data as unknown as TournamentRoster[]) ?? [];
}

async function upsertRoster(rows: { school: School; player_slot: string; student_name: string }[]) {
  const { error } = await supabase.from("tournament_rosters").upsert(rows, { onConflict: "school,player_slot" });
  if (error) throw error;
}

function AdminRosterPage() {
  const { password, setPassword, unlocked, error, loading, unlock } = usePasswordGate();
  const queryClient = useQueryClient();

  const { data: rosters } = useQuery({
    queryKey: ["tournament_rosters"],
    queryFn: fetchRosters,
    enabled: unlocked,
  });

  const [forms, setForms] = useState<Record<School, Record<string, string>>>({
    "Piopio College": { player_1: "", player_2: "", player_3: "", player_4: "", reserve_1: "", reserve_2: "" },
    "Taumarunui High School": { player_1: "", player_2: "", player_3: "", player_4: "", reserve_1: "", reserve_2: "" },
    "Ōtorohanga College": { player_1: "", player_2: "", player_3: "", player_4: "", reserve_1: "", reserve_2: "" },
    "Te Kuiti High School": { player_1: "", player_2: "", player_3: "", player_4: "", reserve_1: "", reserve_2: "" },
  });

  useEffect(() => {
    if (!rosters) return;
    const next: Record<string, Record<string, string>> = {
      "Piopio College": { player_1: "", player_2: "", player_3: "", player_4: "", reserve_1: "", reserve_2: "" },
      "Taumarunui High School": { player_1: "", player_2: "", player_3: "", player_4: "", reserve_1: "", reserve_2: "" },
      "Ōtorohanga College": { player_1: "", player_2: "", player_3: "", player_4: "", reserve_1: "", reserve_2: "" },
      "Te Kuiti High School": { player_1: "", player_2: "", player_3: "", player_4: "", reserve_1: "", reserve_2: "" },
    };
    for (const r of rosters) {
      if (next[r.school]) next[r.school][r.player_slot] = r.student_name;
    }
    setForms(next as Record<School, Record<string, string>>);
  }, [rosters]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rows: { school: School; player_slot: string; student_name: string }[] = [];
      for (const school of SCHOOLS) {
        for (const [slot, name] of Object.entries(forms[school])) {
          if (name.trim()) {
            rows.push({ school, player_slot: slot, student_name: name.trim() });
          }
        }
      }
      await upsertRoster(rows);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament_rosters"] });
    },
  });

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: BG, color: BLACK, fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <form onSubmit={unlock} style={{ background: "#fff", padding: "2rem", borderRadius: 6, maxWidth: 380, width: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderTop: `3px solid ${RED}` }}>
          <h1 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1.25rem" }}>Admin access</h1>
          <p style={{ margin: 0, marginBottom: "1rem", color: "#555", fontSize: 14 }}>Tournament Roster Entry</p>
          <label htmlFor="pw" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Password</label>
          <input id="pw" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 15 }} />
          {error && <p style={{ color: RED, fontSize: 13, marginTop: 8 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ marginTop: "1rem", width: "100%", padding: "0.7rem", background: RED, color: "#fff", border: 0, borderRadius: 4, fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: BLACK, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: BLACK, color: "#f5f5f5", padding: "1rem 1.5rem", borderBottom: `3px solid ${RED}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase", fontSize: 14 }}>
          <span style={{ background: RED, padding: "2px 8px", marginRight: 8, fontWeight: 900 }}>E</span>
          Tournament Roster — Admin
        </div>
        <a href="/admin" style={{ color: "#ccc", fontSize: 13, textDecoration: "none" }}>← Back to admin</a>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.25rem" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {SCHOOLS.map((school) => (
              <section key={school} style={{ background: "#fff", borderRadius: 6, padding: "1.25rem 1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700 }}>{school}</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
                  {["player_1", "player_2", "player_3", "player_4"].map((slot) => (
                    <label key={slot} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {slot.replace("_", " ").replace(/\b\w/, (c) => c.toUpperCase())} *
                      </span>
                      <input
                        type="text"
                        required
                        value={forms[school][slot]}
                        onChange={(e) =>
                          setForms((prev) => ({ ...prev, [school]: { ...prev[school], [slot]: e.target.value } }))
                        }
                        style={{ padding: "0.5rem 0.75rem", border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 14 }}
                      />
                    </label>
                  ))}
                  {["reserve_1", "reserve_2"].map((slot) => (
                    <label key={slot} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "#666" }}>
                        {slot.replace("_", " ").replace(/\b\w/, (c) => c.toUpperCase())}
                      </span>
                      <input
                        type="text"
                        value={forms[school][slot]}
                        onChange={(e) =>
                          setForms((prev) => ({ ...prev, [school]: { ...prev[school], [slot]: e.target.value } }))
                        }
                        style={{ padding: "0.5rem 0.75rem", border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 14 }}
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              style={{
                padding: "0.75rem 1.5rem",
                background: RED,
                color: "#fff",
                border: 0,
                borderRadius: 4,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 15,
              }}
            >
              {saveMutation.isPending ? "Saving…" : "Save Rosters"}
            </button>
            {saveMutation.isSuccess && (
              <span style={{ color: "#2e7d32", fontSize: 14, fontWeight: 600 }}>Saved ✓</span>
            )}
            {saveMutation.isError && (
              <span style={{ color: RED, fontSize: 14, fontWeight: 600 }}>Error saving</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
