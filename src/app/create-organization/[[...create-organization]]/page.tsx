import { CreateOrganization } from "@clerk/nextjs";

export default function CreateOrganizationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <CreateOrganization />
    </main>
  );
}