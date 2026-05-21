import { useState } from "react";
import { supabaseExternal as supabase } from "@/integrations/supabase-external/client";
import { setSession, type AgentSession, SACUANJOCHE_URL, PAISES, COUNTRY_DIAL_CODES } from "@/lib/session";
import { PhoneField } from "@/components/PhoneField";
import logo from "@/assets/logo-sacuanjoche.png";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

async function hashPin(pin: string, phoneCode: string, phoneNumber: string) {
  const data = new TextEncoder().encode(`stc-pin:${pin}:${phoneCode}${phoneNumber}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function toSession(agent: any, fallbackCode: string, fallbackNumber: string): AgentSession {
  return {
    id: agent.id,
    first_name: agent.first_name,
    agency_name: agent.agency_name,
    birth_date_formatted: agent.birth_date_formatted,
    country: agent.country,
    phone_country_code: agent.phone_country_code ?? fallbackCode,
    phone_number: agent.phone_number ?? fallbackNumber,
  };
}

export function LoginScreen({ onLogin }: { onLogin: (s: AgentSession) => void }) {
  const [agency, setAgency] = useState("");
  const [firstName, setFirstName] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [country, setCountry] = useState("");
  const [phoneCode, setPhoneCode] = useState(COUNTRY_DIAL_CODES[0].code);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  // Quick login dialog state
  const [quickOpen, setQuickOpen] = useState(false);
  const [qCode, setQCode] = useState(COUNTRY_DIAL_CODES[0].code);
  const [qNumber, setQNumber] = useState("");
  const [qPin, setQPin] = useState("");
  const [qLoading, setQLoading] = useState(false);

  function handleCountry(v: string) {
    setCountry(v);
    const match = COUNTRY_DIAL_CODES.find(c => c.country === v);
    if (match) setPhoneCode(match.code);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !day || !month || !country || !phoneNumber.trim() || pin.length !== 2) {
      toast.error("Completa los campos requeridos (incluyendo PIN de 2 dígitos)");
      return;
    }
    if (phoneNumber.replace(/\D/g, "").length < 6) {
      toast.error("Ingresa un teléfono válido");
      return;
    }
    setLoading(true);
    try {
      const mm = String(MESES.indexOf(month) + 1).padStart(2, "0");
      const dd = String(parseInt(day, 10)).padStart(2, "0");
      const birth = `${mm}-${dd}`;
      const agencyVal = agency.trim() || null;
      const fn = firstName.trim();
      const phoneClean = phoneNumber.trim();
      const pinHash = await hashPin(pin, phoneCode, phoneClean);

      // Identidad única = teléfono (mismo criterio que entrada rápida → evita duplicados)
      const { data: existing, error: selErr } = await supabase.from("agents").select("*")
        .eq("phone_country_code", phoneCode)
        .eq("phone_number", phoneClean)
        .limit(1);
      if (selErr) throw selErr;

      let agent = existing?.[0];
      if (!agent) {
        const { data: inserted, error: insErr } = await supabase
          .from("agents")
          .insert({
            first_name: fn,
            agency_name: agencyVal,
            birth_date_formatted: birth,
            country,
            phone_country_code: phoneCode,
            phone_number: phoneClean,
            pin_hash: pinHash,
          })
          .select()
          .single();
        if (insErr) throw insErr;
        agent = inserted;
        toast.success(`¡Bienvenido ${fn}! Cuenta creada.`);
      } else {
        // Cuenta existente (creada por rápido o detallado) → validar PIN y completar datos
        if (agent.pin_hash && agent.pin_hash !== pinHash) {
          toast.error("El PIN no coincide con la cuenta existente de este teléfono");
          setLoading(false);
          return;
        }
        // Completar/actualizar datos reales (sobreescribe placeholders del registro mínimo)
        const updates: any = {
          first_name: fn,
          agency_name: agencyVal,
          birth_date_formatted: birth,
          country,
        };
        if (!agent.pin_hash) updates.pin_hash = pinHash;
        const { data: updated } = await supabase.from("agents").update(updates).eq("id", agent.id).select().single();
        agent = updated ?? { ...agent, ...updates };
        toast.success(`¡Hola de nuevo, ${fn}!`);
      }

      const sess = toSession(agent, phoneCode, phoneClean);
      setSession(sess);
      onLogin(sess);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "No se pudo ingresar");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickLogin(e: React.FormEvent) {
    e.preventDefault();
    if (qNumber.replace(/\D/g, "").length < 6 || qPin.length !== 2) {
      toast.error("Ingresa teléfono y PIN de 2 dígitos");
      return;
    }
    setQLoading(true);
    try {
      const phoneClean = qNumber.trim();
      const { data: rows, error: selErr } = await supabase
        .from("agents")
        .select("*")
        .eq("phone_country_code", qCode)
        .eq("phone_number", phoneClean)
        .limit(1);
      if (selErr) throw selErr;

      let agent = rows?.[0];
      if (!agent) {
        // No existe → crear cuenta mínima solo con teléfono + PIN
        const pinHash = await hashPin(qPin, qCode, phoneClean);
        const { data: inserted, error: insErr } = await supabase
          .from("agents")
          .insert({
            first_name: "Agente",
            birth_date_formatted: "01-01",
            country: "—",
            phone_country_code: qCode,
            phone_number: phoneClean,
            pin_hash: pinHash,
          })
          .select()
          .single();
        if (insErr) {
          toast.error("No pudimos crear tu cuenta. Intenta con el formulario detallado.");
          return;
        }
        const sess = toSession(inserted, qCode, phoneClean);
        setSession(sess);
        toast.success("¡Cuenta creada! Completa tu perfil cuando quieras.");
        setQuickOpen(false);
        onLogin(sess);
        return;
      }

      // Check lockout
      if (agent.pin_locked_until && new Date(agent.pin_locked_until) > new Date()) {
        const mins = Math.ceil((new Date(agent.pin_locked_until).getTime() - Date.now()) / 60000);
        toast.error(`Cuenta bloqueada por ${mins} min por demasiados intentos`);
        return;
      }

      // Cuenta existente sin PIN (legacy) → se establece el PIN ingresado y entra
      if (!agent.pin_hash) {
        const newHash = await hashPin(qPin, qCode, phoneClean);
        const { data: updated } = await supabase.from("agents")
          .update({ pin_hash: newHash, pin_failed_attempts: 0, pin_locked_until: null })
          .eq("id", agent.id).select().single();
        const sess = toSession(updated ?? agent, qCode, phoneClean);
        setSession(sess);
        toast.success(`¡Hola ${agent.first_name}! PIN establecido.`);
        setQuickOpen(false);
        onLogin(sess);
        return;
      }

      const candidate = await hashPin(qPin, qCode, phoneClean);
      if (candidate !== agent.pin_hash) {
        const attempts = (agent.pin_failed_attempts ?? 0) + 1;
        const updates: any = { pin_failed_attempts: attempts };
        if (attempts >= 5) {
          updates.pin_locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          updates.pin_failed_attempts = 0;
          await supabase.from("agents").update(updates).eq("id", agent.id);
          toast.error("5 intentos fallidos. Cuenta bloqueada 15 minutos.");
        } else {
          await supabase.from("agents").update(updates).eq("id", agent.id);
          toast.error(`PIN incorrecto. Quedan ${5 - attempts} intentos.`);
        }
        return;
      }

      // Success: reset counters
      await supabase.from("agents")
        .update({ pin_failed_attempts: 0, pin_locked_until: null })
        .eq("id", agent.id);

      const sess = toSession(agent, qCode, phoneClean);
      setSession(sess);
      toast.success(`¡Hola de nuevo, ${agent.first_name}!`);
      setQuickOpen(false);
      onLogin(sess);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "No se pudo entrar");
    } finally {
      setQLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-8">
            <a href={SACUANJOCHE_URL} target="_blank" rel="noreferrer" title="Sacuanjoche.dev">
              <img src={logo} alt="Sacuanjoche" className="h-20 w-20 mb-4 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] hover:scale-105 transition" />
            </a>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Sacuanjoche<span className="text-gold">.dev</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              Ingresa tus datos rápidos para gestionar tus portales inmobiliarios.
            </p>
          </div>

          {/* Quick login CTA — primary entry for returning agents */}
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            className="w-full mb-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/20 to-gold/5 px-4 py-3.5 font-semibold text-foreground shadow-glow hover:from-gold/30 hover:to-gold/10 transition group"
          >
            <Zap className="h-4 w-4 text-gold group-hover:scale-110 transition" />
            Entrada rápida con teléfono + PIN
          </button>

          <div className="relative my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>Regístratro detallado. (Opcional)</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 sm:p-8 space-y-4">
            <Field label="Agencia / Empresa" optional>
              <input value={agency} onChange={(e) => setAgency(e.target.value)}
                placeholder="Ej: RE/MAX Managua"
                className="input" />
            </Field>

            <Field label="Tu Primer Nombre" required>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ej: Carlos" required className="input" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Día de Nacimiento" required>
                <select value={day} onChange={(e) => setDay(e.target.value)} required className="input">
                  <option value="">Día</option>
                  {Array.from({length:31},(_,i)=>i+1).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Mes de Nacimiento" required>
                <select value={month} onChange={(e) => setMonth(e.target.value)} required className="input">
                  <option value="">Mes</option>
                  {MESES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </div>

            <Field label="País" required>
              <select value={country} onChange={(e) => handleCountry(e.target.value)} required className="input">
                <option value="">Selecciona tu país</option>
                {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>

            <PhoneField
              code={phoneCode}
              number={phoneNumber}
              onCode={setPhoneCode}
              onNumber={setPhoneNumber}
              required
            />

            <Field label="PIN de 2 dígitos (para entrada rápida)" required>
              <input
                type="text"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="••"
                required
                maxLength={2}
                className="input tracking-[0.5em] text-center font-mono text-lg !w-28"
              />
              <span className="block text-[11px] text-muted-foreground/70 mt-1">
                Lo usarás para entrar rápido la próxima vez. Tras 5 intentos fallidos podrás intentarlo de nuevo en 15 minutos.
              </span>
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar al Portal
            </button>

            <p className="text-center text-xs text-muted-foreground pt-2">
              Powered by{" "}
              <a href={SACUANJOCHE_URL} target="_blank" rel="noreferrer" className="text-gold hover:underline font-medium">
                Sacuanjoche.dev
              </a>
            </p>
          </form>
        </div>
      </div>

      {/* Quick login dialog */}
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-gold" />
              Entrada rápida
            </DialogTitle>
            <DialogDescription>
              Ingresa tu teléfono y un PIN de 2 dígitos. Si es tu primera vez, se crea tu cuenta al instante.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickLogin} className="space-y-4 pt-2">
            <PhoneField
              code={qCode}
              number={qNumber}
              onCode={setQCode}
              onNumber={setQNumber}
              required
            />
            <Field label="PIN de 2 dígitos" required>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={qPin}
                onChange={(e) => setQPin(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="••"
                required
                maxLength={2}
                className="input tracking-[0.5em] text-center font-mono text-xl !w-28 mx-auto"
              />
            </Field>
            <button
              type="submit"
              disabled={qLoading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition disabled:opacity-60"
            >
              {qLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </button>
            <p className="text-[11px] text-center text-muted-foreground">
              ¿Olvidaste tu PIN? Entra con el formulario completo usando los mismos datos y se restablecerá.
            </p>
          </form>
        </DialogContent>
      </Dialog>

      <style>{`
        .input {
          width: 100%;
          background: var(--color-input);
          border: 1px solid var(--color-border);
          color: var(--color-foreground);
          border-radius: 0.75rem;
          padding: 0.65rem 0.85rem;
          font-size: 0.9rem;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary) 25%, transparent); }
        select.input { appearance: none; background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%); background-position: right 14px top 50%, right 9px top 50%; background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; padding-right: 28px; }
      `}</style>
    </div>
  );
}

function Field({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1.5 text-muted-foreground">
        {label} {required && <span className="text-primary">*</span>}
        {optional && <span className="text-muted-foreground/60">(opcional)</span>}
      </span>
      {children}
    </label>
  );
}
