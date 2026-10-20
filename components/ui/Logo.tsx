import Image from "next/image";

export function Logo({ className = "h-16 w-auto" }: { className?: string }) {
  return <Image src="/images/logo.png" alt="ilo" width={312} height={396} priority className={className} />;
}
