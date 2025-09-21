import { FaFacebook, FaLinkedin, FaXTwitter } from "react-icons/fa6";

const navigation = [
  {
    title: "Calendar",
    links: [
      { name: "Features", href: "#" },
      { name: "AI Scheduling", href: "#" },
      { name: "Team Sharing", href: "#" },
      { name: "Mobile Apps", href: "#" },
      { name: "Integrations", href: "#" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "Help Center", href: "#" },
      { name: "Getting Started", href: "#" },
      { name: "Community", href: "#" },
      { name: "Contact Us", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About Us", href: "#" },
      { name: "Privacy", href: "#" },
      { name: "Terms", href: "#" },
    ],
  },
];

const socialLinks = [
  { name: "Twitter", icon: FaXTwitter, href: "https://twitter.com" },
  { name: "Facebook", icon: FaFacebook, href: "https://facebook.com" },
  { name: "LinkedIn", icon: FaLinkedin, href: "https://linkedin.com" },
];

export const Footer14 = () => {
  return (
    <section className="bg-background dark py-12 sm:py-16 md:py-24">
      <div className="container mx-auto max-w-6xl px-5 md:px-6">
        {/* Logo and newsletter section */}
        <div className="mb-10 flex flex-col items-start justify-between gap-10 border-b border-border pb-10 sm:mb-16 sm:pb-12 md:flex-row">
          <div className="w-full max-w-full sm:max-w-sm">
            <a href="/" className="inline-block">
              <div className="mb-6 text-2xl font-semibold text-foreground">
                A Smart Calendar
              </div>
            </a>
            <p className="mb-8 text-base text-muted-foreground">
              Helping people find their natural rhythm with thoughtful calendar tools 
              that respect your time and reduce stress.
            </p>

            {/* Newsletter subscription */}
            <div className="flex w-full max-w-full flex-col gap-3 sm:max-w-md sm:flex-row">
              <input
                type="email"
                placeholder="Get updates"
                className="flex h-12 flex-1 rounded-md border border-border bg-background px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:text-sm text-foreground"
              />
              <button className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 py-2 text-base font-medium whitespace-nowrap text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:h-10 sm:px-4 sm:text-sm">
                Stay in touch
              </button>
            </div>
          </div>

          {/* Navigation Section */}
          <div className="w-full border-t pt-8 sm:border-t-0 sm:pt-0">
            <nav className="grid w-full grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2 md:w-auto md:grid-cols-3">
              {navigation.map((section) => (
                <div key={section.title} className="min-w-[140px]">
                  <h2 className="mb-4 text-lg font-semibold">
                    {section.title}
                  </h2>
                  <ul className="space-y-3.5">
                    {section.links.map((link) => (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          className="inline-block py-1 text-muted-foreground transition-colors duration-200 hover:text-foreground active:text-primary"
                        >
                          {link.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="order-1 mb-6 flex w-full items-center justify-center gap-6 sm:justify-start md:order-2 md:mb-0 md:w-auto">
            {socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-label={`Visit our ${link.name} page`}
                className="rounded-full p-3 text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground active:bg-accent/70"
                rel="noopener noreferrer"
                target="_blank"
              >
                <link.icon className="h-6 w-6 sm:h-5 sm:w-5" />
              </a>
            ))}
          </div>

          {/* Copyright - Below on mobile, left on desktop */}
          <p className="order-2 text-center text-sm text-muted-foreground sm:text-left md:order-1">
            © {new Date().getFullYear()} Plan B. All rights reserved.{" "}
            <a
              href="/"
              className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
            >
              Smart Calendar
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};
