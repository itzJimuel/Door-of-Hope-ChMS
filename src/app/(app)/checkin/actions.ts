"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// Permission checks for all of these happen inside the database functions.

export async function checkIn(eventId: string, memberId: string) {
  const { supabase } = await getSession();
  const { error } = await supabase.rpc("check_in", { p_event: eventId, p_member: memberId, p_method: "manual" });
  return error ? { error: error.message } : { ok: true as const };
}

export async function undoCheckIn(eventId: string, memberId: string) {
  const { supabase } = await getSession();
  const { error } = await supabase.rpc("undo_check_in", { p_event: eventId, p_member: memberId });
  return error ? { error: error.message } : { ok: true as const };
}

export async function checkInByQr(eventId: string, scanned: string) {
  const { supabase } = await getSession();
  const token = scanned.trim().replace(/^DOH:/, "");
  if (!/^[0-9a-f]{32}$/.test(token)) return { error: "This QR code is not a Door of Hope member card." };
  const { data, error } = await supabase.rpc("check_in_qr", { p_event: eventId, p_token: token }).single<{
    member_id: string; first_name: string; last_name: string; newly_checked_in: boolean;
  }>();
  if (error || !data) return { error: error?.message ?? "QR code not recognized" };
  return { ok: true as const, ...data };
}

export async function startToday(type: "sunday_service" | "prayer_meeting") {
  const { supabase } = await getSession();
  const { data, error } = await supabase.rpc("ensure_event_today", { p_type: type });
  if (error) throw new Error(error.message);
  redirect(`/checkin/${data}`);
}
