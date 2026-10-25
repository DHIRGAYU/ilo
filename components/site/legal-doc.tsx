import Link from "next/link";
import { container, h1 } from "./styles";

export type Block = { p: string } | { h: string } | { ul: string[] } | { note: string };
export type Section = { id: string; title: string; blocks: Block[] };

// Text in [square brackets] is a placeholder for you or your lawyer. It is highlighted so it cannot be missed before launch.
function Text({ children }: { children: string }) {
  return (
    <>
      {children.split(/(\[[^\]]+\])/g).map((part, i) =>
        part.startsWith("[") && part.endsWith("]") ? (
          <mark key={i} className="rounded bg-amber-100 px-1 text-ilo-deep">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function LegalDoc({ title, updated, intro, draft, sections, other }: {
  title: string; updated: string; intro: string; draft: boolean; sections: Section[]; other: { href: string; label: string };
}) {
  const toc = (
    <ol className="mt-3 space-y-1.5 text-sm">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="text-ilo-ink hover:text-ilo-plum hover:underline focus-visible:outline-2 focus-visible:outline-ilo-plum">{i + 1}. {s.title}</a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <section className="bg-ilo-blush/50">
        <div className={`${container} py-14 sm:py-20`}>
          <h1 className={h1}>{title}</h1>
          <p className="mt-4 text-sm text-ilo-ink/70">Last updated: <Text>{updated}</Text></p>
          <p className="mt-6 max-w-prose text-lg leading-relaxed text-ilo-ink"><Text>{intro}</Text></p>
        </div>
      </section>

      <div className={`${container} py-12 sm:py-16`}>
        {draft && (
          <div role="note" className="mb-10 max-w-3xl rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-ilo-ink">
            <strong className="text-ilo-deep">Draft for legal review.</strong> This text has not been reviewed by a lawyer and is not yet in force. Highlighted [brackets] are placeholders to fill in or confirm. Set <code>DRAFT</code> to <code>false</code> in this page&apos;s file before launch.
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <details className="rounded-xl border border-ilo-plum/10 bg-white p-4 lg:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-ilo-plum">On this page</summary>
            {toc}
          </details>
          <nav aria-label="On this page" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
            <p className="text-xs font-bold uppercase tracking-wider text-ilo-ink/60">On this page</p>
            {toc}
          </nav>

          <article className="min-w-0 max-w-3xl space-y-10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24">
                <h2 id={`${s.id}-h`} className="font-display text-2xl leading-tight text-ilo-deep sm:text-3xl">{i + 1}. {s.title}</h2>
                {s.blocks.map((b, j) =>
                  "p" in b ? (
                    <p key={j} className="mt-3 text-base leading-relaxed text-ilo-ink"><Text>{b.p}</Text></p>
                  ) : "h" in b ? (
                    <h3 key={j} className="mt-6 font-display text-lg text-ilo-deep">{b.h}</h3>
                  ) : "ul" in b ? (
                    <ul key={j} className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-ilo-ink marker:text-ilo-plum">
                      {b.ul.map((li, k) => <li key={k}><Text>{li}</Text></li>)}
                    </ul>
                  ) : (
                    <p key={j} className="mt-4 rounded-xl bg-ilo-blush/60 p-4 text-sm leading-relaxed text-ilo-ink"><Text>{b.note}</Text></p>
                  ),
                )}
              </section>
            ))}
            <p className="border-t border-ilo-plum/10 pt-6 text-sm text-ilo-ink">
              Related: <Link href={other.href} className="font-semibold text-ilo-plum underline-offset-2 hover:underline">{other.label}</Link>
            </p>
          </article>
        </div>
      </div>
    </>
  );
}
