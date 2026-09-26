import { headers } from "next/headers";

export async function JsonLd({ id, data }: { id: string; data: unknown }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      id={id}
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
