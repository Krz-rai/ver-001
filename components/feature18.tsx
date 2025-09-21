import {
  Blocks,
  ChevronRight,
  Infinity as InfinityIcon,
  Laptop,
  ListEnd,
  Zap,
  ZoomIn,
} from "lucide-react";

const features = [
  {
    title: "Mindful design",
    description:
      "Every detail is crafted to feel calm and intuitive. We believe good design should reduce stress, not add to it.",
    icon: <ZoomIn className="size-6" />,
    link: "#",
  },
  {
    title: "Your way",
    description:
      "Adapt the calendar to fit your life, not the other way around. Choose what you need, leave what you don't.",
    icon: <Blocks className="size-6" />,
    link: "#",
  },
  {
    title: "Everywhere you are",
    description:
      "Whether you're on your phone, tablet, or computer, your calendar feels familiar and works beautifully.",
    icon: <Laptop className="size-6" />,
    link: "#",
  },
  {
    title: "Simply works",
    description:
      "No steep learning curves or confusing settings. Just a calendar that understands how you think about time.",
    icon: <ListEnd className="size-6" />,
    link: "#",
  },
  {
    title: "Quietly efficient",
    description:
      "Fast enough to keep up with your thoughts, smart enough to stay out of your way when you're focused.",
    icon: <Zap className="size-6" />,
    link: "#",
  },
  {
    title: "Grows with you",
    description:
      "As your life changes, your calendar adapts. New patterns, new rhythms—it learns alongside you.",
    icon: <InfinityIcon className="size-6" />,
    link: "#",
  },
];

const Feature18 = () => {
  return (
    <section className="bg-background dark before:bg-primary/10 relative py-32 before:absolute before:inset-0 before:[mask-image:url('https://deifkwefumgah.cloudfront.net/shadcnblocks/block/patterns/waves.svg')] before:[mask-repeat:repeat] before:[mask-size:64px_32px]">
      <div className="to-background absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-transparent"></div>
      <div className="container relative">
        <h2 className="mb-8 max-w-xl text-balance text-2xl font-medium lg:text-4xl text-foreground">
          Why people choose our calendar
        </h2>
        <div className="z-30 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card border-border flex flex-col gap-10 rounded-lg border p-8 shadow-sm"
            >
              <div>
                <div className="text-foreground">{feature.icon}</div>
                <h3 className="mb-2 mt-6 font-medium text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
              <a
                href={feature.link}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Learn more
                <ChevronRight className="w-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Feature18 };
