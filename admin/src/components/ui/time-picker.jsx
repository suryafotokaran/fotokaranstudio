import * as React from "react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./select"

export function TimePicker({ value, onChange, placeholder = "Select time" }) {
    // Generate time options for every 15 minutes
    const times = React.useMemo(() => {
        const slots = []
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const h = hour.toString().padStart(2, '0')
                const m = minute.toString().padStart(2, '0')
                const time24 = `${h}:${m}`

                // Format for display (12h with AM/PM)
                const period = hour >= 12 ? 'PM' : 'AM'
                const displayHour = hour % 12 === 0 ? 12 : hour % 12
                const displayTime = `${displayHour}:${m} ${period}`

                slots.push({ value: time24, label: displayTime })
            }
        }
        return slots
    }, [])

    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full h-12 rounded-xl pl-9">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
                {times.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                        {t.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
