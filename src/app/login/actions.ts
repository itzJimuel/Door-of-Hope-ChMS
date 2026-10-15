"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/auth";
import type { Role } from "@/lib/types";

export async function signIn(_prev: string | null, formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error || !data.user) return "Wrong email or password. Please try again.";

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  redirect(homeFor((profile?.role ?? "member") as Role));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
