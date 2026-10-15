"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, isStaff } from "@/lib/auth";

const str = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};

export async function saveMember(_prev: string | null, form: FormData): Promise<string | null> {
  const { supabase, profile } = await getSession();
  if (!isStaff(profile.role)) return "Only pastors and admins can edit member records.";

  const id = str(form, "id");
  const first_name = str(form, "first_name");
  const last_name = str(form, "last_name");
  if (!first_name || !last_name) return "First and last name are required.";
  if (form.get("consent_given") !== "on" || !str(form, "consent_date"))
    return "Please record the member's consent and the date it was given (Data Privacy Act).";

  // Household: pick an existing one, or create a new one by name.
  let household_id = str(form, "household_id");
  const newHousehold = str(form, "new_household");
  if (household_id === "__new" && newHousehold) {
    const { data, error } = await supabase.from("households").insert({ name: newHousehold }).select("id").single();
    if (error) return `Could not create household: ${error.message}`;
    household_id = data.id;
  } else if (household_id === "__new") {
    household_id = null;
  }

  const record = {
    first_name, last_name,
    gender: str(form, "gender"),
    civil_status: str(form, "civil_status"),
    birthday: str(form, "birthday"),
    phone: str(form, "phone"),
    email: str(form, "email"),
    address: str(form, "address"),
    household_id,
    household_role: household_id ? str(form, "household_role") : null,
    is_child: form.get("is_child") === "on",
    first_visit_date: str(form, "first_visit_date") ?? undefined,
    date_joined: str(form, "date_joined"),
    baptism_date: str(form, "baptism_date"),
    membership_status: str(form, "membership_status") ?? "visitor",
    consent_given: true,
    consent_date: str(form, "consent_date"),
    consent_notes: str(form, "consent_notes"),
  };

  const { data: saved, error } = id
    ? await supabase.from("members").update(record).eq("id", id).select("id").single()
    : await supabase.from("members").insert(record).select("id").single();
  if (error || !saved) return `Could not save: ${error?.message ?? "unknown error"}`;
  const memberId: string = saved.id;

  // Photo (optional)
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) return "The photo must be an image file.";
    if (photo.size > 4 * 1024 * 1024) return "The photo is too large (max 4 MB).";
    const path = `${memberId}/photo`;
    const { error: upErr } = await supabase.storage
      .from("member-photos")
      .upload(path, photo, { upsert: true, contentType: photo.type });
    if (upErr) return `Saved, but the photo upload failed: ${upErr.message}`;
    await supabase.from("members").update({ photo_path: path }).eq("id", memberId);
  }

  // Groups & ministries: replace the full list with what was ticked.
  const groupIds = form.getAll("group_ids").map(String);
  await supabase.from("group_members").delete().eq("member_id", memberId);
  if (groupIds.length) {
    const { error: gErr } = await supabase
      .from("group_members")
      .insert(groupIds.map((group_id) => ({ group_id, member_id: memberId })));
    if (gErr) return `Saved, but groups could not be updated: ${gErr.message}`;
  }

  revalidatePath("/members");
  redirect(`/members/${memberId}`);
}

export async function setArchived(id: string, archived: boolean) {
  const { supabase, profile } = await getSession();
  if (!isStaff(profile.role)) throw new Error("Not allowed");
  await supabase.from("members").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", id);
  revalidatePath(`/members/${id}`);
  revalidatePath("/members");
}

/** Permanent erasure (e.g. a Data Privacy Act deletion request). Admin only. */
export async function deleteMember(id: string) {
  const { supabase, profile } = await getSession();
  if (profile.role !== "admin") throw new Error("Only admins can permanently delete a record.");
  await supabase.storage.from("member-photos").remove([`${id}/photo`]);
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/members");
  redirect("/members");
}
