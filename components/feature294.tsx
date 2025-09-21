import { AudioLines, Box, Globe, ShieldUser, Users } from "lucide-react";
import React from "react";

import { SparklesCore } from "@/components/aceternity/sparkles";

const features = [
  {
    icon: Globe,
    title: "Developer Friendly",
    description:
      "Built with modern technologies and clean APIs for seamless integration.",
  },
  {
    icon: Box,
    title: "Lightning Fast",
    description:
      "Optimized performance with minimal bundle size and instant loading.",
  },
  {
    icon: ShieldUser,
    title: "Secure by Default",
    description:
      "Enterprise-grade security with built-in protection and compliance.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Built for teams with real-time collaboration and version control.",
  },
  {
    icon: AudioLines,
    title: "Voice Integration",
    description:
      "Advanced audio processing with natural language understanding.",
  },
];

const Feature294 = () => {
  return (
    <section className="bg-background text-foreground dark relative w-screen overflow-hidden py-32">
      <div className="container relative flex h-full flex-col items-center justify-center">
        <div className="w-full max-w-lg text-center">
          <h1 className="relative z-20 text-center text-5xl font-semibold tracking-tighter md:text-6xl lg:text-7xl">
            Features
          </h1>
          <p className="text-muted-foreground/50 mt-4">
            Our features are designed to be easy to use and integrate.
          </p>
        </div>
        <div className="relative mb-10 mt-5 h-40 w-[40rem]">
          {/* Gradients */}
          <div className="absolute inset-x-20 top-0 h-[2px] w-3/4 bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-sm" />
          <div className="absolute inset-x-20 top-0 h-px w-3/4 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
          <div className="absolute inset-x-60 top-0 h-[5px] w-1/4 bg-gradient-to-r from-transparent via-sky-500 to-transparent blur-sm" />
          <div className="absolute inset-x-60 top-0 h-px w-1/4 bg-gradient-to-r from-transparent via-sky-500 to-transparent" />

          {/* Core component */}
          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1}
            particleDensity={500}
            className="h-full w-full"
            particleColor="#FFFFFF"
          />

          {/* Radial Gradient to prevent sharp edges */}
          <div className="bg-background absolute inset-0 h-full w-full [mask-image:radial-gradient(350px_130px_at_top,transparent_20%,white)]"></div>
        </div>

        <div className="gap-15 grid w-full max-w-5xl grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div key={index} className="flex gap-4">
                <IconComponent className="w-12 stroke-1 text-sky-500" />
                <div className="space-y-2">
                  <h4 className="text-xl font-medium">{feature.title}</h4>
                  <p className="text-muted-foreground/30">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export { Feature294 };
