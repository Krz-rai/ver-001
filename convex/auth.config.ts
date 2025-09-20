export default {
  providers: [
    {
      // Clerk JWT configuration for Convex
      // Make sure to create a JWT template named "convex" in your Clerk dashboard
      // See: https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN || "https://guided-swine-1.clerk.accounts.dev",
      applicationID: "convex",
    },
  ]
};