import { Cpu, LayoutList, LocateFixed, Rocket, Users } from "lucide-react";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

const DATA = [
  {
    title: "Start simply",
    description:
      "Add your events and appointments. The calendar learns your preferences quietly, without getting in the way.",
    icon: LayoutList,
    image: {
      src: "https://res.cloudinary.com/djhffnsdl/image/upload/v1758418593/8181179_t32q1u.jpg",
      alt: "Start simply",
    },
  },
  {
    title: "Find patterns",
    description:
      "Over time, you'll notice gentle insights about your schedule. Small suggestions that help create better balance.",
    icon: LocateFixed,
    image: {
      src: "https://res.cloudinary.com/djhffnsdl/image/upload/v1758418610/7777433_vjo7zv.jpg",
      alt: "Find patterns",
    },
    reverse: true,
  },
  {
    title: "Share when needed",
    description:
      "Coordinate with others naturally. Share what you want, when you want. No pressure, just helpful tools.",
    icon: Users,
    image: {
      src: "https://res.cloudinary.com/djhffnsdl/image/upload/v1758418869/3562034_malfxz.jpg",
      alt: "Share when needed",
    },
  },
  {
    title: "Grow together",
    description:
      "The more you use it, the better it gets at understanding your rhythm. It's a calendar that adapts to you.",
    icon: Cpu,
    image: {
      src: "https://res.cloudinary.com/djhffnsdl/image/upload/v1758418903/5361486_vzv3vf.jpg",
      alt: "Grow together",
    },
    reverse: true,
  },
];

const Timeline4 = () => {
  return (
    <section className="bg-background dark py-32">
      <div className="border-y border-border">
        <div className="container flex flex-col gap-6 border-x border-border py-4 max-lg:border-x lg:py-8">
          <Badge
            variant="outline"
            className="w-fit gap-1 bg-card px-3 text-sm font-normal tracking-normal shadow-sm"
          >
            <Rocket className="size-4" />
            <span>Your journey</span>
          </Badge>
          <h2 className="text-3xl leading-relaxed tracking-normal md:text-4xl lg:text-5xl text-foreground">
            How it works with your life
          </h2>
          <p className="max-w-[600px] tracking-normal text-muted-foreground">
            We believe good tools should work quietly in the background. 
            Here's how our calendar grows with you, step by step.
          </p>
        </div>
      </div>

      <div className="container overflow-hidden border-x border-border pb-40 lg:pt-20 [&>*:last-child]:pb-20 [&>div>div:first-child]:pt-20!">
        {DATA.map((item, index) => (
          <div key={index} className="relative flex">
            <div
              className={`flex w-full justify-center px-1 py-10 text-end md:gap-6 lg:gap-10 ${item?.reverse ? "lg:flex-row-reverse lg:text-start" : ""} `}
            >
              <div className="flex-1 max-lg:hidden">
                <h3 className="text-2xl tracking-[-0.96px] text-foreground">{item.title}</h3>
                <p
                  className={`mt-2.5 max-w-[300px] tracking-[-0.32px] text-balance text-muted-foreground ${item?.reverse ? "" : "ml-auto"}`}
                >
                  {item.description}
                </p>
              </div>
              <div className="z-[-1] size-fit -translate-y-5 bg-background p-4 max-lg:-translate-x-4">
                <div className="rounded-[10px] border border-border bg-card p-[5px] shadow-md">
                  <div className="size-fit rounded-md border border-border bg-muted p-1">
                    <item.icon className="size-4 shrink-0 text-foreground" />
                  </div>
                </div>
              </div>
              <div className="flex-1 max-lg:-translate-x-4">
                <div className="text-start lg:pointer-events-none lg:hidden">
                  <h3 className="text-2xl tracking-[-0.96px] text-foreground">{item.title}</h3>
                  <p className="mt-2.5 mb-10 max-w-[300px] tracking-[-0.32px] text-balance text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <div className="flex items-start justify-start">
                  <div className={` ${item?.reverse ? "lg:ml-auto" : ""}`}>
                    <div className="px-6 lg:px-10">
                      <DiagonalPattern className="h-6 lg:h-10" />
                    </div>
                    <div className="relative grid grid-cols-[auto_1fr_auto] items-stretch">
                      <DiagonalPattern className="h-full w-6 lg:w-10" />
                      <img
                        src={item.image.src}
                        width={400}
                        height={500}
                        alt={item.image.alt}
                        className="object-cover rounded-lg"
                      />
                      <DiagonalPattern className="w-6 lg:w-10" />
                    </div>
                    <div className="px-6 lg:px-10">
                      <DiagonalPattern className="h-6 lg:h-10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className={`absolute z-[-2] h-full w-[3px] translate-x-5 rounded-full lg:left-1/2 lg:-translate-x-1/2 ${index === DATA.length - 1 ? "bg-linear-to-b from-foreground/10 via-foreground/10 to-transparent" : "bg-foreground/10"}`}
            >
              {index == 0 && (
                <div className="h-4 w-[3px] -translate-y-full bg-linear-to-b from-transparent to-foreground/10"></div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="h-8 w-full border-y border-border md:h-12 lg:h-[112px]">
        <div className="container h-full w-full border-x border-border"></div>
      </div>
    </section>
  );
};

export { Timeline4 };

const DiagonalPattern = ({
  className,
  patternColor = "hsl(var(--foreground))",
  patternOpacity = 0.15,
}: {
  className?: string;
  patternColor?: string;
  patternOpacity?: number;
}) => {
  const svgPattern = `url("data:image/svg+xml,%3Csvg width='7' height='7' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23${patternColor}' fill-opacity='${patternOpacity}' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div
      className={cn("h-full w-full border-2 border-dashed border-border", className)}
      style={{
        backgroundImage: svgPattern,
      }}
    />
  );
};
