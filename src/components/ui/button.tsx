import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" }>(function Button({ className, variant = "primary", ...props }, ref) {
  return <button ref={ref} className={cn("button", `button-${variant}`, className)} {...props} />;
});
