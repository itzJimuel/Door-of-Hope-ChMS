import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export type Profile = { id: string; full_name: string; role: Role };

/** The signed-in user's profile. Redirects to /login if not signed in. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect("/login?error=profile");

  return { supabase, user, profile };
});

/**
 * Page-level role check. This is for a friendly redirect only —
 * the real protection is the database's Row Level Security.
 */
export async function requireRole(...roles: Role[]) {
  const session = await getSession();
  if (!roles.includes(session.profile.role)) redirect(homeFor(session.profile.role));
  return session;
}

export function homeFor(role: Role) {
  switch (role) {
    case "admin":
    case "pastor":
      return "/";
    case "leader":
      return "/groups";
    case "usher":
      return "/checkin";
    default:
      return "/no-access";
  }
}

export const isStaff = (role: Role) => role === "admin" || role === "pastor";
