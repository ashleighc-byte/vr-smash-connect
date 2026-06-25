import { createServerFn } from "@tanstack/react-start";
import { timingSafeEqual, createHash } from "node:crypto";

function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

export const fetchReportData = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    if (!checkPassword(data.password)) {
      return { ok: false as const, error: "Invalid password" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [students, staff] = await Promise.all([
      supabaseAdmin
        .from("student_survey_responses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabaseAdmin
        .from("staff_survey_responses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);
    if (students.error) throw new Error(students.error.message);
    if (staff.error) throw new Error(staff.error.message);
    return {
      ok: true as const,
      students: students.data ?? [],
      staff: staff.data ?? [],
    };
  });

export type StudentRow = Record<string, unknown>;
export type StaffRow = Record<string, unknown>;
