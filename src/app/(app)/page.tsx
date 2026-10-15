import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { AttendanceChart, type WeekPoint } from "@/components/AttendanceChart";
import { daysAgo, formatDate } from "@/lib/format";
import { STATUS_ORDER, type ActivityStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const TILE: Record<ActivityStatus, { label: string; cls: string }> = {
  active:    { label: "Active",    cls: "border-green-500" },
  new:       { label: "New",       cls: "border-blue-500" },
  irregular: { label: "Irregular", cls: "border-amber-500" },
  inactive:  { label: "Inactive",  cls: "border-red-500" },
};

export default async function Dashboard() {
  const { supabase, profile } = await requireRole("admin", "pastor");

  // Record any status changes since the last visit, then load everything in parallel.
  await supabase.rpc("refresh_member_statuses");
  const [{ data: settings }, { data: overview }, { data: weeks }, { data: followup }, { data: birthdays }] =
    await Promise.all([
      supabase.from("settings").select("*").eq("id", 1).single(),
      supabase.from("member_overview").select("status").is("archived_at", null).eq("is_child", false),
      supabase.rpc("weekly_attendance", { p_weeks: 12 }),
      supabase.rpc("needs_followup"),
      supabase.rpc("upcoming_birthdays", { p_days: 7 }),
    ]);

  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<ActivityStatus, number>;
  for (const m of overview ?? []) if (m.status) counts[m.status as ActivityStatus]++;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const min = settings?.active_min_attendance ?? 3;
  const wks = settings?.window_weeks ?? 4;
  const hints: Record<ActivityStatus, string> = {
    active: `${min}+ times in ${wks} weeks`,
    new: `first ${settings?.new_member_days ?? 90} days`,
    irregular: min > 2 ? `1–${min - 1} times in ${wks} weeks` : `once in ${wks} weeks`,
    inactive: `not seen in ${wks}+ weeks`,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Good day, {profile.full_name.split(" ")[0] || "Pastor"}</h1>
        <p className="text-gray-600">{total} people tracked (children not counted).</p>
      </div>

      <section aria-label="Members by status" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATUS_ORDER.map((s) => (
          <Link key={s} href={`/members?status=${s}`} className={`card border-l-4 ${TILE[s].cls} hover:bg-gray-50`}>
            <div className="text-sm font-medium text-gray-700">{TILE[s].label}</div>
            <div className="text-3xl font-bold text-gray-900">{counts[s]}</div>
            <div className="text-xs text-gray-500">{hints[s]}</div>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 md:grid-cols-5">
        <section className="card md:col-span-3">
          <h2 className="mb-3 font-semibold">Weekly attendance — last 12 weeks</h2>
          <AttendanceChart data={(weeks ?? []) as WeekPoint[]} />
        </section>

        <section className="card md:col-span-2">
          <h2 className="mb-3 font-semibold">🎂 Birthdays in the next 7 days</h2>
          {birthdays?.length ? (
            <ul className="divide-y divide-gray-100">
              {birthdays.map((b: { member_id: string; first_name: string; last_name: string; next_birthday: string; turning: number }) => (
                <li key={b.member_id} className="flex items-center justify-between py-2">
                  <Link href={`/members/${b.member_id}`} className="font-medium hover:underline">
                    {b.first_name} {b.last_name}
                  </Link>
                  <span className="text-sm text-gray-600">
                    {formatDate(b.next_birthday, { year: undefined, weekday: "short" })} · turns {b.turning}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No birthdays this week.</p>
          )}
        </section>
      </div>

      <section className="card">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">🙏 Needs follow-up</h2>
          <span className="text-xs text-gray-500">recently became Irregular or Inactive</span>
        </div>
        {followup?.length ? (
          <ul className="divide-y divide-gray-100">
            {followup.map((f: { member_id: string; first_name: string; last_name: string; phone: string | null; status: ActivityStatus; previous_status: ActivityStatus; changed_at: string; last_attended: string | null }) => (
              <li key={f.member_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                <Link href={`/members/${f.member_id}`} className="font-medium hover:underline">
                  {f.first_name} {f.last_name}
                </Link>
                <StatusBadge status={f.status} />
                <span className="text-sm text-gray-600">
                  was {f.previous_status} · last attended {daysAgo(f.last_attended)}
                </span>
                {f.phone && (
                  <a href={`tel:${f.phone.replace(/\s/g, "")}`} className="ml-auto text-sm font-medium text-brand-700">
                    📞 Call
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Nobody needs follow-up right now. Praise God!</p>
        )}
      </section>
    </div>
  );
}
