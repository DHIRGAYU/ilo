import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import "./site.css";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-root flex min-h-dvh flex-col bg-ilo-bg text-ilo-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-ilo-plum"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
