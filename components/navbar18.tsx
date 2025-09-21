"use client";

import { Menu } from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const NAV_LOGO = {
  url: "https://www.shadcnblocks.com",
  src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/shadcnblockscom-icon.svg",
  alt: "logo",
  title: "Shadcnblocks.com",
};

const NAV_ITEMS = [
  {
    name: "Products",
    link: "/",
    hasSubmenu: true,
    submenu: [
      {
        title: "Introduction",
        href: "/docs",
        description:
          "Re-usable components built using Radix UI and Tailwind CSS.",
      },
      {
        title: "Installation",
        href: "/docs/installation",
        description: "How to install dependencies and structure your app.",
      },
      {
        title: "Typography",
        href: "/docs/primitives/typography",
        description: "Styles for headings, paragraphs, lists...etc",
      },
    ],
  },
  {
    name: "Resources",
    link: "/",
    hasSubmenu: true,
    submenu: [
      {
        title: "Alert Dialog",
        href: "/docs/primitives/alert-dialog",
        description:
          "A modal dialog that interrupts the user with important content and expects a response.",
      },
      {
        title: "Hover Card",
        href: "/docs/primitives/hover-card",
        description:
          "For sighted users to preview content available behind a link.",
      },
      {
        title: "Progress",
        href: "/docs/primitives/progress",
        description:
          "Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.",
      },
      {
        title: "Scroll-area",
        href: "/docs/primitives/scroll-area",
        description: "Visually or semantically separates content.",
      },
      {
        title: "Tabs",
        href: "/docs/primitives/tabs",
        description:
          "A set of layered sections of content—known as tab panels—that are displayed one at a time.",
      },
      {
        title: "Tooltip",
        href: "/docs/primitives/tooltip",
        description:
          "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.",
      },
    ],
  },
  { name: "Integration", link: "/" },
];

const Navbar18 = () => {
  return (
    <section className="bg-muted relative mx-auto flex max-w-full items-center justify-between border border-t-0 px-6 py-3 md:w-fit md:rounded-b-2xl lg:gap-4">
      <a href={NAV_LOGO.url} className="flex items-center gap-1">
        <img src={NAV_LOGO.src} className="max-h-5" alt={NAV_LOGO.alt} />
      </a>

      <MobileNav />

      <NavigationMenu className="hidden md:flex">
        <NavigationMenuList className="h-full w-full">
          {NAV_ITEMS.map((item, index) =>
            item.hasSubmenu ? (
              <NavigationMenuItem key={index} className="rounded-2xl">
                <NavigationMenuTrigger className="bg-transparent px-2 py-1 text-xs">
                  {item.name}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="rounded-2xl">
                  <ul
                    className={cn(
                      "grid gap-2 p-2",
                      item.name === "Resources"
                        ? "w-[300px] md:w-[350px] md:grid-cols-2 lg:w-[400px]"
                        : "md:w-[150px] lg:w-[200px]",
                    )}
                  >
                    {item.submenu.map((sub, i) => (
                      <ListItem
                        key={sub.title || i}
                        title={sub.title}
                        href={sub.href}
                      >
                        {sub.description}
                      </ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ) : (
              <NavigationMenuItem key={index}>
                <NavigationMenuLink
                  href={item.link}
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "bg-transparent px-3 py-1.5 text-xs",
                  )}
                >
                  {item.name}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ),
          )}
        </NavigationMenuList>
      </NavigationMenu>

      <div className="hidden md:block">
        <Button
          variant="outline"
          className="h-auto rounded-lg px-3 py-1.5 text-xs"
        >
          Log in
        </Button>
      </div>
    </section>
  );
};

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block select-none space-y-1 rounded-md p-2 text-xs leading-none no-underline outline-none transition-colors",
            className,
          )}
          {...props}
        >
          <div className="text-xs font-medium leading-none">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

const MobileNav = () => {
  return (
    <div className="mr-2 flex items-center justify-center md:hidden">
      <Popover>
        <PopoverTrigger>
          <Menu className="text-foreground size-5" />
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-screen max-w-xs overflow-hidden"
        >
          <div className="bg-background/80 text-foreground w-full pt-2 backdrop-blur-md">
            <Accordion type="single" collapsible className="w-full">
              {NAV_ITEMS.map((navItem, idx) =>
                navItem.hasSubmenu ? (
                  <AccordionItem
                    key={idx}
                    value={navItem.name}
                    className="border-b-0"
                  >
                    <AccordionTrigger className="hover:bg-accent px-4 py-3 text-xs hover:no-underline">
                      <span className="text-foreground">{navItem.name}</span>
                    </AccordionTrigger>
                    <AccordionContent className="rounded-2xl">
                      <div className="border-muted ml-4 border-l-2 pl-2">
                        <ul className="py-1">
                          {navItem.submenu &&
                            navItem.submenu.map((sub, subIdx) => (
                              <li
                                key={sub.title || subIdx}
                                className="hover:bg-accent px-2 py-2 text-xs"
                              >
                                <a href={sub.href} className="block">
                                  {sub.title}
                                </a>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ) : (
                  <div
                    key={idx}
                    className="hover:bg-accent rounded-lg px-4 py-3 text-xs"
                  >
                    <a
                      href={navItem.link}
                      className="flex items-center justify-between"
                    >
                      <span className="text-foreground">{navItem.name}</span>
                    </a>
                  </div>
                ),
              )}
            </Accordion>
            <div className="flex flex-col gap-2 py-2">
              <Button variant="secondary" className="px-3 text-xs">
                Log in
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
export { Navbar18 };
