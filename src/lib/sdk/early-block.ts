export type EarlyTrackerRule = {
  pattern: string;
  label: string;
  purpose: "analytics" | "marketing";
};

export type InstallDiagnostic = {
  code: string;
  message: string;
  url: string;
};

export const EARLY_TRACKER_RULES: EarlyTrackerRule[] = [
  { pattern: "googletagmanager.com/gtm.js", label: "Google Tag Manager", purpose: "analytics" },
  { pattern: "googletagmanager.com/gtag/js", label: "Google tag (gtag.js)", purpose: "analytics" },
  { pattern: "/gtag/js", label: "Google tag (gtag.js)", purpose: "analytics" },
  { pattern: "/gtm.js", label: "Google Tag Manager", purpose: "analytics" },
  { pattern: "google-analytics.com", label: "Google Analytics", purpose: "analytics" },
  { pattern: "/analytics.js", label: "An analytics script", purpose: "analytics" },
  { pattern: "connect.facebook.net", label: "Meta Pixel", purpose: "marketing" },
  { pattern: "fbevents.js", label: "Meta Pixel", purpose: "marketing" },
  { pattern: "facebook.com/tr", label: "Meta Pixel", purpose: "marketing" },
  { pattern: "googleadservices.com", label: "Google Ads", purpose: "marketing" },
  { pattern: "doubleclick.net", label: "A known tracking pixel", purpose: "marketing" },
  { pattern: "youtube.com/embed", label: "An optional third-party iframe", purpose: "marketing" },
];

export function matchEarlyTracker(url: string | null | undefined): EarlyTrackerRule | null {
  const value = String(url ?? "").toLowerCase();
  if (!value) return null;
  let found: EarlyTrackerRule | null = null;
  for (const rule of EARLY_TRACKER_RULES) {
    if (!value.includes(rule.pattern)) continue;
    if (!found || rule.pattern.length > found.pattern.length) found = rule;
  }
  return found;
}

function attr(chunk: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']+)["']`, "i").exec(chunk);
  return match?.[1] ?? null;
}

function executableScriptType(type: string): boolean {
  const value = type.trim().toLowerCase();
  return (
    value === "" ||
    value === "text/javascript" ||
    value === "application/javascript" ||
    value === "module"
  );
}

function executableWarning(label: string, noun: "script" | "iframe" | "tracking pixel"): string {
  const target = noun === "tracking pixel" ? "pixel" : noun;
  return `CMP Installation Warning: "${label} was detected as an executable ${noun} before consent control." Convert this ${target} to a consent-controlled element.`;
}

export function diagnoseCmpInstall(html: string): InstallDiagnostic[] {
  const warnings: InstallDiagnostic[] = [];
  const seen = new Set<string>();
  const tags: { index: number; kind: "script" | "iframe" | "img"; src: string; type: string; purpose: string | null; cmp: boolean }[] = [];
  const tagRe = /<(script|iframe|img)\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) !== null) {
    const kind = match[1].toLowerCase() as "script" | "iframe" | "img";
    const chunk = match[2] ?? "";
    const src = attr(chunk, "src") ?? "";
    const type = attr(chunk, "type") ?? "";
    const purpose = attr(chunk, "data-cmp-purpose");
    const cmp = kind === "script" && (Boolean(attr(chunk, "data-site-key")) || /\/api\/sdk\/script/i.test(src));
    tags.push({ index: match.index, kind, src, type, purpose, cmp });
  }
  const cmpTag = tags.find((tag) => tag.cmp);
  const cmpIndex = cmpTag ? cmpTag.index : Number.POSITIVE_INFINITY;

  if (!cmpTag) {
    const hasTracker = tags.some((tag) => matchEarlyTracker(tag.src));
    if (hasTracker) {
      warnings.push({
        code: "cmp-missing",
        message: 'CMP Installation Warning: "The CMP snippet was not found before known tracking technologies."',
        url: "",
      });
    }
  }

  for (const tag of tags) {
    if (tag.cmp || !tag.src) continue;
    const rule = matchEarlyTracker(tag.src);
    if (!rule) continue;
    const key = `${rule.label}:${tag.src}`;
    if (seen.has(key)) continue;
    const beforeCmp = tag.index < cmpIndex;
    if (tag.kind === "script" && beforeCmp && executableScriptType(tag.type)) {
      seen.add(key);
      warnings.push({ code: "executable-script", message: executableWarning(rule.label, "script"), url: tag.src });
      continue;
    }
    if (tag.kind === "iframe" && beforeCmp) {
      seen.add(key);
      warnings.push({
        code: "iframe-before-cmp",
        message: executableWarning(rule.label, "iframe"),
        url: tag.src,
      });
      continue;
    }
    if (tag.kind === "img" && beforeCmp) {
      seen.add(key);
      warnings.push({
        code: "pixel-before-cmp",
        message: executableWarning(rule.label, "tracking pixel"),
        url: tag.src,
      });
      continue;
    }
    if (tag.kind === "script" && !tag.purpose) {
      seen.add(key);
      warnings.push({
        code: "missing-purpose",
        message: 'CMP Installation Warning: "An optional script is missing data-cmp-purpose."',
        url: tag.src,
      });
      continue;
    }
    if (tag.kind === "script" && executableScriptType(tag.type)) {
      seen.add(key);
      warnings.push({
        code: "parser-executable",
        message: executableWarning(rule.label, "script"),
        url: tag.src,
      });
    }
  }
  return warnings;
}

export function earlyBlockBootstrapSource(): string {
  const rules = JSON.stringify(EARLY_TRACKER_RULES.map((rule) => ({ p: rule.pattern, l: rule.label, purpose: rule.purpose })));
  return `<script>
(function(){
  var rules = ${rules};
  window.__CMP_INSTALL_WARNINGS = window.__CMP_INSTALL_WARNINGS || [];
  window.__CMP_CONSENT_DEFAULT_SET = true;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function(){ window.dataLayer.push(arguments); };
  }
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted",
    wait_for_update: 500
  });
  function hit(url) {
    var value = String(url || "").toLowerCase();
    var found = null;
    for (var i = 0; i < rules.length; i++) {
      if (value.indexOf(rules[i].p) !== -1 && (!found || rules[i].p.length > found.p.length)) found = rules[i];
    }
    return found;
  }
  function shouldHold(url) {
    try {
      if (typeof window.__CMP_HOLD_URL === "function") return !!window.__CMP_HOLD_URL(url);
    } catch (e) {}
    return !!hit(url);
  }
  function warn(label, url, noun) {
    var message = 'CMP Installation Warning: "' + label + ' was detected as an executable ' + noun + ' before consent control." Convert this ' + noun + ' to a consent-controlled element.';
    window.__CMP_INSTALL_WARNINGS.push({ message: message, url: String(url || "") });
    try { console.warn(message); } catch (e) {}
  }
  function scanUnsafe() {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute("src") || "";
      var rule = hit(src);
      var type = (scripts[i].getAttribute("type") || "").toLowerCase();
      if (rule && type !== "text/plain") warn(rule.l, src, "script");
    }
    var frames = document.getElementsByTagName("iframe");
    for (var f = 0; f < frames.length; f++) {
      var frameSrc = frames[f].getAttribute("src") || "";
      var frameRule = hit(frameSrc);
      if (frameRule && !frames[f].getAttribute("data-cmp-src")) warn(frameRule.l, frameSrc, "iframe");
    }
    var images = document.getElementsByTagName("img");
    for (var m = 0; m < images.length; m++) {
      var imgSrc = images[m].getAttribute("src") || "";
      var imgRule = hit(imgSrc);
      if (imgRule && !images[m].getAttribute("data-cmp-src")) warn(imgRule.l, imgSrc, "tracking pixel");
    }
  }
  try { scanUnsafe(); } catch (e) {}
  document.addEventListener("DOMContentLoaded", function() { try { scanUnsafe(); } catch (e) {} });
  function patchSrc(Ctor) {
    if (!Ctor || !Ctor.prototype || Ctor.prototype.__cmpSrcPatched) return;
    var desc = Object.getOwnPropertyDescriptor(Ctor.prototype, "src");
    if (!desc || !desc.set || !desc.get) return;
    Ctor.prototype.__cmpSrcPatched = true;
    Object.defineProperty(Ctor.prototype, "src", {
      configurable: true,
      enumerable: desc.enumerable,
      get: function() { return desc.get.call(this); },
      set: function(value) {
        if (shouldHold(value)) {
          var held = String(value || "");
          var rule = hit(held);
          this.setAttribute("data-cmp-src", held);
          this.setAttribute("type", "text/plain");
          if (rule && rule.purpose && !this.getAttribute("data-cmp-purpose")) {
            this.setAttribute("data-cmp-purpose", rule.purpose);
          }
          return;
        }
        return desc.set.call(this, value);
      }
    });
  }
  try { patchSrc(window.HTMLScriptElement); } catch (e) {}
  try { patchSrc(window.HTMLIFrameElement); } catch (e) {}
  try { patchSrc(window.HTMLImageElement); } catch (e) {}
})();
</script>
`;
}
