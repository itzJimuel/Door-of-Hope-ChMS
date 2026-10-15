import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { signOut } from "../login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSession();
  if (profile.role === "member") redirect("/no-access");

  return (
    <>
      <Nav role={profile.role} name={profile.full_name} signOut={signOut} />
      <main className="mx-auto max-w-5xl px-4 pt-4 pb-24 md:pb-10">{children}</main>
    </>
  );
}
