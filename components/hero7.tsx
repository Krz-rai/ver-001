"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import React from "react";

import { Particles } from "@/components/ui/particles";
import { Button } from "@/components/ui/button";

const Hero218 = () => {
  return (
    <section className="py-32">
      <div className="container flex flex-col items-center justify-center gap-4 overflow-hidden">
        <p className="text-muted-foreground">
          Bridging Developers, Building the Future
        </p>
        <h1 className="realtive z-15 max-w-3xl text-center text-6xl font-medium tracking-tighter md:text-7xl">
          <span
            className="overflow-hidden"
            style={{
              transformStyle: "preserve-3d",
              perspective: "600px",
            }}
          >
            {"The only app you Need to Stay Productive"
              .split(" ")
              .map((word, i) => (
                <motion.span
                  className="relative inline-block px-[6px] leading-[none]"
                  key={i}
                  initial={{
                    opacity: 0,
                    y: "70%",
                    rotateX: "-28deg",
                  }}
                  animate={{
                    opacity: 1,
                    y: "0%",
                    rotateX: "0deg",
                  }}
                  transition={{
                    delay: i * 0.08 + 0.1,
                    duration: 0.8,
                    ease: [0.215, 0.61, 0.355, 1],
                  }}
                >
                  {word === "Productive" ? (
                    <span className="font-playfair italic">{word}</span>
                  ) : (
                    word
                  )}
                </motion.span>
              ))}
          </span>
        </h1>
        <Particles
          className="absolute inset-0 z-0"
          quantity={500}
          ease={80}
          color="#000000"
          refresh
        />

        <div className="h-92 -translate-y-15 relative w-full overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="z-20 absolute w-full overflow-hidden"
          >
            <img
              src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/lummi/green-shape.svg"
              className="h-215 -translate-y-90 -rotate-76 w-full opacity-80"
              alt=""
            />
          </motion.div>
          <div className="h-92 bg-background/50 absolute z-10 w-full blur-xl" />
          <div className="z-15 h-92 -translate-y-62 bg-background/30 absolute w-full blur-2xl" />
        </div>
        <Button
          variant="secondary"
          className="text-md -mt-15 group flex w-fit items-center justify-center gap-2 rounded-full px-4 py-1 tracking-tight"
        >
          Contact Us now
          <ArrowRight className="size-4 -rotate-45 transition-all ease-out group-hover:ml-3 group-hover:rotate-0" />
        </Button>
      </div>
    </section>
  );
};

export { Hero218 };
