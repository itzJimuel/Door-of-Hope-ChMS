"use server";

import { revalidatePath } from "next/cache";
import { getSession, isStaff } from "@/lib/auth";

const TITLES: Record<string, string> = {
  sunday_service: "Sunday Service",
  prayer_meeting: "Prayer Meeting",
};

export async function createEvent(_prev: string | null, form: FormData): Promise<string | null> {
  const { supabase, profile } = await getSession();
  const type = String(form.get("type") ?? "");
  const date = String(form.get("date") ?? "");
  const time = String(form.get("time") ?? "09:00");
  const group_id = String(form.get("group_id") ?? "") || null;
  let title = String(form.get("title") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return "Please pick a date and time.";
  if (!["sunday_service", "small_group", "prayer_meeting", "event"].includes(type)) return "Please pick a type.";
  if (type === "small_group" && !group_id) return "Please pick which small group is meeting.";
  if (!isStaff(profile.role) && type !== "small_group") return "Leaders can only create meetings for their own group.";

  if (!title && type === "small_group") {
    const { data: g } = await supabase.from("groups").select("name").eq("id", group_id).single();
    title = g?.name ?? "Small group meeting";
  }
  title ||= TITLES[type] ?? "Event";

  const { error } = await supabase.from("events").insert({
    title, type,
    group_id: type === "small_group" ? group_id : null,
    starts_at: `${date}T${time}:00+08:00`, // Philippine time (no daylight saving)
    created_by: profile.id,
  });
  if (error) return `Could not create: ${error.message}`;
  revalidatePath("/events");
  revalidatePath("/checkin");
  return null;
}

export async function deleteEvent(id: string) {
  const { supabase, profile } = await getSession();
  if (!isStaff(profile.role)) throw new Error("Not allowed");
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/events");
}
