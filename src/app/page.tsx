import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";

export default async function Home() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <AppShell />;
}
