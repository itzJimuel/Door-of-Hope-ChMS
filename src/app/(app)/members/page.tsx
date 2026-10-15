import Link from "next/link";
import { requireRole, isStaff } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { daysAgo } from "@/lib/format";
import { MEMBERSHIP_LABELS, STATUS_ORDER, type ActivityStatus, type MembershipStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = {
  id: string; first_name: string; last_name: string; status: ActivityStatus | null;
  membership_status: MembershipStatus; last_attended: string | null; is_child: boolean;
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; group?: string; archived?: string }>;
}) {
  const { supabase, profile } = await requireRole("admin", "pastor", "leader");
  const sp = await searchParams;
  const staff = isStaff(profile.role);

  const { data: groups } = await supabase.from("groups").select("id, name").order("name");

  let query = supabase
    .from("member_overview")
    .select("id, first_name, last_name, status, membership_status, last_attended, is_child")
    .order("last_name")
    .order("first_name");

  query = sp.archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (sp.status && STATUS_ORDER.includes(sp.status as ActivityStatus)) query = query.eq("status", sp.status);
  if (sp.q) {
    const q = sp.q.replace(/[%,()]/g, " ").trim();
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  }
  if (sp.group) {
    const { data: gm } = await supabase.from("group_members").select("member_id").eq("group_id", sp.group);
    query = query.in("id", (gm ?? []).map((g) => g.member_id));
  }

  const { data } = await query;
  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="page-title">{sp.archived ? "Archived members" : "Members"}</h1>
        {staff && (
          <div className="flex gap-2">
            <Link href="/members/cards" className="btn-secondary">🪪 QR cards</Link>
            <Link href="/members/new" className="btn-primary">+ Add member</Link>
          </div>
        )}
      </div>

      <form className="card grid gap-2 sm:grid-cols-4" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search name…" aria-label="Search by name" className="input sm:col-span-2" />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Filter by status" className="input">
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select name="group" defaultValue={sp.group ?? ""} aria-label="Filter by group" className="input">
          <option value="">All groups</option>
          {(groups ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        {sp.archived && <input type="hidden" name="archived" value="1" />}
        <button className="btn-primary sm:col-span-4">Filter</button>
      </form>

      <p className="text-sm text-gray-600">{rows.length} {rows.length === 1 ? "person" : "people"}</p>

      <ul className="card divide-y divide-gray-100 p-0">
        {rows.map((m) => (
          <li key={m.id}>
            <Link href={`/members/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
              <Avatar first={m.first_name} last={m.last_name} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{m.last_name}, {m.first_name}</div>
                <div className="text-xs text-gray-500">
                  {MEMBERSHIP_LABELS[m.membership_status]} · last seen {daysAgo(m.last_attended)}
                </div>
              </div>
              <StatusBadge status={m.status} />
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="p-6 text-center text-gray-500">No one matches these filters.</li>}
      </ul>

      {staff && (
        <p className="text-center text-sm">
          {sp.archived
            ? <Link href="/members" className="text-brand-700">← Back to current members</Link>
            : <Link href="/members?archived=1" className="text-gray-500">View archived members</Link>}
        </p>
      )}
    </div>
  );
}
