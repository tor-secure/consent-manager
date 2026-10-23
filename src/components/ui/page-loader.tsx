export function PageLoader({ label = "Consent Guru is loading" }: { label?: string }) {
  return (
    <div className="cg-page-loader" role="status" aria-live="polite" aria-label={label}>
      <div className="cg-page-loader-content" aria-hidden="true">
        <div className="cg-page-loader-brand">
          <svg className="cg-page-loader-shield" viewBox="0 0 58 65">
            <path className="cg-shield-outline" d="M29 4 51 14v20c0 13-10 22-22 27C17 56 7 47 7 34V14Z" />
            <path className="cg-shield-check" d="m19 32 8 8 14-17" />
          </svg>
          <div className="cg-page-loader-word">
            <span>consent</span>
            <span>guru</span>
          </div>
        </div>
        <div className="cg-page-loader-track" />
        <p className="cg-page-loader-status">
          <span className="cg-page-loader-dot" />
          Getting things ready
        </p>
      </div>
    </div>
  );
}
