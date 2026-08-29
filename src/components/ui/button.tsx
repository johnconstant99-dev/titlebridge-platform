import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-opacity duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none min-h-11",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:opacity-90",
        secondary: "bg-surface text-fg shadow-[var(--shadow-border)] hover:bg-stone",
        ghost: "bg-transparent text-fg hover:bg-stone",
        danger: "bg-danger text-primary-fg hover:opacity-90",
        outline: "bg-transparent text-fg border border-border hover:bg-stone",
      },
      size: {
        default: "rounded-md px-4 text-sm",
        sm: "rounded-sm px-3 text-sm min-h-10",
        lg: "rounded-lg px-5 text-base min-h-12",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
