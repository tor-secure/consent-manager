import { renderToStaticMarkup } from "react-dom/server";
import { DpdpGuideContent } from "../../src/components/public/dpdp-guide-content";

/** The actual guide's server rendering, without application auth or database imports. */
export const markup = renderToStaticMarkup(<DpdpGuideContent />);
