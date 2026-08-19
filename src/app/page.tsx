import { redirect } from "next/navigation";
import { getUserProfile } from "@/utils/supabase/server";

export default async function RootPage() {
  const identity = await getUserProfile();

  if (!identity) {
    redirect("/login");
  }

  switch (identity.role) {
    case "ACS_ADMIN":
      redirect("/admin/dashboard");
    case "OEM":
      redirect("/oem/dashboard");
    case "DEALER":
      redirect("/dealer/dashboard");
    case "PARTNER":
      redirect("/partner/dashboard");
    case "TECHNICIAN":
      redirect("/technician/dashboard");
    default:
      redirect("/login");
  }
}
