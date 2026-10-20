// Renders the exact privacy promise, one sentence per line.
export function PrivacyPromise({ className = "" }: { className?: string }) {
  return (
    <p className={`font-display leading-tight ${className}`}>
      <span className="block">Your college sees that counselling happened.</span>{" "}
      <span className="block">Never who.</span>{" "}
      <span className="block">Never what was said.</span>
    </p>
  );
}
