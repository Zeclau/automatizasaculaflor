import logo from "@/assets/logo-sacuanjoche.png";
import { SACUANJOCHE_URL, WHATSAPP_URL, clearSession, type AgentSession } from "@/lib/session";
import { LogOut, MessageCircle, UserCog } from "lucide-react";
import { useState } from "react";
import { ProfileEditor } from "@/components/ProfileEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function BrandHeader({
  session,
  onLogout,
  onToggleView,
  onSessionUpdate,
  view,
}: {
  session: AgentSession | null;
  onLogout?: () => void;
  onToggleView?: () => void;
  onSessionUpdate?: (s: AgentSession) => void;
  view?: "form" | "dashboard";
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 glass border-b border-border/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a
          href={SACUANJOCHE_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 group"
          title="Powered by Sacuanjoche.dev"
        >
          <img src={logo} alt="Sacuanjoche" className="h-10 w-10 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:scale-105 transition" />
          <div className="leading-tight">
            <div className="text-base font-bold tracking-tight">Sacuanjoche<span className="text-gold">.dev</span></div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">by Sacuanjoche.dev</div>
          </div>
        </a>

        <div className="flex items-center gap-2">
          {session && onToggleView && (
            <button
              onClick={onToggleView}
              className="hidden sm:inline-flex items-center rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs font-medium hover:bg-secondary transition"
            >
              {view === "dashboard" ? "Subir nueva" : "Mis Portales"}
            </button>
          )}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition"
          >
            <MessageCircle className="h-4 w-4" /> Soporte
          </a>
          {session && onSessionUpdate && (
            <button
              onClick={() => setEditorOpen(true)}
              className="inline-flex items-center rounded-xl border border-border bg-secondary/60 px-2.5 py-2 text-xs hover:bg-secondary transition"
              title="Editar perfil / PIN"
            >
              <UserCog className="h-4 w-4" />
            </button>
          )}
          {session && onLogout && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="inline-flex items-center rounded-xl border border-border bg-secondary/60 px-2.5 py-2 text-xs hover:bg-secondary transition"
                  title="Salir"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Saldrás del portal y deberás ingresar tus datos de nuevo para volver a entrar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { clearSession(); onLogout(); }}>
                    Sí, salir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      {session && onSessionUpdate && (
        <ProfileEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          session={session}
          onUpdated={onSessionUpdate}
        />
      )}
    </header>
  );
}
