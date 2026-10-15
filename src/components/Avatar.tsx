import { initials } from "@/lib/format";

export function Avatar({ first, last, url, size = 40 }: { first: string; last: string; url?: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-900"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials(first, last)}
    </span>
  );
}
