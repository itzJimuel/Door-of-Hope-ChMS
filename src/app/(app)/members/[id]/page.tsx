import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireRole, isStaff } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatDate, formatDateTime, daysAgo } from "@/lib/format";
import { EVENT_LABELS, MEMBERSHIP_LABELS, type ActivityStatus, type EventType, type MembershipStatus } from "@/lib/types";
import { deleteMember, setArchived } from "../actions";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-gray-600">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("admin", "pastor", "leader");
  const staff = isStaff(profile.role);

  const { data: m } = await supabase.from("members").select("*").eq("id", id).single();
  if (!m) notFound(); // also what a leader sees for someone outside their group

  // Audit: record that this user opened this record.
  await supabase.rpc("log_member_view", { p_member: id });

  const [{ data: ov }, { data: groups }, { data: attendance }, { data: family }, { data: household }, photo] =
    await Promise.all([
      supabase.from("member_overview").select("status, last_attended").eq("id", id).single(),
      supabase.from("group_members").select("groups(id, name, type)").eq("member_id", id),
      supabase.from("attendance")
        .select("method, events(title, type, starts_at)")
        .eq("member_id", id)
        .order("recorded_at", { ascending: false })
        .limit(15),
      m.household_id
        ? supabase.from("members").select("id, first_name, last_name, household_role, is_child")
            .eq("household_id", m.household_id).neq("id", id).is("archived_at", null)
        : Promise.resolve({ data: [] }),
      m.household_id
        ? supabase.from("households").select("name").eq("id", m.household_id).single()
        : Promise.resolve({ data: null }),
      m.photo_path
        ? supabase.storage.from("member-photos").createSignedUrl(m.photo_path, 3600)
        : Promise.resolve({ data: null }),
    ]);

  const qrSvg = await QRCode.toString(`DOH:${m.qr_token}`, { type: "svg", margin: 1, width: 180 });
  const photoUrl = photo.data?.signedUrl ?? null;

  type GroupRow = { groups: { id: string; name: string; type: string } | null };
  type AttRow = { method: string; events: { title: string; type: EventType; starts_at: string } | null };

  return (
    <div className="space-y-4">
      <Link href="/members" className="text-sm text-brand-700">← Members</Link>

      {m.archived_at && (
        <p className="rounded-xl bg-amber-50 p-3 text-amber-900">This record is archived (since {formatDateTime(m.archived_at)}).</p>
      )}

      <section className="card flex flex-wrap items-center gap-4">
        <Avatar first={m.first_name} last={m.last_name} url={photoUrl} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{m.first_name} {m.last_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <StatusBadge status={(ov?.status as ActivityStatus) ?? null} />
            <span>{MEMBERSHIP_LABELS[m.membership_status as MembershipStatus]}</span>
            <span>· last attended {daysAgo(ov?.last_attended)}</span>
          </div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {m.phone && <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="btn-secondary flex-1">📞 Call</a>}
          {m.phone && <a href={`sms:${m.phone.replace(/\s/g, "")}`} className="btn-secondary flex-1">💬 Text</a>}
          {staff && <Link href={`/members/${id}/edit`} className="btn-primary flex-1">Edit</Link>}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-1 font-semibold">Details</h2>
          <dl className="divide-y divide-gray-100 text-sm">
            <Row label="Birthday" value={formatDate(m.birthday)} />
            <Row label="Gender" value={m.gender && m.gender[0].toUpperCase() + m.gender.slice(1)} />
            <Row label="Civil status" value={m.civil_status && m.civil_status[0].toUpperCase() + m.civil_status.slice(1)} />
            <Row label="Mobile" value={m.phone} />
            <Row label="Email" value={m.email} />
            <Row label="Address" value={m.address} />
            <Row label="First visit" value={formatDate(m.first_visit_date)} />
            <Row label="Joined" value={formatDate(m.date_joined)} />
            <Row label="Baptized" value={formatDate(m.baptism_date)} />
          </dl>
        </section>

        <div className="space-y-4">
          <section className="card">
            <h2 className="mb-2 font-semibold">Family {household?.name && <span className="font-normal text-gray-500">· {household.name}</span>}</h2>
            {family?.length ? (
              <ul className="space-y-2">
                {family.map((f) => (
                  <li key={f.id}>
                    <Link href={`/members/${f.id}`} className="flex items-center gap-2 hover:underline">
                      <Avatar first={f.first_name} last={f.last_name} size={32} />
                      <span>{f.first_name} {f.last_name}</span>
                      <span className="text-xs text-gray-500">{f.household_role}{f.is_child ? " · child" : ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-500">{staff ? "No family members linked." : "—"}</p>}
          </section>

          <section className="card">
            <h2 className="mb-2 font-semibold">Groups &amp; ministries</h2>
            <div className="flex flex-wrap gap-2">
              {((groups ?? []) as unknown as GroupRow[]).map((g) => g.groups && (
                <Link key={g.groups.id} href={`/groups/${g.groups.id}`} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-900">
                  {g.groups.name}
                </Link>
              ))}
              {!groups?.length && <p className="text-sm text-gray-500">Not in any group yet.</p>}
            </div>
          </section>
        </div>

        <section className="card">
          <h2 className="mb-2 font-semibold">Recent attendance</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {((attendance ?? []) as unknown as AttRow[]).map((a, i) => a.events && (
              <li key={i} className="flex justify-between py-2">
                <span>{a.events.title} <span className="text-gray-500">· {EVENT_LABELS[a.events.type]}</span></span>
                <span className="text-gray-600">{formatDateTime(a.events.starts_at)}</span>
              </li>
            ))}
            {!attendance?.length && <li className="py-2 text-gray-500">No attendance recorded yet.</li>}
          </ul>
        </section>

        <section className="card text-center">
          <h2 className="mb-2 font-semibold">Check-in QR code</h2>
          <div className="mx-auto w-44" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          {staff && <Link href={`/members/cards?id=${id}`} className="btn-secondary mt-3">🖨️ Print ID card</Link>}
        </section>
      </div>

      {staff && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Privacy &amp; record</h2>
          <p className="text-sm text-gray-600">
            Consent given on <strong>{formatDate(m.consent_date)}</strong>{m.consent_notes ? ` — ${m.consent_notes}` : ""}.
          </p>
          <div className="flex flex-wrap gap-2">
            <form action={setArchived.bind(null, id, !m.archived_at)}>
              <button className="btn-secondary">{m.archived_at ? "Restore record" : "Archive (moved away / left)"}</button>
            </form>
            {profile.role === "admin" && (
              <form action={deleteMember.bind(null, id)}>
                <ConfirmButton className="btn-danger"
                  message={`Permanently delete ${m.first_name} ${m.last_name} and all their attendance? This cannot be undone.`}>
                  Delete permanently
                </ConfirmButton>
              </form>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
