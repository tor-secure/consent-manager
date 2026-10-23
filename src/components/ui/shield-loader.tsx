export function ShieldLoader() {
  return (
    <svg className="shield-loader" viewBox="0 0 40 46" aria-hidden="true">
      <path className="shield-outline" d="M20 3 35 9.5V23c0 9-6.3 15-15 19C11.3 38 5 32 5 23V9.5Z" />
      <path className="shield-trail" pathLength={100} d="M20 3 35 9.5V23c0 9-6.3 15-15 19C11.3 38 5 32 5 23V9.5Z" />
    </svg>
  );
}
