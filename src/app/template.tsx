// The page transition is rendered from the root layout instead: Next 16.3 emits
// a template's client chunk as a <script> without the CSP nonce, which the
// strict policy blocks. Keep this template free of client components.
export default function Template({ children }: { children: React.ReactNode }) {
  return children;
}
