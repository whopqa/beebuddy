"use client";

import { useEffect } from "react";
import ErrorPageShell from "@/components/beebuddy/ErrorPageShell";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorPageShell
      title="Oops! Something went wrong"
      description="An unexpected error occurred while loading this page. Please try again."
      onRetry={reset}
    />
  );
}
