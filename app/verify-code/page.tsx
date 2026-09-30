import AuthShell from "@/components/auth/AuthShell";

export default function VerifyCodePage({
  searchParams,
}: {
  searchParams: { email?: string; devCode?: string; deliveryFailed?: string };
}) {
  return (
    <AuthShell
      mode="verify"
      initialEmail={searchParams.email || ""}
      developmentCode={searchParams.devCode || ""}
      deliveryFailed={searchParams.deliveryFailed === "1"}
    />
  );
}
