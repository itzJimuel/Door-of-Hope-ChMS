"use client";

import { startTransition, useActionState, useState } from "react";
import { saveMember } from "./actions";
import { todayISO } from "@/lib/format";

export type MemberRecord = {
  id: string; first_name: string; last_name: string; gender: string | null; civil_status: string | null;
  birthday: string | null; phone: string | null; email: string | null; address: string | null;
  household_id: string | null; household_role: string | null; is_child: boolean;
  first_visit_date: string; date_joined: string | null; baptism_date: string | null;
  membership_status: string; consent_given: boolean; consent_date: string | null; consent_notes: string | null;
};

type Option = { id: string; name: string };

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export function MemberForm({
  member, households, groups, memberGroupIds = [],
}: {
  member?: MemberRecord; households: Option[]; groups: (Option & { type: string })[]; memberGroupIds?: string[];
}) {
  const [error, action, pending] = useActionState(saveMember, null);
  const [household, setHousehold] = useState(member?.household_id ?? "");
  const m = member;

  // Submit via onSubmit (not form action=) so React doesn't clear the form if saving fails.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {m && <input type="hidden" name="id" value={m.id} />}

      <fieldset className="card grid gap-4 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Personal details</legend>
        <Field label="First name *"><input name="first_name" required defaultValue={m?.first_name} className="input" autoComplete="off" /></Field>
        <Field label="Last name *"><input name="last_name" required defaultValue={m?.last_name} className="input" autoComplete="off" /></Field>
        <Field label="Birthday"><input type="date" name="birthday" defaultValue={m?.birthday ?? ""} className="input" /></Field>
        <Field label="Gender">
          <select name="gender" defaultValue={m?.gender ?? ""} className="input">
            <option value="">—</option><option value="male">Male</option><option value="female">Female</option>
          </select>
        </Field>
        <Field label="Civil status">
          <select name="civil_status" defaultValue={m?.civil_status ?? ""} className="input">
            <option value="">—</option><option value="single">Single</option><option value="married">Married</option>
            <option value="widowed">Widowed</option><option value="separated">Separated</option>
          </select>
        </Field>
        <Field label="Photo" hint="Optional. JPG or PNG, up to 4 MB.">
          <input type="file" name="photo" accept="image/*" className="block w-full text-sm" />
        </Field>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" name="is_child" defaultChecked={m?.is_child} className="h-5 w-5" />
          <span>This is a child (not counted in status or follow-up lists)</span>
        </label>
      </fieldset>

      <fieldset className="card grid gap-4 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Contact</legend>
        <Field label="Mobile number"><input name="phone" type="tel" inputMode="tel" defaultValue={m?.phone ?? ""} placeholder="0917 123 4567" className="input" /></Field>
        <Field label="Email"><input name="email" type="email" defaultValue={m?.email ?? ""} className="input" /></Field>
        <div className="sm:col-span-2">
          <Field label="Address"><input name="address" defaultValue={m?.address ?? ""} className="input" /></Field>
        </div>
      </fieldset>

      <fieldset className="card grid gap-4 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Family</legend>
        <Field label="Household">
          <select name="household_id" value={household} onChange={(e) => setHousehold(e.target.value)} className="input">
            <option value="">— None —</option>
            {households.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            <option value="__new">+ New household…</option>
          </select>
        </Field>
        {household === "__new" && (
          <Field label="New household name"><input name="new_household" placeholder="e.g. Santos Family" className="input" /></Field>
        )}
        {household && (
          <Field label="Role in household">
            <select name="household_role" defaultValue={m?.household_role ?? "head"} className="input">
              <option value="head">Head</option><option value="spouse">Spouse</option>
              <option value="child">Child</option><option value="other">Other</option>
            </select>
          </Field>
        )}
      </fieldset>

      <fieldset className="card grid gap-4 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Church life</legend>
        <Field label="Membership">
          <select name="membership_status" defaultValue={m?.membership_status ?? "visitor"} className="input">
            <option value="visitor">Visitor</option><option value="regular_attendee">Regular Attendee</option><option value="member">Member</option>
          </select>
        </Field>
        <Field label="First visit *"><input type="date" name="first_visit_date" required defaultValue={m?.first_visit_date ?? todayISO()} className="input" /></Field>
        <Field label="Date joined (membership)"><input type="date" name="date_joined" defaultValue={m?.date_joined ?? ""} className="input" /></Field>
        <Field label="Baptism date"><input type="date" name="baptism_date" defaultValue={m?.baptism_date ?? ""} className="input" /></Field>
        <div className="sm:col-span-2">
          <span className="label">Small groups &amp; ministries</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <label key={g.id} className="flex min-h-11 items-center gap-2 rounded-xl px-3 ring-1 ring-gray-200">
                <input type="checkbox" name="group_ids" value={g.id} defaultChecked={memberGroupIds.includes(g.id)} className="h-5 w-5" />
                <span>{g.name}</span>
                <span className="ml-auto text-xs text-gray-500">{g.type === "ministry" ? "Ministry" : "Small group"}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="card space-y-3 border-l-4 border-brand-600">
        <legend className="px-1 font-semibold">Consent (Data Privacy Act of 2012)</legend>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="consent_given" required defaultChecked={m?.consent_given} className="mt-1 h-5 w-5" />
          <span>
            This person (or their parent/guardian) agreed that Door of Hope may keep these details to care for
            them and keep track of their attendance.
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date consent was given *"><input type="date" name="consent_date" required defaultValue={m?.consent_date ?? todayISO()} className="input" /></Field>
          <Field label="How (optional)"><input name="consent_notes" defaultValue={m?.consent_notes ?? ""} placeholder="e.g. Signed paper form" className="input" /></Field>
        </div>
      </fieldset>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
      <div className="sticky bottom-16 flex gap-2 md:bottom-4">
        <button className="btn-primary flex-1 shadow-lg" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}
