import { type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export function StatusBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-tile border border-stone-200 bg-white/78 p-3">
      <div className="text-xs font-black uppercase text-stone-500">{label}</div>
      <div className="mt-1 text-lg font-black text-stone-950">{value}</div>
    </div>
  );
}

export function SelectLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-stone-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      <AlertTriangle size={16} />
      {message}
    </div>
  );
}
