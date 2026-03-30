import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs))
}

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' }>(
 ({ className, variant = 'primary', ...props }, ref) => {
  const variants = {
   primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
   secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
   danger: "bg-red-600 text-white hover:bg-red-700",
   outline: "border border-slate-200 bg-transparent hover:bg-slate-100 text-slate-900",
   ghost: "hover:bg-slate-100 hover:text-slate-900 text-slate-600"
  }
  return (
   <button
    ref={ref}
    className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2", variants[variant], className)}
    {...props}
   />
  )
 }
)
Button.displayName = "Button"

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
 ({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-xl border bg-white text-slate-950 shadow", className)} {...props} />
 )
)
Card.displayName = "Card"

export const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' }>(
 ({ className, variant = 'default', ...props }, ref) => {
  const variants = {
   default: "border-transparent bg-slate-900 text-slate-50 hover:bg-slate-900/80",
   success: "border-transparent bg-green-500 text-white hover:bg-green-600",
   warning: "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
   destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
   outline: "text-slate-950 border-slate-200 hover:bg-slate-100",
   secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200",
  }
  return (
   <div ref={ref} className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)} {...props} />
  )
 }
)
Badge.displayName = "Badge"
