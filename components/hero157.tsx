"use client";

import { MoveUpRight } from "lucide-react";
import { SignUpButton, useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

const Hero157 = () => {
  const { isSignedIn } = useUser();
  
  return (
    <section className="font-poppins dark relative h-svh max-h-[1400px] w-full overflow-hidden bg-[url('https://deifkwefumgah.cloudfront.net/shadcnblocks/block/full-width-backgrounds/andrew-kliatskyi-MaVm_A0xhKk-unsplash.jpg')] bg-cover bg-center bg-no-repeat py-12 after:absolute after:left-0 after:top-0 after:block after:h-full after:w-full after:bg-black/65 after:content-[''] md:py-20">
      <div className="container relative z-20 h-full w-full max-w-[85rem]">
        <div className="flex h-full w-full flex-col justify-end gap-12">
          <div className="flex max-w-[61.375rem] flex-col gap-1">
            <p className="text-muted-foreground text-sm leading-none">
              Calendar that works with you
            </p>
            <h1 className="leading-snug! text-foreground text-3xl md:text-4xl lg:text-6xl">
              A gentle approach to organizing your time
            </h1>
          </div>
          <div className="flex w-full flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <p className="border-muted-foreground text-muted-foreground max-w-[20.25rem] border-l pl-6 text-base">
              We believe scheduling should feel natural, not overwhelming. 
              Find balance in your daily rhythm.
            </p>
            <div className="shrink-0">
              {isSignedIn ? (
                <Button
                  asChild
                  variant="outline"
                  className="border-muted-foreground/40 text-foreground group flex h-fit w-fit items-center gap-3 rounded-full border bg-transparent px-6 py-4 text-sm hover:bg-transparent"
                >
                  <a href="/calendar">
                    <p className="group-hover:underline">Go to Calendar</p>
                    <MoveUpRight className="h-4! w-4! fill-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                  </a>
                </Button>
              ) : (
                <SignUpButton mode="modal">
                  <Button
                    variant="outline"
                    className="border-muted-foreground/40 text-foreground group flex h-fit w-fit items-center gap-3 rounded-full border bg-transparent px-6 py-4 text-sm hover:bg-transparent"
                  >
                    <p className="group-hover:underline">Get Started</p>
                    <MoveUpRight className="h-4! w-4! fill-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                  </Button>
                </SignUpButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Hero157 };
