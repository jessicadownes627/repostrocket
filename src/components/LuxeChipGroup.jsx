import React from "react";

export default function LuxeChipGroup({
  options = [],
  value,
  onChange,
  multiple = false,
}) {
  const isSelected = (option) =>
    multiple
      ? Array.isArray(value) && value.includes(option)
      : value === option;

  const handleClick = (option) => {
    if (!onChange) return;

    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      const exists = current.includes(option);
      const next = exists
        ? current.filter((v) => v !== option)
        : [...current, option];
      onChange(next);
    } else {
      const next = option === value ? "" : option;
      onChange(next);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`lux-chip ${isSelected(option) ? "lux-chip-active" : ""}`}
          onClick={() => handleClick(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

