import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-xs active:bg-[#1e40af]",
        outline:
          "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800",
        secondary:
          "bg-[#f1f5f9] text-[#1e293b] border border-[#cbd5e1] hover:bg-[#e2e8f0] active:bg-[#cbd5e1]",
        ghost:
          "hover:bg-slate-100 text-slate-700 hover:text-slate-900 dark:hover:bg-slate-800 dark:text-slate-300",
        destructive:
          "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 active:bg-rose-200",
        link: "text-[#2563eb] underline-offset-4 hover:underline",
        pillActive:
          "rounded-full px-3 py-1.5 text-xs font-extrabold bg-blue-50/90 text-blue-600 border border-blue-200/80 shadow-2xs",
        pillInactive:
          "rounded-full px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent",
      },
      size: {
        default:
          "h-9 gap-2 px-3.5",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7.5 gap-1.5 rounded-lg px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2.5 px-6 text-sm font-semibold rounded-xl",
        icon: "size-9 rounded-xl",
        "icon-xs":
          "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7.5 rounded-lg",
        "icon-lg": "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
