"use client";

import { useActionState, useState } from "react";
import { createEvent } from "./actions";
import { todayISO } from "@/lib/format";

export function EventForm({ groups, staff }: { groups: { id: string; name: string }[]; staff: boolean }) {
  const [error, action, pending] = useActionState(createEvent, null);
  const [type, setType] = useState(staff ? "sunday_service" : "small_group");

  return (
    <form action={action} className="card grid gap-3 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">New service or meeting</h2>
      <label>
        <span className="label">Type</span>
        <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="input">
          {staff && <option value="sunday_service">Sunday Service</option>}
          <option value="small_group">Small Group meeting</option>
          {staff && <option value="prayer_meeting">Prayer Meeting</option>}
          {staff && <option value="event">Special event</option>}
        </select>
      </label>
      {type === "small_group" ? (
        <label>
          <span className="label">Group</span>
          <select name="group_id" required className="input">
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
      ) : (
        <label>
          <span className="label">Title (optional)</span>
          <input name="title" placeholder={type === "event" ? "e.g. Youth Night" : ""} className="input" />
        </label>
      )}
      <label>
        <span className="label">Date</span>
        <input type="date" name="date" required defaultValue={todayISO()} className="input" />
      </label>
      <label>
        <span className="label">Time</span>
        <input key={type} type="time" name="time" required defaultValue={type === "sunday_service" ? "09:00" : "19:00"} className="input" />
      </label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{error}</p>}
      <button className="btn-primary sm:col-span-2" disabled={pending}>{pending ? "Creating…" : "Create"}</button>
    </form>
  );
}
