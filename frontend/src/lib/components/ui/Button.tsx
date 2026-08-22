/** HRMS Button — variants, sizes, loading state. */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "tenant";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-base",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#0A0A0A] text-white hover:bg-[#F97316] focus-visible:ring-[#F97316]",
  secondary:
    "bg-white text-[#0A0A0A] border border-[#E5E5E3] hover:bg-[#F2F2F0] focus-visible:ring-[#0A0A0A]",
  ghost:
    "bg-transparent text-[#0A0A0A] hover:bg-[#F2F2F0] focus-visible:ring-[#0A0A0A]",
  danger:
    "bg-[#DC2626] text-white hover:bg-[#B91C1C] focus-visible:ring-[#DC2626]",
  tenant:
    "bg-[var(--tenant-primary)] text-[var(--tenant-text-on-primary)] hover:bg-[var(--tenant-primary-hover)] focus-visible:ring-[var(--tenant-primary)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, type = "button", className, children, disabled, leadingIcon, trailingIcon, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium",
        "transition-colors duration-150 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F9F9F7]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "motion-reduce:transition-none",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Spinner size={16} />
      ) : (
        <>
          {leadingIcon}
          <span>{children}</span>
          {trailingIcon}
        </>
      )}
    </button>
  );
});