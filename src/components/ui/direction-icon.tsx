export function DirectionIcon({ direction = "right" }: { direction?: "right" | "left" | "down" | "diagonal" }) {
  const path = direction === "left" ? "M19 12H5m5-5-5 5 5 5" : direction === "down" ? "M12 5v14m-5-5 5 5 5-5" : direction === "diagonal" ? "M6 18 18 6M7 6h11v11" : "M5 12h14m-5-5 5 5-5 5";
  return <svg className="direction-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>;
}
