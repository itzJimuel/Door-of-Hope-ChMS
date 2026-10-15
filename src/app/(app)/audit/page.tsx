import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const NONE = "00000000-0000-0000-0000-000000000000";

const ACTION_LABEL: Record<string, string> = { view: "👁 viewed", create: "➕ created", update: "✏️ edited", delete: "🗑 deleted" };

export default async function AuditPage() {
  const { supabase } = await requireRole("admin");
  const { data: log } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(300);

  const userIds = [...new Set((log ?? []).map((l) => l.user_id).filter(Boolean))];
  const memberIds = [...new Set((log ?? []).map((l) => l.member_id).filter(Boolean))];
  const [{ data: users }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", userIds.length ? userIds : [NONE]),
    supabase.from("members").select("id, first_name, last_name").in("id", memberIds.length ? memberIds : [NONE]),
  ]);
  const userName = new Map((users ?? []).map((u) => [u.id, u.full_name]));
  const memberName = new Map((members ?? []).map((m) => [m.id, `${m.first_name} ${m.last_name}`]));

  return (
    <div className="space-y-4">
      <Link href="/settings" className="text-sm text-brand-700">← Settings</Link>
      <h1 className="page-title">Audit log</h1>
      <p className="text-sm text-gray-600">Who viewed or changed member records (latest 300). Entries cannot be edited or deleted.</p>
      <ul className="card divide-y divide-gray-100 p-0 text-sm">
        {(log ?? []).map((l) => (
          <li key={l.id} className="flex flex-wrap gap-x-2 px-4 py-2">
            <span className="text-gray-500">{formatDateTime(l.created_at)}</span>
            <span className="font-medium">{l.user_id ? userName.get(l.user_id) ?? "Unknown user" : "System"}</span>
            <span>{ACTION_LABEL[l.action] ?? l.action}</span>
            {l.member_id && memberName.has(l.member_id)
              ? <Link href={`/members/${l.member_id}`} className="text-brand-700">{memberName.get(l.member_id)}</Link>
              : <span className="text-gray-500">(deleted record)</span>}
            {Array.isArray(l.details) && l.details.length > 0 && (
              <span className="text-gray-500">— {l.details.join(", ").replaceAll("_", " ")}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
