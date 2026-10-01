import type { Metadata } from "next";

import { DpoAsServiceView } from "@/components/public/dpo-as-service-view";
import { DPO_PAGE_DESCRIPTION, DPO_PAGE_TITLE, DPO_PATH } from "@/content/dpo-as-service";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: DPO_PAGE_TITLE,
    description: DPO_PAGE_DESCRIPTION,
    path: DPO_PATH,
  }),
  title: { absolute: DPO_PAGE_TITLE },
};

export default function DpoAsServicePage() {
  return <DpoAsServiceView />;
}
