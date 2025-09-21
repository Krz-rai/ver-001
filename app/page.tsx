"use client";

import {
  Authenticated,
  Unauthenticated,
} from "convex/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Import the landing page components
import { Hero157 } from "@/components/hero157";
import { Logos10 } from "@/components/logos10";
import { Timeline4 } from "@/components/timeline4";
import { Footer14 } from "@/components/footer14";
import { Feature242 } from "@/components/feature242";
import { Feature18 } from "@/components/feature18";
import { Navbar4 } from "@/components/navbar4";

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Welcome to Plan B
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Authenticated>
        <AuthenticatedContent />
      </Authenticated>
      <Unauthenticated>
        <LandingPageContent />
      </Unauthenticated>
    </>
  );
}

function AuthenticatedContent() {
  const router = useRouter();

  useEffect(() => {
    // Redirect authenticated users to calendar
    router.push("/calendar");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Welcome back!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Redirecting to your calendar...
        </p>
      </div>
    </div>
  );
}

function LandingPageContent() {
  return (
    <div>
      <Navbar4 />
      <Hero157 />
      <Feature18 />
      <Feature242 />
      <Logos10 />
      <Timeline4 />
      <Footer14 />
    </div>
  );
}


