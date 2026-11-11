import Link from "next/link";
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

// ox_lib "Abstract" buttons: 8px radius, semibold, a gentle scale on hover.
const base =
  "group relative inline-flex select-none items-center justify-center gap-2 rounded-[8px] border font-display font-bold transition-[background,color,box-shadow,transform,border-color] duration-200 ease-in-out hover:scale-[1.04] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
const variants: Record<Variant, string> = {
  // Solid primary, black label, soft primary glow (the in-game "Confirm" button)
  primary: "border-white/[0.04] bg-accent text-black shadow-[0_0_10px_0_rgb(var(--accent-rgb))] hover:shadow-[0_0_18px_2px_rgb(var(--accent-rgb)/0.85)]",
  // Translucent white ("Cancel")
  secondary: "border-white/[0.16] bg-white/[0.16] text-white hover:bg-white/25",
  ghost: "border-transparent text-white/80 hover:bg-white/[0.08] hover:text-white",
  danger: "border-accent/50 bg-accent/15 text-accent-text hover:bg-accent hover:text-black",
  success: "border-status-online/40 bg-status-online/15 text-[#7ee2a8] hover:bg-status-online hover:text-black",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type Common = { variant?: Variant; size?: Size; className?: string; children: ReactNode };

export const Button = forwardRef<HTMLButtonElement, Common & ComponentProps<"button">>(function Button(
  { variant = "primary", size = "md", className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  external,
  ...rest
}: Common & { href: string; external?: boolean } & Omit<ComponentProps<"a">, "href">) {
  const cls = buttonClass(variant, size, className);
  if (external || /^(https?:|fivem:|mailto:)/.test(href))
    return (
      <a href={href} className={cls} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}
