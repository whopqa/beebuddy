import AuthShell from "@/components/auth/AuthShell";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return <AuthShell mode="reset" resetToken={searchParams.token || ""} />;
}
