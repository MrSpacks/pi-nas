import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Dashboard } from "./Dashboard";

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("nas_session")?.value;
  const expected = process.env.NAS_PASSWORD;
  if (!session || !expected || session !== expected) redirect("/login");
  return <Dashboard />;
}
