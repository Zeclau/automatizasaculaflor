import { useEffect, useState } from "react";
import { supabaseExternal as supabase } from "@/integrations/supabase-external/client";
import type { AgentSession } from "@/lib/session";
import { waLink } from "@/lib/session";
import { MessageCircle, ImageOff, Loader2, Plus, Link2, ExternalLink } from "lucide-react";

type Property = {
  id: string;
  title: string | null;
  property_type: string | null;
  price_usd: number | null;
  general_location: string | null;
  images_urls: any;
  created_at: string;
  mode: "manual" | "fast" | null;
  external_source_url: string | null;
};

export function Dashboard({ session, onCreate }: { session: AgentSession; onCreate: () => void }) {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase
        .from("properties") as any)
        .select("id,title,property_type,price_usd,general_location,images_urls,created_at,mode,external_source_url")
        .eq("agent_id", session.id)
        .order("created_at", { ascending: false });
      if (!error) setItems((data ?? []) as Property[]);
      setLoading(false);
    })();
  }, [session.id]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Mis Portales Creados</h1>
          <p className="text-sm text-muted-foreground mt-1">Hola {session.first_name} · {items.length} portal{items.length === 1 ? "" : "es"}</p>
        </div>
        <button onClick={onCreate} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition">
          <Plus className="h-4 w-4" /> Subir nueva propiedad
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Aún no has creado portales. ¡Sube tu primera propiedad!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {items.map(p => <Card key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}

function Card({ p }: { p: Property }) {
  const fast = p.mode === "fast";
  const imgs = Array.isArray(p.images_urls) ? (p.images_urls as string[]) : [];
  const cover = imgs[0];
  const price = p.price_usd != null ? `$${Number(p.price_usd).toLocaleString("en-US")} USD` : "Precio a consultar";
  const title = fast ? "Propiedad vía Enlace" : (p.title ?? "Sin título");

  const msg = fast
    ? `Hola, quiero consultar el estado de mi portal Fast-Track:\nEnlace: ${p.external_source_url ?? "(sin enlace)"}`
    : `Hola, quiero consultar por mi portal: "${p.title ?? "(sin título)"}" — ${p.property_type ?? ""} · ${price} · ${p.general_location ?? ""}`;

  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col group hover:border-primary/50 transition">
      <div className="aspect-[4/3] bg-secondary/50 relative overflow-hidden">
        {fast ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/15 via-secondary/40 to-transparent text-primary">
            <Link2 className="h-10 w-10" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fast-Track</span>
          </div>
        ) : cover ? (
          <img src={cover} alt={p.title ?? ""} className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground"><ImageOff className="h-8 w-8" /></div>
        )}
        {fast ? (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-amber-500/20 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-amber-500/40 text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> Procesando…
          </span>
        ) : p.property_type ? (
          <span className="absolute top-3 left-3 rounded-full bg-background/80 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-border">
            {p.property_type}
          </span>
        ) : null}
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-semibold line-clamp-1">{title}</h3>
        {fast ? (
          <a
            href={p.external_source_url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-primary line-clamp-1 inline-flex items-center gap-1"
            title={p.external_source_url ?? ""}
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">{p.external_source_url ?? "—"}</span>
          </a>
        ) : (
          <>
            <p className="text-xs text-muted-foreground line-clamp-1">{p.general_location ?? "—"}</p>
            <p className="text-primary font-bold text-lg">{price}</p>
          </>
        )}
        <a
          href={waLink(msg)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary/15 hover:bg-primary hover:text-primary-foreground text-primary px-3 py-2 text-xs font-semibold transition"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Soporte WhatsApp
        </a>
      </div>
    </div>
  );
}
