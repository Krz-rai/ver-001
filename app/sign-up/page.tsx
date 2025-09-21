"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function SignUpPage() {
  const router = useRouter();
  const { isSignedIn } = useUser();

  useEffect(() => {
    // If user is already signed in, redirect to calendar
    if (isSignedIn) {
      router.push("/calendar");
    } else {
      // If not signed in, redirect to root page (which shows landing for unauth users)
      router.push("/");
    }
  }, [isSignedIn, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Redirecting...
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we redirect you.
        </p>
      </div>
    </div>
  );
}

