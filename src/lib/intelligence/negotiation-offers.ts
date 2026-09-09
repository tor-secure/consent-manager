import { z } from "zod";

export const negotiationOfferSchema = z.object({
  key: z.string().regex(/^[a-z0-9_-]{1,100}$/),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(300),
  purposeKeys: z.array(z.string().min(1).max(100)).max(20),
  actionLabel: z.string().min(1).max(80),
});

export type NegotiationOffer = z.infer<typeof negotiationOfferSchema>;

export function publicNegotiationOffers(input: {
  enabled: boolean;
  offers: unknown;
  requiredPurposeKeys: string[];
}): NegotiationOffer[] {
  if (!input.enabled) return [];
  const parsed = z.array(negotiationOfferSchema).max(5).safeParse(input.offers);
  if (!parsed.success) return [];
  const required = new Set(input.requiredPurposeKeys);
  return parsed.data.filter(
    (offer) => offer.purposeKeys.length > 0 && offer.purposeKeys.every((key) => !required.has(key)),
  );
}
