import type { ActivityStatus } from "@/lib/types";

// Status colors are paired with an icon + word, never color alone.
const STYLES: Record<ActivityStatus, { label: string; icon: string; cls: string }> = {
  active:    { label: "Active",    icon: "●", cls: "bg-green-50 text-green-800 ring-green-600/30" },
  new:       { label: "New",       icon: "★", cls: "bg-blue-50 text-blue-800 ring-blue-600/30" },
  irregular: { label: "Irregular", icon: "◐", cls: "bg-amber-50 text-amber-900 ring-amber-600/40" },
  inactive:  { label: "Inactive",  icon: "○", cls: "bg-red-50 text-red-800 ring-red-600/30" },
};

export function StatusBadge({ status }: { status: ActivityStatus | null }) {
  if (!status) return <span className="text-xs text-gray-500">Child</span>;
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}

export const STATUS_LABEL = (s: ActivityStatus) => STYLES[s].label;
export const STATUS_ICON = (s: ActivityStatus) => STYLES[s].icon;
