import { ComingSoon } from "@/components/learning/admin/coming-soon";

export const metadata = {
  title: "Coupons",
};

export default function ElearningAdminCouponsPage() {
  return (
    <ComingSoon
      eyebrow="Discounts"
      title="Coupons"
      description="Percentage coupon codes (CGLC-) are on the way. You’ll be able to create offers and monitor usage here."
    />
  );
}
