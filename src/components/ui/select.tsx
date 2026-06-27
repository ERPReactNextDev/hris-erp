"use client";

import * as React from "react";

// Simple native select component for reliability
interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children?: React.ReactNode;
  className?: string;
}

export const Select = ({ value, onValueChange, className }: SelectProps) => {
  // We'll extract the SelectContent children to get the options
  return <></>; // This is just a placeholder for compatibility
};

export const SelectTrigger = ({ className, children }: { className?: string; children?: React.ReactNode }) => {
  return <>{children}</>;
};

export const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  return <>{placeholder}</>;
};

export const SelectContent = ({ children }: { children?: React.ReactNode }) => {
  return <>{children}</>;
};

export const SelectItem = ({ value, children }: { value: string; children?: React.ReactNode }) => {
  return <option value={value}>{children}</option>;
};

// Let's create a simple, reliable wrapper that uses native select
export const NativeSelect = ({ 
  value, 
  onValueChange, 
  placeholder, 
  options,
  className 
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
  className?: string;
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={`flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 rounded-md cursor-pointer bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent ${className}`}
    >
      {placeholder && <option value="all">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};
