import Image from "next/image";

export function Lavender({ className = "" }: { className?: string }) {
  return <Image src="/images/lavender.png" alt="" aria-hidden="true" width={280} height={560} priority className={className} />;
}
