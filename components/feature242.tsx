"use client";

import { ChevronRight, Plus } from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const Feature242 = () => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  const features = [
    {
      title: "Natural scheduling",
      imgSrc:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/illustrations/tokyo-exchange-between-the-user-and-the-global-network.svg",
      href: "#",
    },
    {
      title: "Gentle reminders",
      imgSrc:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/illustrations/tokyo-letters-and-arrows-flying-out-of-a-black-hole.svg",
      href: "#",
    },
    {
      title: "Calm organization",
      imgSrc: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/illustrations/tokyo-loading-the-next-page.svg",
      href: "#",
    },
    {
      title: "Thoughtful sharing",
      imgSrc:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/illustrations/tokyo-many-browser-windows-with-different-information.svg",
      href: "#",
    },
  ];

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(features.length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api, features.length]);

  return (
    <section className="bg-background dark overflow-hidden py-32">
      <div className="container relative flex flex-col items-center md:px-0 lg:pt-8">
        <div className="relative z-10 w-full items-center justify-between lg:flex">
          <h1 className="max-w-2xl text-4xl font-medium tracking-normal md:text-6xl text-foreground">
            Built for people who value their time
          </h1>
          <p className="text-muted-foreground mt-8 max-w-lg tracking-normal md:text-xl lg:mt-0">
            We believe your calendar should work with your natural rhythm, not against it. 
            These features help you stay organized without the stress.{" "}
            <span className="text-foreground group inline-flex cursor-pointer items-center font-medium transition-all ease-in-out">
              Learn more{" "}
              <ChevronRight
                size={17}
                className="ml-1 mt-px transition-all ease-in-out group-hover:ml-2"
              />{" "}
            </span>
          </p>
        </div>
        <DottedDiv className="mt-8 flex w-full items-center justify-center px-2 py-10">
          <Carousel
            opts={{
              align: "center",
              loop: true,
            }}
            className="w-full"
            setApi={setApi}
          >
            <CarouselContent className="m-0 flex w-full">
              {features.map((item, index) => (
                <CarouselItem
                  key={index}
                  className="px-2 md:basis-1/2 lg:basis-1/3"
                >
                  <div className="bg-card border border-border group relative flex h-full max-h-96 w-full flex-col items-end justify-between text-ellipsis rounded-3xl p-5 shadow-sm">
                    <img
                      className="max-h-72 w-full opacity-100 transition-all ease-in-out group-hover:scale-90 group-hover:opacity-60 dark:invert"
                      src={item.imgSrc}
                      alt={item.title}
                    />
                    <div className="flex w-full items-center justify-between gap-4">
                      <h5 className="text-2xl font-medium leading-7 tracking-normal transition-all ease-in-out group-hover:translate-x-4 text-foreground">
                        {item.title}
                      </h5>
                      <a
                        href={item.href}
                        className="relative z-10 cursor-pointer"
                      >
                        <Button
                          variant="outline"
                          className="hover:bg-muted h-12 w-12 rounded-full bg-transparent transition-all ease-in-out border-border"
                        >
                          <Plus className="scale-150 text-foreground" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            <div className="mt-8 flex w-full items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium text-foreground">
                  {current.toString().padStart(2, "0")}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">
                  {count.toString().padStart(2, "0")}
                </span>
              </div>

              <div className="relative mr-10 flex gap-2">
                <CarouselPrevious className="h-10 w-10 border-border" />
                <CarouselNext variant="default" className="h-10 w-10" />
              </div>
            </div>
          </Carousel>
        </DottedDiv>
      </div>
    </section>
  );
};

export { Feature242 };

const DottedDiv = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("relative", className)}>
    <div className="bg-border absolute -left-[12.5px] top-4 h-[1.5px] w-[110%] md:-left-20" />
    <div className="bg-border absolute -left-[12.5px] bottom-4 h-[1.5px] w-[110%] md:-left-20" />
    <div className="bg-border absolute -top-4 left-0 h-[110%] w-[1.5px]" />
    <div className="bg-border absolute -top-4 right-0 h-[110%] w-[1.5px]" />
    <div className="bg-foreground absolute left-[-3px] top-[12.5px] z-10 h-2 w-2 rounded-full" />
    <div className="bg-foreground absolute right-[-3px] top-[12.5px] z-10 h-2 w-2 rounded-full" />
    <div className="bg-foreground absolute bottom-[12.5px] left-[-3px] z-10 h-2 w-2 rounded-full" />
    <div className="bg-foreground absolute bottom-[12.5px] right-[-3px] z-10 h-2 w-2 rounded-full" />
    {children}
  </div>
);
