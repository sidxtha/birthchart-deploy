import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// Themed dropdown to replace the native <select>, whose open
// option list can't be restyled with CSS in most browsers.
export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select",
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  const selected = options.find(
    (opt) => String(opt.value) === String(value)
  );

  return (
    <div className="custom-select" ref={wrapperRef}>
      <button
        type="button"
        className={`custom-select-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className={
            selected ? "" : "custom-select-placeholder"
          }
        >
          {selected ? selected.label : placeholder}
        </span>

        <ChevronDown
          size={18}
          className="custom-select-chevron"
        />
      </button>

      {open && (
        <div className="custom-select-menu">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`custom-select-option ${
                String(opt.value) === String(value)
                  ? "selected"
                  : ""
              }`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}