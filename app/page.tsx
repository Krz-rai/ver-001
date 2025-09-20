"use client";

import {
  Authenticated,
  Unauthenticated,
} from "convex/react";
import Link from "next/link";
import { SignUpButton } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <>
        <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
          Google Calendar Clone
          <div className="w-8 h-8" /> {/* Placeholder for UserButton */}
        </header>
        <main className="p-8 flex flex-col gap-8">
          <h1 className="text-4xl font-bold text-center">
            Google Calendar Clone
          </h1>
          <div className="flex justify-center">
            <div className="animate-pulse">Loading...</div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        Google Calendar Clone
        <UserButton />
      </header>
      <main className="p-8 flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-center">
          Google Calendar Clone
        </h1>
        <Authenticated>
          <AuthenticatedContent />
        </Authenticated>
        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
      </main>
    </>
  );
}

function AuthenticatedContent() {
  const router = useRouter();

  useEffect(() => {
    router.push("/calendar");
  }, [router]);

  return (
    <div className="flex flex-col gap-4 max-w-lg mx-auto text-center">
      <p>Redirecting to calendar...</p>
      <Link 
        href="/calendar" 
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
      >
        Go to Calendar
      </Link>
    </div>
  );
}

function SignInForm() {
  return (
    <div className="flex flex-col gap-8 w-96 mx-auto">
      <p className="text-center text-gray-600 dark:text-gray-400">
        Log in to access your calendar
      </p>
      <div className="flex flex-col gap-4">
        <SignInButton 
          fallbackRedirectUrl="/calendar"
          mode="modal"
        >
          <span className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors cursor-pointer inline-block text-center">
            Sign in
          </span>
        </SignInButton>
        <SignUpButton 
          fallbackRedirectUrl="/calendar"
          mode="modal"
        >
          <span className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-md transition-colors cursor-pointer inline-block text-center">
            Sign up
          </span>
        </SignUpButton>
      </div>
    </div>
  );
}


