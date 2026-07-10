import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { AdminOverview } from "@/components/AdminOverview";

export default async function AdminPage() {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/sign-in");
  if (user.role !== "admin") redirect("/");
  return <AdminOverview />;
}
