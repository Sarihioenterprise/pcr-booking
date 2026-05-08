import React from "react";

interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ onCheckedChange, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        onChange={(e) => {
          onCheckedChange?.(e.target.checked);
          props.onChange?.(e);
        }}
        className={`h-4 w-4 rounded border border-gray-300 text-[#2EBD6B] focus:ring-2 focus:ring-[#2EBD6B] focus:ring-offset-0 cursor-pointer ${className}`}
        {...props}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";
