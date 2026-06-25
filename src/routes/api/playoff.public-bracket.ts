import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/playoff/public-bracket")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const school = url.searchParams.get("school");

          if (!school) {
            return new Response(JSON.stringify({ error: "School query param required" }), { status: 400, headers: { "Content-Type": "application/json" } });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("published_brackets")
            .select("*")
            .eq("school", school)
            .maybeSingle();

          if (error) {
            console.error("[playoff/public-bracket] error", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
          }

          if (!data || !data.is_live) {
            return Response.json({ published: false, school });
          }

          return Response.json({ published: true, school, bracket_data: data.bracket_data, published_at: data.published_at });
        } catch (e) {
          console.error("[playoff/public-bracket] error", e);
          return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
