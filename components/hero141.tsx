import { ChevronRight, Star } from "lucide-react";

import { Button } from "@/components/ui/button";

const Hero141 = () => {
  return (
    <section className="dark relative h-svh max-h-[1400px] min-h-[600px] w-full overflow-hidden bg-background px-5 font-sans">
      <div className="relative z-10 flex size-full">
        <div className="m-auto flex max-w-[25rem] flex-col items-center gap-9 sm:max-w-[31.25rem] md:max-w-[50rem]">
          <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-center text-4xl leading-tight font-semibold text-transparent sm:text-5xl md:text-[4rem]">
            Liberate yourself from phone interruptions
          </h1>
          <Button
            asChild
            className="flex h-fit w-fit items-center justify-center gap-2 rounded-full px-7 py-3.5 font-medium shadow-[0_0_5px_5px_rgba(255,255,255,.3)] transition-all duration-500 hover:bg-secondary hover:shadow-[0_0_10px_5px_rgba(255,255,255,.5)]"
          >
            <a href="#">
              <p>Buy Here</p>
              <ChevronRight className="size-5" />
            </a>
          </Button>
          <div>
            <div className="flex items-center justify-center gap-0.5">
              <Star className="fill-yellow-400 size-3" />
              <Star className="fill-yellow-400 size-3" />
              <Star className="fill-yellow-400 size-3" />
              <Star className="fill-yellow-400 size-3" />
              <Star className="fill-yellow-400 size-3" />
            </div>
            <p className="mt-1.5 max-w-40 text-center text-xs leading-snug font-medium text-muted-foreground">
              Trusted by 2,000+ high performing individuals
            </p>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 size-full before:absolute before:inset-0 before:bg-background/85 before:content-['']">
        <video
          src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/video-1.mp4"
          muted
          autoPlay
          loop
          controls={false}
          className="size-full object-cover object-center"
        />
      </div>
    </section>
  );
};

export { Hero141 };
