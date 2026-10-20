import { container, h1, lead } from "./styles";

export function PageIntro({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-ilo-blush/50">
      <div className={`${container} py-14 sm:py-20`}>
        <h1 className={h1}>{title}</h1>
        <p className={`${lead} mt-6`}>{children}</p>
      </div>
    </section>
  );
}
