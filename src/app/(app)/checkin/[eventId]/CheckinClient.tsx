"use client";

import { useMemo, useState } from "react";
import { checkIn, checkInByQr, undoCheckIn } from "../actions";
import { QrScanner } from "./QrScanner";

export type RosterEntry = { member_id: string; first_name: string; last_name: string; is_child: boolean; checked_in: boolean };
type Toast = { kind: "ok" | "info" | "error"; text: string } | null;

export function CheckinClient({ eventId, initial }: { eventId: string; initial: RosterEntry[] }) {
  const [roster, setRoster] = useState(initial);
  const [tab, setTab] = useState<"tap" | "qr">("tap");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<Toast>(null);

  const count = roster.filter((r) => r.checked_in).length;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? roster.filter((r) => `${r.first_name} ${r.last_name}`.toLowerCase().includes(q)) : roster;
  }, [roster, search]);

  const setChecked = (id: string, value: boolean) =>
    setRoster((rs) => rs.map((r) => (r.member_id === id ? { ...r, checked_in: value } : r)));

  function show(t: Toast) {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 3000);
  }

  async function toggle(r: RosterEntry) {
    if (r.checked_in) {
      if (!confirm(`Remove ${r.first_name} ${r.last_name} from this check-in?`)) return;
      setChecked(r.member_id, false);
      const res = await undoCheckIn(eventId, r.member_id);
      if ("error" in res) { setChecked(r.member_id, true); show({ kind: "error", text: res.error! }); }
      return;
    }
    setChecked(r.member_id, true); // optimistic: feels instant at a busy door
    const res = await checkIn(eventId, r.member_id);
    if ("error" in res) { setChecked(r.member_id, false); show({ kind: "error", text: res.error! }); }
  }

  async function onScan(text: string) {
    const res = await checkInByQr(eventId, text);
    if ("error" in res) { show({ kind: "error", text: res.error! }); return; }
    setChecked(res.member_id, true);
    navigator.vibrate?.(120);
    show(res.newly_checked_in
      ? { kind: "ok", text: `✓ Welcome, ${res.first_name} ${res.last_name}!` }
      : { kind: "info", text: `${res.first_name} ${res.last_name} is already checked in.` });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div role="tablist" className="inline-flex rounded-xl bg-gray-200 p-1">
          {(["tap", "qr"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`min-h-10 rounded-lg px-4 text-sm font-medium ${tab === t ? "bg-white shadow" : "text-gray-700"}`}>
              {t === "tap" ? "👆 Tap names" : "📷 Scan QR"}
            </button>
          ))}
        </div>
        <div className="text-right" aria-live="polite">
          <div className="text-2xl font-bold">{count}</div>
          <div className="text-xs text-gray-500">checked in</div>
        </div>
      </div>

      {toast && (
        <div role="status"
          className={`sticky top-16 z-10 rounded-xl p-3 text-center font-medium shadow ${
            toast.kind === "ok" ? "bg-green-600 text-white" : toast.kind === "info" ? "bg-blue-50 text-blue-900" : "bg-red-50 text-red-800"}`}>
          {toast.text}
        </div>
      )}

      {tab === "qr" ? (
        <QrScanner onScan={onScan} />
      ) : (
        <>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a name to find them…" aria-label="Search names" className="input sticky top-16 z-[5] shadow-sm" />
          <ul className="grid gap-2 sm:grid-cols-2">
            {filtered.map((r) => (
              <li key={r.member_id}>
                <button onClick={() => toggle(r)} aria-pressed={r.checked_in}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-4 text-left ring-1 transition ${
                    r.checked_in ? "bg-green-50 ring-green-500" : "bg-white ring-gray-200 active:bg-gray-100"}`}>
                  <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                    r.checked_in ? "border-green-600 bg-green-600 text-white" : "border-gray-300"}`}>
                    {r.checked_in ? "✓" : ""}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium">{r.first_name} {r.last_name}</span>
                    {r.is_child && <span className="ml-2 text-xs text-gray-500">child</span>}
                  </span>
                  <span className="text-xs text-gray-500">{r.checked_in ? "Here" : ""}</span>
                </button>
              </li>
            ))}
          </ul>
          {filtered.length === 0 && <p className="text-center text-gray-500">No one by that name. Visitors can be added by a pastor or admin.</p>}
        </>
      )}
    </div>
  );
}
