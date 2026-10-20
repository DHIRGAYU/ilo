import { EntryButtons } from "./entry-buttons";
import { container, pill } from "./styles";

export function CtaBand() {
  return (
    <section className="py-14 sm:py-20">
      <div className={container}>
        <div className="rounded-3xl bg-linear-to-br from-ilo-plum to-ilo-deep px-6 py-12 text-white shadow-xl sm:px-12 sm:py-16">
          <span className={`${pill} bg-white/15 text-white`}>Safe campus initiative</span>
          <h2 className="mt-5 font-display text-4xl break-words sm:text-5xl">Better Within.</h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85">
            Compassionate, privacy-first mental health infrastructure for
            students, counsellors, and institutions across India.
          </p>
          <EntryButtons onDark className="mt-8" />
        </div>
      </div>
    </section>
  );
}
