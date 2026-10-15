"use server";

import { revalidatePath } from "next/cache";
import { getSession, isStaff } from "@/lib/auth";

export async function createGroup(_prev: string | null, form: FormData): Promise<string | null> {
  const { supabase, profile } = await getSession();
  if (!isStaff(profile.role)) return "Only pastors and admins can create groups.";
  const name = String(form.get("name") ?? "").trim();
  if (!name) return "Please enter a name.";
  const { error } = await supabase.from("groups").insert({
    name,
    type: form.get("type") === "ministry" ? "ministry" : "small_group",
    leader_id: String(form.get("leader_id") ?? "") || null,
    meeting_info: String(form.get("meeting_info") ?? "").trim() || null,
  });
  if (error) return error.code === "23505" ? "A group with that name already exists." : error.message;
  revalidatePath("/groups");
  return null;
}

export async function setGroupLeader(groupId: string, form: FormData) {
  const { supabase, profile } = await getSession();
  if (!isStaff(profile.role)) throw new Error("Not allowed");
  await supabase.from("groups").update({ leader_id: String(form.get("leader_id") ?? "") || null }).eq("id", groupId);
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
}
