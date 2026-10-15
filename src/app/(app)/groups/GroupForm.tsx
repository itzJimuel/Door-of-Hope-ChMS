"use client";

import { useActionState } from "react";
import { createGroup } from "./actions";

export function GroupForm({ leaders }: { leaders: { id: string; full_name: string }[] }) {
  const [error, action, pending] = useActionState(createGroup, null);
  return (
    <details className="card">
      <summary className="cursor-pointer font-semibold">+ New group or ministry</summary>
      <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label><span className="label">Name</span><input name="name" required className="input" /></label>
        <label>
          <span className="label">Type</span>
          <select name="type" className="input">
            <option value="small_group">Small group (has meetings)</option>
            <option value="ministry">Ministry / team</option>
          </select>
        </label>
        <label>
          <span className="label">Leader</span>
          <select name="leader_id" className="input">
            <option value="">— None yet —</option>
            {leaders.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
          </select>
        </label>
        <label><span className="label">Meeting info</span><input name="meeting_info" placeholder="e.g. Fridays 7pm" className="input" /></label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{error}</p>}
        <button className="btn-primary sm:col-span-2" disabled={pending}>Create group</button>
      </form>
    </details>
  );
}
