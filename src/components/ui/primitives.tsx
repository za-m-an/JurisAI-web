"use client";

import React, { forwardRef } from "react";

// 1. Button Primitive
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const sizes = {
      sm: "px-2.5 py-1 text-xs",
      md: "px-3.5 py-1.5 text-xs font-semibold",
      lg: "px-4 py-2 text-sm font-semibold",
    };

    const variants = {
      primary: "bg-[#7B1E22] hover:bg-[#64181B] text-white shadow-subtle border border-transparent",
      secondary: "bg-[#14181F] hover:bg-[#222834] text-white shadow-subtle border border-transparent",
      outline: "bg-white hover:bg-paper-warm text-ink border border-hairline hover:border-hairline-dark shadow-subtle",
      ghost: "bg-transparent hover:bg-black/5 text-ink-muted hover:text-ink",
      danger: "bg-rose-700 hover:bg-rose-800 text-white shadow-subtle border border-transparent",
    };

    return (
      <button ref={ref} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// 2. Input Primitive
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full px-3 py-2 bg-white border ${
            error ? "border-rose-400 focus:border-rose-600" : "border-hairline focus:border-accent"
          } rounded-md text-xs text-ink placeholder:text-ink-subtle shadow-subtle transition-colors duration-150 ${className}`}
          {...props}
        />
        {error && <p className="text-[11px] text-rose-700 font-medium">{error}</p>}
        {helperText && !error && <p className="text-[11px] text-ink-subtle">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

// 3. Select Primitive
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = "", children, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full px-3 py-2 bg-white border ${
            error ? "border-rose-400 focus:border-rose-600" : "border-hairline focus:border-accent"
          } rounded-md text-xs text-ink shadow-subtle transition-colors duration-150 ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-[11px] text-rose-700 font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

// 4. Badge Primitive
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "verified" | "corpus" | "unverified" | "neutral" | "high" | "medium" | "low";
}

export const Badge: React.FC<BadgeProps> = ({ variant = "neutral", className = "", children, ...props }) => {
  const base = "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border";
  const styles = {
    verified: "bg-[#E8F5EE] text-[#1B6E42] border-[#A3D9BD]",
    corpus: "bg-[#FFF8E6] text-[#8A5B00] border-[#F0D597]",
    unverified: "bg-[#FDE8E8] text-[#A61C1C] border-[#F8B4B4]",
    neutral: "bg-paper-warm text-ink-muted border-hairline",
    high: "bg-rose-50 text-rose-800 border-rose-200 uppercase font-bold",
    medium: "bg-amber-50 text-amber-800 border-amber-200 uppercase font-bold",
    low: "bg-blue-50 text-blue-800 border-blue-200 uppercase font-bold",
  };

  return (
    <span className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};

// 5. Tabs Primitive
export interface TabsProps {
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = "" }) => {
  return (
    <div className={`flex items-center space-x-1 border-b border-hairline ${className}`}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all -mb-px ${
              active
                ? "border-[#7B1E22] text-[#7B1E22]"
                : "border-transparent text-ink-muted hover:text-ink hover:border-hairline"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

// 6. Table Primitives
export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({ className = "", children, ...props }) => (
  <div className="w-full overflow-x-auto border border-hairline rounded-md bg-white shadow-subtle">
    <table className={`w-full text-left text-xs ${className}`} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className = "", children, ...props }) => (
  <thead className={`bg-paper-warm border-b border-hairline text-ink-muted uppercase text-[10px] font-semibold tracking-wider ${className}`} {...props}>
    {children}
  </thead>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className = "", children, ...props }) => (
  <tr className={`border-b border-hairline-subtle last:border-b-0 hover:bg-paper-warm/50 transition-colors ${className}`} {...props}>
    {children}
  </tr>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = "", children, ...props }) => (
  <td className={`p-3 text-ink tabular-nums ${className}`} {...props}>
    {children}
  </td>
);

// 7. EmptyState Primitive
export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => (
  <div className="p-8 text-center border border-dashed border-hairline rounded-lg bg-paper-warm/40 space-y-2">
    <h3 className="font-serif text-base font-bold text-ink">{title}</h3>
    <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed">{description}</p>
    {action && <div className="pt-3">{action}</div>}
  </div>
);

// 8. Skeleton Primitive
export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-hairline/60 rounded animate-pulse ${className}`} />
);
