import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { ThresholdsForm, NewUserForm } from "./Forms";
import { resetPassword, setRole } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, profile } = await requireRole("admin");
  const [{ data: settings }, { data: users }] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).single(),
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Settings</h1>
        <Link href="/audit" className="btn-secondary">📜 Audit log</Link>
      </div>

      {settings && <ThresholdsForm s={settings} />}

      <section className="card space-y-4">
        <h2 className="font-semibold">People who can sign in</h2>
        <ul className="divide-y divide-gray-100">
          {(users ?? []).map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="flex-1 font-medium">{u.full_name}{u.id === profile.id && " (you)"}</span>
              <form action={setRole.bind(null, u.id)} className="flex gap-2">
                <select name="role" defaultValue={u.role} aria-label={`Role for ${u.full_name}`} className="input min-h-10 w-auto py-1">
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <button className="btn-secondary min-h-10">Save</button>
              </form>
              <details className="w-full text-sm">
                <summary className="cursor-pointer text-gray-500">Reset password</summary>
                <form action={resetPassword.bind(null, u.id)} className="mt-2 flex gap-2">
                  <input name="password" type="text" minLength={10} required placeholder="New temporary password (10+ characters)"
                    aria-label={`New password for ${u.full_name}`} autoComplete="off" className="input min-h-10 flex-1" />
                  <button className="btn-secondary min-h-10">Set</button>
                </form>
              </details>
            </li>
          ))}
        </ul>
        <details>
          <summary className="cursor-pointer font-medium text-brand-700">+ Add a person who can sign in</summary>
          <div className="mt-3"><NewUserForm /></div>
        </details>
        <p className="text-xs text-gray-500">
          Group leaders only see members of the groups they lead. Set a group&apos;s leader on the Groups page.
        </p>
      </section>
    </div>
  );
}
