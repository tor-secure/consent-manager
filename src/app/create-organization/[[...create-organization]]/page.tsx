import { CreateOrganization } from "@clerk/nextjs";
import { AuthPageShell, clerkAuthAppearance } from "@/components/auth/auth-page-shell";

export default function CreateOrganizationPage() {
  return (
    <AuthPageShell mode="create-org">
      <CreateOrganization
        afterCreateOrganizationUrl="/dashboard"
        appearance={clerkAuthAppearance}
      />
    </AuthPageShell>
  );
}
