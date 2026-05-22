import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { LoginScreen } from "@/components/LoginScreen";
import { PropertyWizard } from "@/components/PropertyWizard";
import { Dashboard } from "@/components/Dashboard";
import { IntakeChoice } from "@/components/IntakeChoice";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";
import { getSession, type AgentSession } from "@/lib/session";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Sacuanjoche.dev — Sube los datos de tu propiedad" },
      { name: "description", content: "Portal premium para digitalizar y publicar tus propiedades inmobiliarias en minutos. Powered by Sacuanjoche.dev." },
    ],
  }),
});

function Index() {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [view, setView] = useState<"intake" | "form" | "dashboard">("intake");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setHydrated(true);
  }, []);

  if (!hydrated) return <div className="min-h-screen" />;

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster theme="dark" position="top-center" />
      {!session ? (
        <LoginScreen onLogin={(s) => { setSession(s); setView("intake"); }} />
      ) : (
        <>
          <BrandHeader
            session={session}
            onLogout={() => setSession(null)}
            onToggleView={() => setView(v => v === "dashboard" ? "intake" : "dashboard")}
            onSessionUpdate={(s) => setSession(s)}
            view={view === "dashboard" ? "dashboard" : "form"}
          />
          <main className="flex-1">
            {view === "intake" && (
              <IntakeChoice
                session={session}
                onManual={() => setView("form")}
                onDone={() => setView("dashboard")}
              />
            )}
            {view === "form" && (
              <PropertyWizard session={session} onDone={() => setView("dashboard")} onBack={() => setView("intake")} />
            )}
            {view === "dashboard" && (
              <Dashboard session={session} onCreate={() => setView("intake")} />
            )}
          </main>
          <BrandFooter />
        </>
      )}
    </div>
  );
}
