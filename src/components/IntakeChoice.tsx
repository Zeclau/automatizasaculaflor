import { useState } from "react";
import { supabaseExternal as supabase } from "@/integrations/supabase-external/client";
import type { AgentSession } from "@/lib/session";
import { Link2, PencilLine, ArrowRight, Loader2, Check, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { waLink, SACUANJOCHE_URL } from "@/lib/session";

type Mode = "choose" | "fast" | "done";

export function IntakeChoice({
  session,
  onManual,
  onDone,
}: {
  session: AgentSession;
  onManual: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<Mode>("choose");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitFastTrack(e: React.FormEvent) {
    e.preventDefault();
    let clean = url.trim();
    if (!clean) {
      toast.error("Pega un enlace");
      return;
    }
    // Auto-prepend https:// if missing protocol
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(clean)) {
      clean = `https://${clean}`;
    }
    // Very lenient: just needs some non-whitespace content after protocol
    if (!/^https?:\/\/\S+/i.test(clean)) {
      toast.error("Pega un enlace válido");
      return;
    }
    setSubmitting(true);
    try {
      const propertyId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const summary = [
        `Sacuanjoche.dev — Propiedad Fast-Track`,
        `Property ID: ${propertyId}`,
        `Fecha: ${new Date().toISOString()}`,
        ``,
        `Agente: ${session.first_name}${session.agency_name ? ` (${session.agency_name})` : ""}`,
        `Teléfono: ${session.phone_country_code ?? ""} ${session.phone_number ?? ""}`.trim(),
        `País: ${session.country}`,
        ``,
        `Enlace original:`,
        clean,
      ].join("\n");

      const summaryPath = `agent-${session.id}/fast-${propertyId}.txt`;
      const summaryBlob = new Blob([summary], { type: "text/plain;charset=utf-8" });
      const { error: txtErr } = await supabase.storage
        .from("agents-fast")
        .upload(summaryPath, summaryBlob, { contentType: "text/plain", upsert: true });
      if (txtErr) console.error("fasttrack summary upload failed", txtErr);

      const { error } = await (supabase.from("properties") as any).insert({
        id: propertyId,
        agent_id: session.id,
        mode: "fast",
        external_source_url: clean,
        title: "Propiedad vía Enlace",
        attributes: { summary_txt_path: summaryPath },
      });
      if (error) throw error;
      setMode("done");
    } catch (err: any) {
      toast.error(err.message ?? "No se pudo enviar el enlace");
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "done") {
    const msg = `Hola, acabo de enviar un enlace Fast-Track para digitalizar mi propiedad: ${url}`;
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24 text-center">
        <div className="check-pop inline-flex h-24 w-24 items-center justify-center rounded-full bg-primary shadow-glow mb-6">
          <Check className="h-12 w-12 text-primary-foreground" strokeWidth={3} />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold">¡Enlace Recibido!</h2>
        <p className="mt-3 text-muted-foreground">
          Estamos procesando tu propiedad. Nuestro equipo extraerá los datos y la dejará lista en tu portal.
        </p>
        <a
          href={waLink(msg)}
          target="_blank"
          rel="noreferrer"
          className="pulse-glow mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-5 text-lg font-bold text-primary-foreground shadow-glow hover:opacity-95 transition"
        >
          🚀 Avisar al equipo por WhatsApp
        </a>
        <div className="mt-8 flex flex-col items-center gap-3">
          <button onClick={onDone} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
            Ver mis portales
          </button>
          <a href={SACUANJOCHE_URL} target="_blank" rel="noreferrer" className="text-xs text-gold hover:underline">
            Powered by Sacuanjoche.dev
          </a>
        </div>
      </div>
    );
  }

  if (mode === "fast") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <button
          onClick={() => setMode("choose")}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Volver
        </button>
        <div className="glass rounded-2xl p-6 sm:p-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Link2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Fast-Track por Enlace</h2>
              <p className="text-xs text-muted-foreground">Nuestro equipo extrae las fotos y datos por ti.</p>
            </div>
          </div>
          <form onSubmit={submitFastTrack} className="space-y-4">
            <label className="block">
              <span className="block text-xs font-medium mb-1.5 text-muted-foreground">
                Pega el enlace aquí (URL)
              </span>
              <input
                type="text"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://facebook.com/marketplace/item/... o https://encuentra24.com/..."
                className="input"
                required
                autoFocus
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95 transition disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar Enlace <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              Aceptamos Facebook, Marketplace, Encuentra24, tu sitio web y más.
            </p>
          </form>
        </div>
        <style>{`
          .input { width: 100%; background: var(--color-input); border: 1px solid var(--color-border); color: var(--color-foreground); border-radius: 0.75rem; padding: 0.65rem 0.85rem; font-size: 0.9rem; outline: none; transition: border-color .15s, box-shadow .15s; }
          .input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary) 25%, transparent); }
        `}</style>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">¿Cómo quieres subir tu propiedad?</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">Elige el camino que más te convenga. Ambos son gratis.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
        <ChoiceCard
          icon={<Link2 className="h-7 w-7" />}
          tag="Fast Track"
          title="Ya tengo mi propiedad publicada"
          subtitle="Pega el enlace de Facebook, Encuentra24 o tu web y nosotros extraemos los datos."
          cta="Pegar enlace"
          highlight
          onClick={() => setMode("fast")}
        />
        <ChoiceCard
          icon={<PencilLine className="h-7 w-7" />}
          tag="Manual"
          title="Subir fotos y detalles manualmente"
          subtitle="Llena nuestro formulario paso a paso para un control total."
          cta="Empezar formulario"
          onClick={onManual}
        />
      </div>
    </div>
  );
}

function ChoiceCard({
  icon, tag, title, subtitle, cta, onClick, highlight,
}: {
  icon: React.ReactNode;
  tag: string;
  title: string;
  subtitle: string;
  cta: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group text-left glass rounded-2xl p-6 sm:p-7 flex flex-col gap-4 border transition-all hover:-translate-y-0.5 hover:shadow-glow ${
        highlight
          ? "border-primary/40 hover:border-primary bg-gradient-to-br from-primary/10 via-transparent to-transparent"
          : "border-border hover:border-primary/60"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${highlight ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary text-primary"}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${highlight ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-secondary/60 text-muted-foreground"}`}>
          {tag}
        </span>
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg sm:text-xl font-bold leading-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <span className={`mt-auto inline-flex items-center gap-1.5 text-sm font-semibold ${highlight ? "text-primary" : "text-foreground"} group-hover:gap-2.5 transition-all`}>
        {cta} <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}
