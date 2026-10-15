import Link from "next/link";
import { requireRole, isStaff } from "@/lib/auth";
import { GroupForm } from "./GroupForm";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const { supabase, profile } = await requireRole("admin", "pastor", "leader");
  const staff = isStaff(profile.role);

  const [{ data: groups }, { data: leaders }] = await Promise.all([
    supabase.from("groups").select("id, name, type, meeting_info, leader_id, group_members(count)").order("type").order("name"),
    staff
      ? supabase.from("profiles").select("id, full_name").in("role", ["leader", "pastor", "admin"]).order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);
  const leaderName = new Map((leaders ?? []).map((l) => [l.id, l.full_name]));

  type G = { id: string; name: string; type: string; meeting_info: string | null; leader_id: string | null; group_members: { count: number }[] };

  return (
    <div className="space-y-4">
      <h1 className="page-title">{staff ? "Groups & ministries" : "My groups"}</h1>
      {staff && <GroupForm leaders={leaders ?? []} />}
      <ul className="grid gap-3 sm:grid-cols-2">
        {((groups ?? []) as G[]).map((g) => (
          <li key={g.id}>
            <Link href={`/groups/${g.id}`} className="card block hover:bg-gray-50">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{g.name}</div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {g.type === "ministry" ? "Ministry" : "Small group"}
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {g.group_members?.[0]?.count ?? 0} people
                {staff && ` · Leader: ${g.leader_id ? leaderName.get(g.leader_id) ?? "—" : "none yet"}`}
              </div>
              {g.meeting_info && <div className="text-sm text-gray-500">{g.meeting_info}</div>}
            </Link>
          </li>
        ))}
      </ul>
      {!groups?.length && (
        <p className="card text-gray-600">
          {staff ? "No groups yet." : "You're not leading any group yet. Ask the admin to assign you as a group leader."}
        </p>
      )}
    </div>
  );
}
