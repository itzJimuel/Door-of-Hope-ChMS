"use client";

import { useActionState } from "react";
import { createUser, saveThresholds } from "./actions";
import { ROLE_LABELS, type Role } from "@/lib/types";

type Settings = { active_min_attendance: number; window_weeks: number; new_member_days: number; followup_lookback_days: number };

function Num({ name, label, value, hint }: { name: keyof Settings; label: string; value: number; hint: string }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input type="number" inputMode="numeric" name={name} defaultValue={value} min={1} required className="input" />
      <span className="mt-1 block text-xs text-gray-500">{hint}</span>
    </label>
  );
}

export function ThresholdsForm({ s }: { s: Settings }) {
  const [msg, action, pending] = useActionState(saveThresholds, null);
  return (
    <form action={action} className="card grid gap-4 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">Activity status rules</h2>
      <Num name="window_weeks" label="Look-back window (weeks)" value={s.window_weeks} hint="How far back attendance is counted." />
      <Num name="active_min_attendance" label="Times to count as Active" value={s.active_min_attendance} hint="Fewer (but at least 1) = Irregular. None = Inactive." />
      <Num name="new_member_days" label="'New' period (days)" value={s.new_member_days} hint="Days after first visit that someone is shown as New." />
      <Num name="followup_lookback_days" label="Follow-up list (days)" value={s.followup_lookback_days} hint="Show people whose status dropped within this many days." />
      {msg && <p role="status" className="text-sm sm:col-span-2">{msg}</p>}
      <button className="btn-primary sm:col-span-2" disabled={pending}>Save rules</button>
    </form>
  );
}

export function NewUserForm() {
  const [msg, action, pending] = useActionState(createUser, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label><span className="label">Full name</span><input name="full_name" required className="input" /></label>
      <label><span className="label">Email</span><input name="email" type="email" required className="input" /></label>
      <label><span className="label">Temporary password</span><input name="password" type="text" minLength={10} required autoComplete="off" className="input" /></label>
      <label>
        <span className="label">Role</span>
        <select name="role" defaultValue="usher" className="input">
          {(Object.keys(ROLE_LABELS) as Role[]).filter((r) => r !== "member").map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </label>
      {msg && <p role="status" className="text-sm sm:col-span-2">{msg}</p>}
      <button className="btn-primary sm:col-span-2" disabled={pending}>Create account</button>
    </form>
  );
}
