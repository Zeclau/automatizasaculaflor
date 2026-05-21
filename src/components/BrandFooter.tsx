import { SACUANJOCHE_URL } from "@/lib/session";
import logo from "@/assets/logo-sacuanjoche.png";

export function BrandFooter() {
  return (
    <footer className="mt-16 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <a href={SACUANJOCHE_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-foreground transition">
          <img src={logo} alt="" className="h-6 w-6" />
          <span>Hecho con <span className="text-gold">★</span> por <span className="font-semibold text-foreground">Sacuanjoche.dev</span></span>
        </a>
        <div className="flex items-center gap-4">
          <a href={SACUANJOCHE_URL} target="_blank" rel="noreferrer" className="hover:text-foreground transition">sacuanjoche.dev</a>
          <span>© {new Date().getFullYear()} Sacuanjoche.dev</span>
        </div>
      </div>
    </footer>
  );
}
