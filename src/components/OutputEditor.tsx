import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { inputClass } from "./AppShell";

export function OutputEditor({ value, onChange, placeholder, rows = 14 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="space-y-3">
      <textarea
        className={inputClass + " min-h-[220px] resize-y leading-relaxed"}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "AI output appears here — fully editable."}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Editable · review before use</span>
        <Button variant="neu" size="sm" onClick={copy} disabled={!value}>
          {copied ? <Check /> : <Copy />} Copy to Clipboard
        </Button>
      </div>
    </div>
  );
}
