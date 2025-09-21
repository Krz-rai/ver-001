"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import React from "react";

import { useIsMobile } from "@/hooks/use-mobile";

import { Button } from "@/components/ui/button";

const Hero233 = () => {
  const isMobile = useIsMobile();

  return (
    <section className="relative h-screen w-screen overflow-hidden bg-background py-32">
      <div className="relative z-20 container flex flex-col items-center justify-center gap-4 py-10 text-center md:mt-22">
        <div className="absolute -z-1 size-full max-w-3xl bg-background blur-xl" />
        <Button
          variant="secondary"
          className="group text-md my-16 flex w-fit items-center justify-center gap-3 rounded-full bg-muted/60 px-5 py-1 tracking-tight md:my-5"
        >
          <span className="size-2 rounded-full bg-foreground" />
          <span>Flexible Plan customized for you</span>
        </Button>
        <div className="relative flex max-w-4xl items-center justify-center text-center text-5xl font-medium tracking-tight md:text-7xl">
          <h1 className="relative z-10">
            <span className="mr-3 text-muted-foreground/50">
              The only app you Need to Stay
            </span>
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"> Productive </span>
            <span className="text-muted-foreground/50"> ever</span>
            <span>.</span>
          </h1>
        </div>

        <p className="mt-5 max-w-xl bg-background text-muted-foreground/80">
          Lorem ipsum dolor sit, amet consectetur adipisicing elit. Ipsum animi,
          ipsam provident optio delectus neque aliquid cumque. Beatae, odio!
        </p>
        <div className="my-5 flex gap-4">
          <Button
            variant="secondary"
            className="group text-md flex w-fit items-center justify-center gap-2 rounded-full px-4 py-1 tracking-tight"
          >
            <span>Documentation</span>
            <ArrowRight className="size-4 -rotate-45 transition-all ease-out group-hover:ml-3 group-hover:rotate-0" />
          </Button>
          <Button
            variant="default"
            className="group text-md flex w-fit items-center justify-center gap-2 rounded-full px-4 py-1 tracking-tight"
          >
            <span>Get Started</span>
            <ArrowRight className="size-4 -rotate-45 transition-all ease-out group-hover:ml-3 group-hover:rotate-0" />
          </Button>
        </div>
      </div>

      <div className="absolute top-0 flex size-full justify-center">
        {Array.from({ length: isMobile ? 7 : 18 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "100%" }}
            transition={{
              duration: 0.8,
              delay: i * 0.05,
              ease: "easeOut",
            }}
            className="w-24 border-l bg-gradient-to-b to-transparent transition-all ease-in-out hover:scale-110 hover:from-black/2"
          />
        ))}
      </div>
    </section>
  );
};

export { Hero233 };
