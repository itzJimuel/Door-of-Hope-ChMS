"use client";

import { useState } from "react";

export type WeekPoint = { week_start: string; people: number; sunday: number };

const H = 160;          // plot height in px
const BAR_MAX = 24;     // bars never wider than 24px

function weekLabel(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, day)));
}

/** Single-series column chart: unique people who attended anything that week. */
export function AttendanceChart({ data }: { data: WeekPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(10, ...data.map((d) => d.people));
  const step = max <= 20 ? 5 : max <= 60 ? 10 : 25;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const last = data[data.length - 1];

  return (
    <figure>
      <div className="relative flex gap-2" style={{ height: H + 24 }}>
        {/* y-axis */}
        <div className="relative w-7 shrink-0 text-right text-[11px] text-gray-500" style={{ height: H }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: H - (t / top) * H }}>{t}</span>
          ))}
        </div>
        {/* plot */}
        <div className="relative flex-1" style={{ height: H }}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-gray-100" style={{ top: H - (t / top) * H }} />
          ))}
          <div className="absolute inset-0 flex items-end">
            {data.map((d, i) => (
              <button key={d.week_start} type="button"
                className="relative flex h-full flex-1 items-end justify-center focus-visible:outline-2 focus-visible:outline-brand-600"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)} onBlur={() => setHover(null)} onClick={() => setHover(i)}
                aria-label={`Week of ${weekLabel(d.week_start)}: ${d.people} people, ${d.sunday} at Sunday service`}>
                <span className="block w-full rounded-t bg-[#2a78d6] transition-opacity"
                  style={{ maxWidth: BAR_MAX, height: (d.people / top) * H, opacity: hover === null || hover === i ? 1 : 0.45, marginInline: 1 }} />
                {hover === i && (
                  <span role="tooltip"
                    className="absolute bottom-full z-10 mb-1 rounded-lg bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow"
                    style={{ bottom: (d.people / top) * H + 6 }}>
                    <strong>{weekLabel(d.week_start)}</strong> · {d.people} people · {d.sunday} on Sunday
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        {/* x labels */}
        <div className="absolute right-0 bottom-0 left-9 flex text-[11px] text-gray-500">
          {data.map((d, i) => (
            <span key={d.week_start} className="flex-1 text-center">
              {i % 3 === 0 || i === data.length - 1 ? weekLabel(d.week_start) : ""}
            </span>
          ))}
        </div>
      </div>
      {last && (
        <figcaption className="mt-2 text-sm text-gray-600">
          This week so far: <strong className="text-gray-900">{last.people}</strong> people
          ({last.sunday} at Sunday service). Weeks run Sunday to Saturday.
        </figcaption>
      )}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-brand-700">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-gray-500"><tr><th className="py-1">Week of</th><th>People (any activity)</th><th>Sunday service</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.week_start} className="border-t border-gray-100">
                <td className="py-1">{weekLabel(d.week_start)}</td><td>{d.people}</td><td>{d.sunday}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
