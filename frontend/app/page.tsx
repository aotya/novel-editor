import Home from "@/components/home";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

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
