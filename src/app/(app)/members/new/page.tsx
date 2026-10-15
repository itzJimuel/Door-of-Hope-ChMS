import { requireRole } from "@/lib/auth";
import { MemberForm } from "../MemberForm";

export default async function NewMemberPage() {
  const { supabase } = await requireRole("admin", "pastor");
  const [{ data: households }, { data: groups }] = await Promise.all([
    supabase.from("households").select("id, name").order("name"),
    supabase.from("groups").select("id, name, type").order("name"),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="page-title">Add member</h1>
      <MemberForm households={households ?? []} groups={groups ?? []} />
    </div>
  );
}
