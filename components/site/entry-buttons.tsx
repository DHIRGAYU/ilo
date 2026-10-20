import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { COUNSELLOR_PATH, STUDENT_PATH } from "./links";
import { btn } from "./styles";

export function EntryButtons({
  className = "",
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      <Link href={STUDENT_PATH} className={btn(onDark ? "light" : "primary")}>
        I&apos;m a student
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <Link href={COUNSELLOR_PATH} className={btn(onDark ? "lightOutline" : "secondary")}>
        I&apos;m a counsellor
      </Link>
    </div>
  );
}
