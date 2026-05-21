import { COUNTRY_DIAL_CODES } from "@/lib/session";

export function PhoneField({
  code, number, onCode, onNumber, required,
}: {
  code: string;
  number: string;
  onCode: (v: string) => void;
  onNumber: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1.5 text-muted-foreground">
        WhatsApp / Teléfono {required && <span className="text-primary">*</span>}
      </span>
      <div className="flex gap-2">
        <select
          value={code}
          onChange={(e) => onCode(e.target.value)}
          className="input !w-auto pr-8"
          required={required}
        >
          {COUNTRY_DIAL_CODES.map(c => (
            <option key={c.country} value={c.code}>{c.flag} {c.code}</option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          value={number}
          onChange={(e) => onNumber(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="88887777"
          className="input flex-1"
          required={required}
          maxLength={15}
        />
      </div>
    </label>
  );
}
