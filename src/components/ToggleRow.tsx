export function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 w-4 h-4" />
      <span>
        <span className="block text-sm font-bold text-slate-700">{label}</span>
        <span className="block text-xs text-slate-400">{desc}</span>
      </span>
    </label>
  );
}
