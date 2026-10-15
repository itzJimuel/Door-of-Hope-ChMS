import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { CheckinClient, type RosterEntry } from "./CheckinClient";

export const dynamic = "force-dynamic";

export default async function CheckinEvent({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase } = await requireRole("admin", "pastor", "leader", "usher");

  const { data: event } = await supabase.from("events").select("id, title, starts_at").eq("id", eventId).single();
  if (!event) notFound();

  const { data: roster, error } = await supabase.rpc("checkin_roster", { p_event: eventId });
  if (error) {
    return <p className="card text-red-800">You can&apos;t check people in to this event. ({error.message})</p>;
  }

  return (
    <div className="space-y-3">
      <div>
        <Link href="/checkin" className="text-sm text-brand-700">← Check-in</Link>
        <h1 className="page-title">{event.title}</h1>
        <p className="text-sm text-gray-600">{formatDateTime(event.starts_at)}</p>
      </div>
      <CheckinClient eventId={eventId} initial={(roster ?? []) as RosterEntry[]} />
    </div>
  );
}
