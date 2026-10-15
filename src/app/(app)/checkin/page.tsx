import Link from "next/link";
import { requireRole, isStaff } from "@/lib/auth";
import { formatDay, formatDateTime } from "@/lib/format";
import { EVENT_LABELS, type EventType } from "@/lib/types";
import { startToday } from "./actions";

export const dynamic = "force-dynamic";

export default async function CheckinHome() {
  const { supabase, profile } = await requireRole("admin", "pastor", "leader", "usher");
  const canStart = isStaff(profile.role) || profile.role === "usher";

  const from = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const to = new Date(Date.now() + 2 * 86_400_000).toISOString();
  let q = supabase.from("events").select("id, title, type, starts_at, group_id")
    .gte("starts_at", from).lte("starts_at", to).order("starts_at", { ascending: false });
  // Leaders check in their own group meetings; ushers handle church-wide services.
  if (profile.role === "leader") q = q.not("group_id", "is", null);
  if (profile.role === "usher") q = q.is("group_id", null);
  const { data: events } = await q;

  return (
    <div className="space-y-5">
      <h1 className="page-title">Check-in</h1>

      {canStart && (
        <section className="grid gap-3 sm:grid-cols-2">
          <form action={startToday.bind(null, "sunday_service")}>
            <button className="btn-primary min-h-16 w-full text-lg">⛪ Start today&apos;s Sunday Service</button>
          </form>
          <form action={startToday.bind(null, "prayer_meeting")}>
            <button className="btn-secondary min-h-16 w-full text-lg">🙏 Start today&apos;s Prayer Meeting</button>
          </form>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Recent &amp; upcoming</h2>
        {events?.length ? (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id}>
                <Link href={`/checkin/${e.id}`} className="card flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="text-sm text-gray-600">{EVENT_LABELS[e.type as EventType]} · {formatDay(e.starts_at)}</div>
                  </div>
                  <span className="text-brand-700">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card text-gray-600">
            No services in the last two days.{" "}
            {profile.role === "leader" && <Link href="/events" className="text-brand-700">Create your group meeting →</Link>}
          </p>
        )}
        <p className="text-xs text-gray-500">Times shown in Philippine time. Now: {formatDateTime(new Date().toISOString())}</p>
      </section>
    </div>
  );
}
