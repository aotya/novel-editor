import Home from "@/components/home";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: novels, error } = await supabase
    .from("novels")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching novels:", error);
  }

  return (
    <div>
      <Home novels={novels || []} />
    </div>
  );
}
