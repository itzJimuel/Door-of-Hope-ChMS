"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["admin", "pastor", "leader", "usher", "member"];

async function requireAdmin() {
  const session = await getSession();
  if (session.profile.role !== "admin") throw new Error("Only admins can change settings.");
  return session;
}

export async function saveThresholds(_prev: string | null, form: FormData): Promise<string | null> {
  const { supabase } = await requireAdmin();
  const n = (k: string) => Number.parseInt(String(form.get(k) ?? ""), 10);
  const values = {
    active_min_attendance: n("active_min_attendance"),
    window_weeks: n("window_weeks"),
    new_member_days: n("new_member_days"),
    followup_lookback_days: n("followup_lookback_days"),
  };
  if (Object.values(values).some((v) => !Number.isFinite(v))) return "Please enter whole numbers.";
  const { error } = await supabase.from("settings").update(values).eq("id", 1);
  if (error) return `Could not save: ${error.message}`;
  revalidatePath("/", "layout");
  return "Saved ✓";
}

export async function setRole(userId: string, form: FormData) {
  const { supabase, profile } = await requireAdmin();
  const role = String(form.get("role")) as Role;
  if (!ROLES.includes(role)) throw new Error("Unknown role");
  if (userId === profile.id && role !== "admin") throw new Error("You can't remove your own admin access.");
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function createUser(_prev: string | null, form: FormData): Promise<string | null> {
  await requireAdmin(); // checked BEFORE using the service key
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const full_name = String(form.get("full_name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role")) as Role;
  if (!email || !full_name) return "Name and email are required.";
  if (password.length < 10) return "Temporary password must be at least 10 characters.";
  if (!ROLES.includes(role)) return "Pick a role.";

  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name },
  });
  if (error || !data.user) return `Could not create account: ${error?.message}`;
  // The database trigger created the profile with the lowest role; set the real one.
  const { error: pErr } = await admin.from("profiles").update({ role, full_name }).eq("id", data.user.id);
  if (pErr) return `Account created, but role not set: ${pErr.message}`;
  revalidatePath("/settings");
  return `Account created for ${full_name}. Give them the temporary password in person and ask them to change it.`;
}

export async function resetPassword(userId: string, form: FormData) {
  await requireAdmin();
  const password = String(form.get("password") ?? "");
  if (password.length < 10) throw new Error("Password must be at least 10 characters.");
  const { error } = await createServiceClient().auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(error.message);
}
