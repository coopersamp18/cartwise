import { Polar } from "@polar-sh/sdk";

/**
 * Creates a Polar SDK client instance configured for the current environment
 * @returns Polar SDK client
 */
export function createPolarClient(): Polar {
  const useSandbox = process.env.POLAR_USE_SANDBOX === "true";
  
  const accessToken = useSandbox
    ? process.env.POLAR_SANDBOX_API_KEY || process.env.POLAR_API_KEY
    : process.env.POLAR_API_KEY;

  if (!accessToken) {
    throw new Error(
      `Missing Polar API key for ${useSandbox ? "sandbox" : "production"} environment`
    );
  }

  return new Polar({
    accessToken,
    server: useSandbox ? "sandbox" : "production",
  });
}

/**
 * Gets the appropriate Polar product ID for the current environment
 * @returns Product ID string
 */
export function getPolarProductId(): string {
  const useSandbox = process.env.POLAR_USE_SANDBOX === "true";
  
  const productId = useSandbox
    ? process.env.NEXT_PUBLIC_POLAR_SANDBOX_PRODUCT_ID ||
      process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID
    : process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID;

  if (!productId) {
    throw new Error(
      `Missing Polar product ID for ${useSandbox ? "sandbox" : "production"} environment`
    );
  }

  return productId;
}

/**
 * Gets the appropriate webhook secret for the current environment
 * @returns Webhook secret string
 */
export function getPolarWebhookSecret(): string {
  const useSandbox = process.env.POLAR_USE_SANDBOX === "true";
  
  const webhookSecret = useSandbox
    ? process.env.POLAR_SANDBOX_WEBHOOK_SECRET ||
      process.env.POLAR_WEBHOOK_SECRET
    : process.env.POLAR_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      `Missing Polar webhook secret for ${useSandbox ? "sandbox" : "production"} environment`
    );
  }

  return webhookSecret;
}

/**
 * Returns whether the app is currently using Polar's sandbox environment
 * @returns true if using sandbox, false if using production
 */
export function isPolarSandbox(): boolean {
  return process.env.POLAR_USE_SANDBOX === "true";
}

/**
 * Gets the appropriate Polar organization slug for the current environment
 * @returns Organization slug string
 */
export function getPolarOrgSlug(): string {
  const useSandbox = process.env.POLAR_USE_SANDBOX === "true";
  
  const orgSlug = useSandbox
    ? process.env.POLAR_SANDBOX_ORG_SLUG || process.env.POLAR_ORG_SLUG
    : process.env.POLAR_ORG_SLUG;

  if (!orgSlug) {
    throw new Error(
      `Missing Polar organization slug for ${useSandbox ? "sandbox" : "production"} environment`
    );
  }

  return orgSlug;
}
