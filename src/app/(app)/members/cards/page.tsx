import Link from "next/link";
import QRCode from "qrcode";
import { requireRole } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

/** Printable wallet-size (CR80, 85.6 × 54 mm) ID cards with each member's check-in QR code. */
export default async function CardsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const { supabase } = await requireRole("admin", "pastor");

  let q = supabase.from("members").select("id, first_name, last_name, qr_token, photo_path")
    .is("archived_at", null).order("last_name").order("first_name");
  if (id) q = q.eq("id", id);
  const { data: members } = await q;
  const list = members ?? [];

  const paths = list.map((m) => m.photo_path).filter(Boolean) as string[];
  const { data: signed } = paths.length
    ? await supabase.storage.from("member-photos").createSignedUrls(paths, 3600)
    : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const cards = await Promise.all(list.map(async (m) => ({
    ...m,
    svg: await QRCode.toString(`DOH:${m.qr_token}`, { type: "svg", margin: 0 }),
    photo: m.photo_path ? urlFor.get(m.photo_path) ?? null : null,
  })));

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/members" className="text-sm text-brand-700">← Members</Link>
          <h1 className="page-title">QR ID cards</h1>
          <p className="text-sm text-gray-600">{cards.length} card{cards.length === 1 ? "" : "s"}. Print on thick paper, cut, and laminate if you can.</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-2">
        {cards.map((c) => (
          <div key={c.id} className="flex break-inside-avoid items-center gap-3 rounded-lg border border-gray-400 bg-white p-3"
            style={{ width: "85.6mm", height: "54mm" }}>
            <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
              <div className="text-[9px] font-semibold tracking-wide text-brand-700 uppercase">Door of Hope Assembly of God</div>
              <div className="flex items-center gap-2">
                <Avatar first={c.first_name} last={c.last_name} url={c.photo} size={44} />
                <div className="min-w-0">
                  <div className="text-sm leading-tight font-bold">{c.first_name}</div>
                  <div className="text-sm leading-tight">{c.last_name}</div>
                </div>
              </div>
              <div className="text-[8px] text-gray-500">Show this card at the entrance to check in.</div>
            </div>
            <div className="w-[30mm] shrink-0" dangerouslySetInnerHTML={{ __html: c.svg }} />
          </div>
        ))}
      </div>
    </div>
  );
}
