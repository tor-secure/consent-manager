export type InstallStack = "html" | "react" | "nextjs" | "php" | "dotnet";

export const INSTALL_STACK_TABS: Array<{ id: InstallStack; label: string }> = [
  { id: "html", label: "HTML" },
  { id: "react", label: "React" },
  { id: "nextjs", label: "Next.js" },
  { id: "php", label: "PHP" },
  { id: "dotnet", label: ".NET" },
];

export function installStackMeta(stack: InstallStack): {
  language: string;
  label: string;
  stepTwo: string;
} {
  if (stack === "nextjs") {
    return {
      language: "tsx",
      label: "app/layout.tsx",
      stepTwo:
        "Paste into app/layout.tsx so Consent Guru is the first thing in <head>. Do not move it into a client useEffect.",
    };
  }
  if (stack === "react") {
    return {
      language: "html",
      label: "public/index.html",
      stepTwo:
        "Replace public/index.html (CRA / Vite) so the Consent Guru block is first in <head>, before your app bundle.",
    };
  }
  if (stack === "php") {
    return {
      language: "html",
      label: "partials/cmp-install.php",
      stepTwo:
        "Include partials/cmp-install.php first inside <head> on every page (before GTM, gtag, and ads tags).",
    };
  }
  if (stack === "dotnet") {
    return {
      language: "html",
      label: "Views/Shared/_CmpInstall.cshtml",
      stepTwo:
        "Render @await Html.PartialAsync(\"_CmpInstall\") first inside <head> in your layout (before analytics tags).",
    };
  }
  return {
    language: "html",
    label: "snippet",
    stepTwo:
      "Paste the snippet as the first script in <head> on every page — before GTM, gtag, Meta Pixel, and ads tags.",
  };
}
