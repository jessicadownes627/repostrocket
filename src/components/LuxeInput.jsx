import { memo } from "react";

const LuxeInput = memo(function LuxeInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
}) {

  console.log("✏️ LuxeInput render:", label);

  return (
    <div className="mb-6">
      <div className="text-sm uppercase opacity-70 tracking-wide mb-2">
        {label}
      </div>

      <input
        type="text"
        className="
          w-full p-3 rounded-[12px]
          bg-black/30
          border border-[var(--lux-border)]
          text-[var(--lux-text)]
          focus:outline-none
          lux-input
        "
        style={{
          caretColor: "var(--lux-text)", // stable caret
        }}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="none"
      />
    </div>
  );
}, 
// Shallow compare value + label only — stable & safe
(prev, next) =>
  prev.value === next.value &&
  prev.label === next.label
);

export default LuxeInput;
