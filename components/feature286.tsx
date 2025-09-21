import { ShoppingCartIcon } from "lucide-react";
import React from "react";

import { GlowingStarsBackgroundCard } from "@/components/aceternity/glowing-stars";
import { Button } from "@/components/ui/button";

const cardData = [
  {
    title: "June Collection",
    price: "$129",
    link: "#",
    className: "md:col-span-1",
  },
  {
    title: "Summer Essentials",
    price: "$89",
    link: "#",
    className: "md:col-span-1",
  },
  {
    title: "Premium Bundle",
    price: "$199",
    link: "#",
    className: "md:col-span-1",
  },
];

const Feature286 = () => {
  return (
    <section className="bg-background text-foreground dark overflow-hidden py-32">
      <div className="container flex w-full flex-col items-center justify-center px-4">
        <p className="bg-muted mb-4 rounded-full px-2 py-1 text-xs uppercase">
          INTEGRATIONS
        </p>
        <h2 className="relative py-2 text-center font-sans text-5xl font-semibold tracking-tighter lg:text-6xl">
          Integrate with your fav apps
        </h2>
        <p className="text-md text-muted-foreground mx-auto mt-5 max-w-xl px-5 text-center lg:text-lg">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut
        </p>

        <div className="mt-10 grid w-full max-w-5xl grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {cardData.map((card, index) => (
            <div
              key={index}
              className="bg-muted/60 flex flex-col rounded-3xl p-4"
            >
              <GlowingStarsBackgroundCard className="h-55 border-none !bg-none" />

              <div className="mt-3 flex items-center justify-start gap-3">
                <h3 className="text-2xl font-semibold tracking-tighter">
                  {card.title}
                </h3>
                <span className="text-muted-2-foreground bg-muted-foreground/20 inline-block rounded-xl px-3 text-sm">
                  50+
                </span>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div className="bg-muted-foreground/20 flex h-full items-center justify-center gap-2 rounded-full px-7 text-sm">
                  Add to cart
                  <ShoppingCartIcon className="size-4" />
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-xs">
                    Starting At
                  </span>
                  <h3 className="-mt-1 text-2xl font-semibold tracking-tight">
                    {card.price}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button variant="secondary" className="mt-10 h-10 rounded-full !px-5">
          View All Collections
        </Button>
      </div>
    </section>
  );
};

export { Feature286 };
