import { memo } from "react";

const LuxeInput = memo(
  function LuxeInput({ label, value, onChange, onBlur, placeholder }) {
    console.log("✏️ LuxeInput render:", label);
    return (
      <div className="mb-6">
        <div className="text-xs uppercase opacity-70 tracking-wide mb-2">
          {label}
        </div>
        <input
          style={{ position: "relative", zIndex: 9999 }}
          className="w-full p-3 rounded-[12px] bg-black/30 border border-[var(--lux-border)] text-[var(--lux-text)] focus:outline-none lux-input"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
        />
      </div>
    );
  },
  (prev, next) =>
    prev.value === next.value &&
    prev.placeholder === next.placeholder &&
    prev.label === next.label &&
    prev.onChange === next.onChange &&
    prev.onBlur === next.onBlur
);

export default LuxeInput;
