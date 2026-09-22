import ErrorPageShell from "@/components/beebuddy/ErrorPageShell";

export const metadata = {
  title: "Page Not Found | BeeBuddy",
  description: "The page you are looking for does not exist on BeeBuddy.",
};

export default function NotFound() {
  return (
    <ErrorPageShell
      title="Oops! Page Not Found"
      description="We couldn’t find the page you were looking for. It might have been moved or no longer exists."
    />
  );
}
