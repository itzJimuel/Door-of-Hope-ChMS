import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, isStaff } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { daysAgo, formatDay } from "@/lib/format";
import type { ActivityStatus } from "@/lib/types";
import { setGroupLeader } from "../actions";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("admin", "pastor", "leader");
  const staff = isStaff(profile.role);

  const { data: group } = await supabase.from("groups").select("*").eq("id", id).single();
  if (!group) notFound();

  const { data: gm } = await supabase.from("group_members").select("member_id").eq("group_id", id);
  const ids = (gm ?? []).map((g) => g.member_id);

  const [{ data: roster }, { data: meetings }, { data: leaders }] = await Promise.all([
    supabase.from("member_overview").select("id, first_name, last_name, status, last_attended")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
      .is("archived_at", null).order("last_name"),
    supabase.from("events").select("id, title, starts_at, attendance(count)")
      .eq("group_id", id).order("starts_at", { ascending: false }).limit(8),
    staff
      ? supabase.from("profiles").select("id, full_name").in("role", ["leader", "pastor", "admin"]).order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);

  type R = { id: string; first_name: string; last_name: string; status: ActivityStatus | null; last_attended: string | null };
  type M = { id: string; title: string; starts_at: string; attendance: { count: number }[] };
  const people = (roster ?? []) as R[];
  const needsCare = people.filter((p) => p.status === "irregular" || p.status === "inactive").length;

  return (
    <div className="space-y-4">
      <Link href="/groups" className="text-sm text-brand-700">← Groups</Link>
      <div>
        <h1 className="page-title">{group.name}</h1>
        <p className="text-gray-600">
          {people.length} people{needsCare ? ` · ${needsCare} need a check-in call` : ""}
          {group.meeting_info ? ` · ${group.meeting_info}` : ""}
        </p>
      </div>

      {staff && (
        <form action={setGroupLeader.bind(null, id)} className="card flex flex-wrap items-end gap-2">
          <label className="flex-1">
            <span className="label">Group leader</span>
            <select name="leader_id" defaultValue={group.leader_id ?? ""} className="input">
              <option value="">— None —</option>
              {(leaders ?? []).map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
            </select>
          </label>
          <button className="btn-secondary">Save leader</button>
        </form>
      )}

      <section className="card p-0">
        <h2 className="px-4 pt-4 font-semibold">Roster</h2>
        <ul className="divide-y divide-gray-100">
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/members/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <Avatar first={p.first_name} last={p.last_name} size={36} />
                <div className="flex-1">
                  <div className="font-medium">{p.first_name} {p.last_name}</div>
                  <div className="text-xs text-gray-500">last seen {daysAgo(p.last_attended)}</div>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            </li>
          ))}
          {!people.length && <li className="px-4 py-6 text-center text-gray-500">No one in this group yet. Add people from their member profile.</li>}
        </ul>
        {staff && <p className="px-4 pb-4 text-xs text-gray-500">To add or remove people, edit their member profile.</p>}
      </section>

      {group.type === "small_group" && (
        <section className="card p-0">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="font-semibold">Recent meetings</h2>
            <Link href="/events" className="text-sm text-brand-700">+ New meeting</Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {((meetings ?? []) as M[]).map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <span>{formatDay(m.starts_at)}</span>
                <span className="text-sm text-gray-700"><strong>{m.attendance?.[0]?.count ?? 0}</strong> of {people.length}</span>
                <Link href={`/checkin/${m.id}`} className="btn-secondary">Check-in</Link>
              </li>
            ))}
            {!meetings?.length && <li className="px-4 py-6 text-center text-gray-500">No meetings recorded yet.</li>}
          </ul>
        </section>
      )}
    </div>
  );
}
