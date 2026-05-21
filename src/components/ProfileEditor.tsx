import { useState } from "react";
import { supabaseExternal as supabase } from "@/integrations/supabase-external/client";
import { setSession, type AgentSession, PAISES, COUNTRY_DIAL_CODES } from "@/lib/session";
import { PhoneField } from "@/components/PhoneField";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

async function hashPin(pin: string, phoneCode: string, phoneNumber: string) {
  const data = new TextEncoder().encode(`stc-pin:${pin}:${phoneCode}${phoneNumber}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function ProfileEditor({
  open, onOpenChange, session, onUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: AgentSession;
  onUpdated: (s: AgentSession) => void;
}) {
  const initialBirth = session.birth_date_formatted?.match(/^(\d{2})-(\d{2})$/);
  const initialMonth = initialBirth ? MESES[parseInt(initialBirth[1], 10) - 1] : "";
  const initialDay = initialBirth ? String(parseInt(initialBirth[2], 10)) : "";

  const [agency, setAgency] = useState(session.agency_name ?? "");
  const [firstName, setFirstName] = useState(session.first_name === "Agente" ? "" : session.first_name ?? "");
  const [day, setDay] = useState(initialDay);
  const [month, setMonth] = useState(initialMonth);
  const [country, setCountry] = useState(session.country === "—" ? "" : session.country ?? "");
  const [phoneCode, setPhoneCode] = useState(session.phone_country_code ?? COUNTRY_DIAL_CODES[0].code);
  const [phoneNumber, setPhoneNumber] = useState(session.phone_number ?? "");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmPhoneOpen, setConfirmPhoneOpen] = useState(false);

  function handleCountry(v: string) {
    setCountry(v);
    const match = COUNTRY_DIAL_CODES.find(c => c.country === v);
    if (match) setPhoneCode(match.code);
  }

  const phoneChanged =
    phoneCode !== (session.phone_country_code ?? "") ||
    phoneNumber.trim() !== (session.phone_number ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !day || !month || !country || !phoneNumber.trim()) {
      toast.error("Completa los campos requeridos");
      return;
    }
    if (phoneNumber.replace(/\D/g, "").length < 6) {
      toast.error("Ingresa un teléfono válido");
      return;
    }
    if (pin && pin.length !== 2) {
      toast.error("El PIN debe ser de 2 dígitos");
      return;
    }
    // Confirmación de teléfono — siempre, pero el copy cambia si lo modificaste
    setConfirmPhoneOpen(true);
  }

  async function doSave() {
    setLoading(true);
    try {
      const mm = String(MESES.indexOf(month) + 1).padStart(2, "0");
      const dd = String(parseInt(day, 10)).padStart(2, "0");
      const birth = `${mm}-${dd}`;
      const phoneClean = phoneNumber.trim();

      // Si cambia el teléfono, validar que no exista ya otra cuenta con ese número
      if (phoneChanged) {
        const { data: dup } = await supabase.from("agents")
          .select("id").eq("phone_country_code", phoneCode).eq("phone_number", phoneClean).limit(1);
        if (dup && dup[0] && dup[0].id !== session.id) {
          toast.error("Ya existe otra cuenta con ese número");
          setLoading(false);
          setConfirmPhoneOpen(false);
          return;
        }
      }

      const updates: any = {
        first_name: firstName.trim(),
        agency_name: agency.trim() || null,
        birth_date_formatted: birth,
        country,
        phone_country_code: phoneCode,
        phone_number: phoneClean,
      };
      if (pin) {
        updates.pin_hash = await hashPin(pin, phoneCode, phoneClean);
        updates.pin_failed_attempts = 0;
        updates.pin_locked_until = null;
      }

      const { data: updated, error } = await supabase
        .from("agents").update(updates).eq("id", session.id).select().single();
      if (error) throw error;

      const newSess: AgentSession = {
        id: updated.id,
        first_name: updated.first_name,
        agency_name: updated.agency_name,
        birth_date_formatted: updated.birth_date_formatted,
        country: updated.country,
        phone_country_code: updated.phone_country_code,
        phone_number: updated.phone_number,
      };
      setSession(newSess);
      onUpdated(newSess);
      toast.success("Perfil actualizado");
      setConfirmPhoneOpen(false);
      onOpenChange(false);
      setPin("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>
              Actualiza tus datos o cambia tu PIN. Los campos con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <Field label="Agencia / Empresa" optional>
              <input value={agency} onChange={(e) => setAgency(e.target.value)}
                placeholder="Ej: RE/MAX Managua" className="input" />
            </Field>

            <Field label="Tu Primer Nombre" required>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ej: Carlos" required className="input" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Día Nac." required>
                <select value={day} onChange={(e) => setDay(e.target.value)} required className="input">
                  <option value="">Día</option>
                  {Array.from({length:31},(_,i)=>i+1).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Mes Nac." required>
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

            <Field label="Cambiar PIN (opcional, 2 dígitos)">
              <input
                type="text"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="Dejar vacío para no cambiarlo"
                maxLength={2}
                className="input tracking-[0.5em] text-center font-mono text-lg !w-28"
              />
            </Field>

            <DialogFooter className="gap-2">
              <button type="button" onClick={() => onOpenChange(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary transition">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmPhoneOpen} onOpenChange={setConfirmPhoneOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Este número es correcto?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirma que este número es tuyo y está activo en WhatsApp. Lo usaremos para que entres rápido y para contactarte.
              <div className="mt-3 text-center font-mono text-lg text-foreground">
                {phoneCode} {phoneNumber}
              </div>
              {phoneChanged && (
                <div className="mt-2 text-xs text-amber-500">
                  Cambiarás el número con el que entras a tu cuenta.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Revisar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doSave(); }} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sí, es correcto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
