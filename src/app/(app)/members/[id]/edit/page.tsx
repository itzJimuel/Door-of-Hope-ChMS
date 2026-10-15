import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { MemberForm, type MemberRecord } from "../../MemberForm";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole("admin", "pastor");
  const [{ data: member }, { data: households }, { data: groups }, { data: gm }] = await Promise.all([
    supabase.from("members").select("*").eq("id", id).single<MemberRecord>(),
    supabase.from("households").select("id, name").order("name"),
    supabase.from("groups").select("id, name, type").order("name"),
    supabase.from("group_members").select("group_id").eq("member_id", id),
  ]);
  if (!member) notFound();

  return (
    <div className="space-y-4">
      <h1 className="page-title">Edit {member.first_name} {member.last_name}</h1>
      <MemberForm member={member} households={households ?? []} groups={groups ?? []}
        memberGroupIds={(gm ?? []).map((g) => g.group_id)} />
    </div>
  );
}
