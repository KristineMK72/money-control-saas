import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminSecurityPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  return (
    <main style={{ padding: 24, color: "white" }}>
      <h1>Admin Security & Analytics</h1>
      <p>Admin page is working.</p>
    </main>
  );
}
