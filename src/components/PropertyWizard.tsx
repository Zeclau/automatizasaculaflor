import { useRef, useState } from "react";
import { supabaseExternal as supabase } from "@/integrations/supabase-external/client";
import type { AgentSession } from "@/lib/session";
import { waLink, SACUANJOCHE_URL } from "@/lib/session";
import { Check, ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2, Wind, Waves, Car, Trees, FileText, FileUp } from "lucide-react";
import { toast } from "sonner";

const TIPOS = ["Casa", "Apartamento", "Terreno", "Local Comercial"];
const AMENIDADES = [
  { key: "Aire Acondicionado", icon: Wind },
  { key: "Piscina", icon: Waves },
  { key: "Estacionamiento", icon: Car },
  { key: "Patio", icon: Trees },
];

const BUCKET = "agents-manual";
const sanitize = (s: string) =>
  s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);

async function uploadTextFile(path: string, content: string) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, new Blob([content], { type: "text/plain;charset=utf-8" }), {
      contentType: "text/plain",
      upsert: true,
    });
  if (error) throw error;
}

function propPrefix(agentId: string, propertyId: string) {
  return `agent-${agentId}/property-${propertyId}`;
}

export function PropertyWizard({ session, onDone }: { session: AgentSession; onDone: () => void }) {
  const [propertyId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
  const prefix = propPrefix(session.id, propertyId);
  const [step, setStep] = useState(0);
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [rooms, setRooms] = useState("");
  const [baths, setBaths] = useState("");
  const [area, setArea] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [desc, setDesc] = useState("");
  const [images, setImages] = useState<{ url: string; path: string }[]>([]);
  const [docs, setDocs] = useState<{ url: string; path: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = 20 - images.length;
    if (remaining <= 0) { toast.error("Máximo 20 fotos"); return; }
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      for (const file of list) {
        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
        const path = `${prefix}/images/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
        if (error) { toast.error(`Error subiendo ${file.name}`); continue; }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        setImages((prev) => [...prev, { url: data.publicUrl, path }]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeImage(idx: number) {
    const img = images[idx];
    await supabase.storage.from(BUCKET).remove([img.path]);
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleDocs(files: FileList | null) {
    if (!files) return;
    const remaining = 10 - docs.length;
    if (remaining <= 0) { toast.error("Máximo 10 documentos"); return; }
    const list = Array.from(files).slice(0, remaining);
    setUploadingDocs(true);
    try {
      for (const file of list) {
        const safe = sanitize(file.name);
        const path = `${prefix}/docs/${Date.now()}-${safe}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
        if (error) { toast.error(`Error subiendo ${file.name}`); continue; }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        setDocs((prev) => [...prev, { url: data.publicUrl, path, name: file.name }]);
      }
    } finally {
      setUploadingDocs(false);
      if (docRef.current) docRef.current.value = "";
    }
  }

  async function removeDoc(idx: number) {
    const d = docs[idx];
    await supabase.storage.from(BUCKET).remove([d.path]);
    setDocs((prev) => prev.filter((_, i) => i !== idx));
  }

  async function publish() {
    setSubmitting(true);
    try {
      const stamp = new Date().toISOString();
      const basicPath = `${prefix}/data/datos-basicos.txt`;
      const featuresPath = `${prefix}/data/caracteristicas.txt`;

      await uploadTextFile(basicPath, [
        `Sacuanjoche.dev — Datos Básicos`,
        `Property ID: ${propertyId}`,
        `Fecha: ${stamp}`,
        `Agente: ${session.first_name}${session.agency_name ? ` (${session.agency_name})` : ""}`,
        `Teléfono: ${session.phone_country_code ?? ""} ${session.phone_number ?? ""}`.trim(),
        `País: ${session.country}`,
        `Tipo: ${type || "-"}`,
        `Título: ${title || "-"}`,
        `Precio USD: ${price || "-"}`,
        `Ubicación: ${location || "-"}`,
      ].join("\n"));

      await uploadTextFile(featuresPath, [
        `Sacuanjoche.dev — Características`,
        `Property ID: ${propertyId}`,
        `Fecha: ${stamp}`,
        `Habitaciones: ${rooms || "-"}`,
        `Baños: ${baths || "-"}`,
        `Área m²: ${area || "-"}`,
        `Amenidades: ${amenities.length ? amenities.join(", ") : "-"}`,
        ``,
        `Descripción:`,
        desc || "-",
      ].join("\n"));

      const { error } = await (supabase.from("properties") as any).insert({
        id: propertyId,
        agent_id: session.id,
        mode: "manual",
        property_type: type || null,
        title: title || null,
        price_usd: price ? Number(price) : null,
        general_location: location || null,
        description: desc || null,
        attributes: {
          rooms: rooms ? Number(rooms) : null,
          bathrooms: baths ? Number(baths) : null,
          area_m2: area ? Number(area) : null,
          amenities,
          basic_data_txt_path: basicPath,
          features_txt_path: featuresPath,
        },
        images_urls: images.map(i => i.url),
        docs_urls: docs.map(d => ({ url: d.url, name: d.name })),
      });
      if (error) throw error;
      setDone(true);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo publicar");
    } finally {
      setSubmitting(false);
    }
  }


  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24 text-center">
        <div className="check-pop inline-flex h-24 w-24 items-center justify-center rounded-full bg-primary shadow-glow mb-6">
          <Check className="h-12 w-12 text-primary-foreground" strokeWidth={3} />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold">¡Portal Publicado!</h2>
        <p className="mt-3 text-muted-foreground">Tu propiedad ya está en el sistema. Conversemos para activar tus portales inmobiliarios.</p>
        <a
          href={waLink(`Hola, acabo de publicar un portal en Sacuanjoche.dev y quiero activarlo: "${title || "(sin título)"}"${price ? ` — $${Number(price).toLocaleString("en-US")} USD` : ""}${location ? ` · ${location}` : ""}`)}
          target="_blank"
          rel="noreferrer"
          className="pulse-glow mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-5 text-lg font-bold text-primary-foreground shadow-glow hover:opacity-95 transition"
        >
          🚀 Consultar por tu portal activo vía WhatsApp
        </a>
        <div className="mt-8 flex flex-col items-center gap-3">
          <button onClick={onDone} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
            Subir otra propiedad
          </button>
          <a href={SACUANJOCHE_URL} target="_blank" rel="noreferrer" className="text-xs text-gold hover:underline">
            Powered by Sacuanjoche.dev
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sube los datos de esa propiedad que quieres digitalizar</h1>
        <p className="mt-2 text-sm text-muted-foreground">3 pasos rápidos. Todos los campos son opcionales.</p>
      </div>

      <Stepper step={step} />

      <div className="glass rounded-2xl p-5 sm:p-8 mt-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Datos Básicos</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <L label="Tipo de Propiedad">
                <select value={type} onChange={(e) => setType(e.target.value)} className="input">
                  <option value="">Selecciona...</option>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </L>
              <L label="Título de la Propiedad">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hermosa Casa en Carretera Masaya" className="input" />
              </L>
              <L label="Precio en USD">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md bg-primary/15 text-primary text-xs font-bold px-2 py-0.5">$</span>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="120000" className="input pl-10" />
                </div>
              </L>
              <L label="Ubicación General">
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Altamira, Managua" className="input" />
              </L>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">Características</h2>
            <div className="grid grid-cols-3 gap-3">
              <L label="Cuartos"><input type="number" value={rooms} onChange={(e) => setRooms(e.target.value)} className="input" /></L>
              <L label="Baños"><input type="number" value={baths} onChange={(e) => setBaths(e.target.value)} className="input" /></L>
              <L label="Área en Mt² (Opcional)"><input type="number" value={area} onChange={(e) => setArea(e.target.value)} className="input" /></L>
            </div>
            <div>
              <span className="block text-xs font-medium mb-2 text-muted-foreground">Amenidades</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {AMENIDADES.map(({ key, icon: Icon }) => {
                  const on = amenities.includes(key);
                  return (
                    <button type="button" key={key}
                      onClick={() => setAmenities(p => on ? p.filter(x => x !== key) : [...p, key])}
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-xs font-medium transition ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/40 hover:bg-secondary"}`}>
                      <Icon className="h-5 w-5" />
                      {key}
                    </button>
                  );
                })}
              </div>
            </div>
            <L label="Descripción Detallada (Opcional)">
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} className="input resize-none" placeholder="Cuéntanos lo que hace especial a esta propiedad..." />
            </L>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Fotos de la Propiedad</h2>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition p-8 sm:p-12 text-center"
            >
              <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
              </div>
              <p className="font-medium">Arrastra tus fotos aquí o haz clic para buscar</p>
              <p className="text-xs text-muted-foreground mt-1">Máx. 20 fotos · {images.length}/20 subidas</p>
              <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((img, i) => (
                  <div key={img.path} className="group relative aspect-square overflow-hidden rounded-xl border border-border">
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => removeImage(i)} className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/60">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Documentos (opcional)</h3>
              <div
                onClick={() => docRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleDocs(e.dataTransfer.files); }}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition p-6 text-center"
              >
                <div className="mx-auto mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  {uploadingDocs ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileUp className="h-5 w-5" />}
                </div>
                <p className="text-sm font-medium">Sube escrituras, planos o cualquier PDF / texto</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, TXT · Máx. 10 archivos · {docs.length}/10</p>
                <input ref={docRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,text/plain" className="hidden" onChange={(e) => handleDocs(e.target.files)} />
              </div>
              {docs.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {docs.map((d, i) => (
                    <li key={d.path} className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:text-primary" title={d.name}>{d.name}</a>
                      <button onClick={() => removeDoc(i)} className="text-muted-foreground hover:text-destructive transition" aria-label="Eliminar documento">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm font-medium disabled:opacity-40 hover:bg-secondary transition"
          >
            <ChevronLeft className="h-4 w-4" /> Atrás
          </button>
          {step < 2 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="inline-flex items-center gap-1 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={publish}
              disabled={uploading || uploadingDocs || submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95 transition disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Publicar Portal
            </button>
          )}
        </div>
      </div>

      <style>{`
        .input { width: 100%; background: var(--color-input); border: 1px solid var(--color-border); color: var(--color-foreground); border-radius: 0.75rem; padding: 0.65rem 0.85rem; font-size: 0.9rem; outline: none; transition: border-color .15s, box-shadow .15s; }
        .input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary) 25%, transparent); }
        select.input { appearance: none; padding-right: 28px; }
      `}</style>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1.5 text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Datos Básicos", "Características", "Fotos & Docs"];
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-2 sm:gap-4">
          <div className={`flex items-center gap-2 ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary border border-border"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="text-xs sm:text-sm font-medium hidden sm:inline">{l}</span>
          </div>
          {i < labels.length - 1 && <div className={`h-px w-6 sm:w-12 ${i < step ? "bg-primary" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}
