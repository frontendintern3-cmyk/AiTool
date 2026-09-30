import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all outline-none focus-visible:border-indigo-500 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-rose-400 aria-invalid:ring-1 aria-invalid:ring-rose-400/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
