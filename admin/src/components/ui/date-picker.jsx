import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { cn } from "../../lib/utils"

export function DatePicker({ value, onChange, placeholder = "Pick a date", className }) {
    const [open, setOpen] = React.useState(false)
    const selected = value ? new Date(value + "T00:00:00") : undefined

    function handleSelect(date) {
        if (date) {
            const formatted = format(date, "yyyy-MM-dd")
            onChange(formatted)
        } else {
            onChange("")
        }
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "w-full flex items-center gap-2 h-12 px-4 bg-white border border-gray-200 rounded-xl text-left text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all cursor-pointer",
                        !selected && "text-gray-600",
                        className
                    )}
                >
                    <CalendarIcon className="w-4 h-4 text-gray-600 shrink-0" />
                    {selected ? (
                        <span className="text-gray-900">{format(selected, "PPP")}</span>
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={handleSelect}
                    autoFocus
                />
            </PopoverContent>
        </Popover>
    )
}
