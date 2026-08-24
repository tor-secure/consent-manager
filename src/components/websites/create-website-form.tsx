"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateWebsiteForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [language, setLanguage] = useState("en");
  const [region, setRegion] = useState("IN");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/websites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          domain,
          language,
          region,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create website",
        );
      }

      router.push("/dashboard/websites");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border p-6"
    >
      <div>
        <label className="mb-2 block text-sm font-medium">
          Website Name
        </label>

        <input
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          placeholder="VRN Infotech Website"
          required
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Domain
        </label>

        <input
          value={domain}
          onChange={(event) =>
            setDomain(event.target.value)
          }
          placeholder="example.com"
          required
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Default Language
        </label>

        <select
          value={language}
          onChange={(event) =>
            setLanguage(event.target.value)
          }
          className="w-full rounded-md border px-3 py-2"
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="kn">Kannada</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Default Region
        </label>

        <select
          value={region}
          onChange={(event) =>
            setRegion(event.target.value)
          }
          className="w-full rounded-md border px-3 py-2"
        >
          <option value="IN">India</option>
          <option value="EU">European Union</option>
          <option value="US">United States</option>
          <option value="UK">United Kingdom</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Website"}
      </button>
    </form>
  );
}