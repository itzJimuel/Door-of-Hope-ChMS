import Link from "next/link";
import { requireRole, isStaff } from "@/lib/auth";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatDateTime } from "@/lib/format";
import { EVENT_LABELS, type EventType } from "@/lib/types";
import { EventForm } from "./EventForm";
import { deleteEvent } from "./actions";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const { supabase, profile } = await requireRole("admin", "pastor", "leader");
  const staff = isStaff(profile.role);
  const since = new Date(Date.now() - 35 * 86_400_000).toISOString();

  const [{ data: events }, { data: groups }] = await Promise.all([
    supabase.from("events").select("id, title, type, starts_at, group_id, attendance(count)")
      .gte("starts_at", since).order("starts_at", { ascending: false }),
    supabase.from("groups").select("id, name").eq("type", "small_group").order("name"),
  ]);

  type Ev = { id: string; title: string; type: EventType; starts_at: string; group_id: string | null; attendance: { count: number }[] };

  return (
    <div className="space-y-4">
      <h1 className="page-title">Services &amp; meetings</h1>
      <EventForm groups={groups ?? []} staff={staff} />

      <section className="card p-0">
        <h2 className="px-4 pt-4 font-semibold">Last 5 weeks</h2>
        <ul className="divide-y divide-gray-100">
          {((events ?? []) as Ev[]).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{e.title}</div>
                <div className="text-sm text-gray-600">{EVENT_LABELS[e.type]} · {formatDateTime(e.starts_at)}</div>
              </div>
              {(staff || e.group_id) && (
                <span className="text-sm text-gray-700"><strong>{e.attendance?.[0]?.count ?? 0}</strong> present</span>
              )}
              {(staff || e.group_id) && <Link href={`/checkin/${e.id}`} className="btn-secondary">Check-in</Link>}
              {staff && (
                <form action={deleteEvent.bind(null, e.id)}>
                  <ConfirmButton message={`Delete "${e.title}" and its attendance?`} className="btn-danger">Delete</ConfirmButton>
                </form>
              )}
            </li>
          ))}
          {!events?.length && <li className="px-4 py-6 text-center text-gray-500">No services yet.</li>}
        </ul>
      </section>
    </div>
  );
}
