import { useMemo, useState } from "react";
import type { WasteSchedule } from "../types/wasteSchedule";
import { theme } from "../theme";
import { Icon, Icons } from "../icons";

type Props = {
    schedules: WasteSchedule[];
    onScheduleClick?: (schedule: WasteSchedule) => void;
    onDateClick?: (date: Date) => void;
};

type ViewMode = "week" | "month";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ScheduleCalendar({
    schedules,
    onScheduleClick,
    onDateClick,
}: Props) {
    const [viewMode, setViewMode] = useState<ViewMode>("week");
    const [currentDate, setCurrentDate] = useState(new Date());

    // Get date range based on view mode
    const dateRange = useMemo(() => {
        const dates: Date[] = [];

        if (viewMode === "week") {
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
            startOfWeek.setHours(0, 0, 0, 0);

            for (let i = 0; i < 7; i++) {
                const d = new Date(startOfWeek);
                d.setDate(startOfWeek.getDate() + i);
                dates.push(d);
            }
        } else {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);

            // Start from Sunday of first week
            const startDate = new Date(firstDay);
            startDate.setDate(firstDay.getDate() - firstDay.getDay());

            // End on Saturday of last week
            const endDate = new Date(lastDay);
            endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                dates.push(new Date(d));
            }
        }

        return dates;
    }, [currentDate, viewMode]);

    // Group schedules by date
    const schedulesByDate = useMemo(() => {
        const map = new Map<string, WasteSchedule[]>();

        schedules.forEach((s) => {
            const date = s.scheduledDate?.toDate?.();
            if (!date) return;

            const key = date.toDateString();
            const existing = map.get(key) ?? [];
            existing.push(s);
            map.set(key, existing);
        });

        return map;
    }, [schedules]);

    const navigatePrev = () => {
        const offset = viewMode === "week" ? -7 : -30;
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + offset);
        setCurrentDate(newDate);
    };

    const navigateNext = () => {
        const offset = viewMode === "week" ? 7 : 30;
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + offset);
        setCurrentDate(newDate);
    };

    const navigateToday = () => {
        setCurrentDate(new Date());
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isCurrentMonth = (date: Date) => {
        return date.getMonth() === currentDate.getMonth();
    };

    const getHeaderText = () => {
        if (viewMode === "week") {
            const start = dateRange[0];
            const end = dateRange[6];
            return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
        }
        return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    };

    return (
        <div style={{ ...theme.card, overflow: "hidden" }}>
            {/* Header */}
            <div
                style={{
                    padding: "0.75rem 1rem",
                    borderBottom: `1px solid ${theme.colors.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#f8fafc",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                        onClick={navigatePrev}
                        style={{
                            ...theme.button.base,
                            ...theme.button.ghost,
                            padding: "0.35rem",
                        }}
                    >
                        <Icon icon={Icons.chevronLeft} size="0.75rem" />
                    </button>
                    <button
                        onClick={navigateToday}
                        style={{
                            ...theme.button.base,
                            ...theme.button.secondary,
                            padding: "0.35rem 0.75rem",
                            fontSize: theme.typography.sizes.sm,
                        }}
                    >
                        Today
                    </button>
                    <button
                        onClick={navigateNext}
                        style={{
                            ...theme.button.base,
                            ...theme.button.ghost,
                            padding: "0.35rem",
                        }}
                    >
                        <Icon icon={Icons.chevronRight} size="0.75rem" />
                    </button>
                    <span
                        style={{
                            marginLeft: "0.5rem",
                            fontWeight: 600,
                            color: theme.colors.text.primary,
                        }}
                    >
                        {getHeaderText()}
                    </span>
                </div>

                <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                        onClick={() => setViewMode("week")}
                        style={{
                            ...theme.button.base,
                            ...(viewMode === "week" ? theme.button.primary : theme.button.ghost),
                            padding: "0.35rem 0.75rem",
                            fontSize: theme.typography.sizes.sm,
                        }}
                    >
                        Week
                    </button>
                    <button
                        onClick={() => setViewMode("month")}
                        style={{
                            ...theme.button.base,
                            ...(viewMode === "month" ? theme.button.primary : theme.button.ghost),
                            padding: "0.35rem 0.75rem",
                            fontSize: theme.typography.sizes.sm,
                        }}
                    >
                        Month
                    </button>
                </div>
            </div>

            {/* Day headers */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    borderBottom: `1px solid ${theme.colors.border}`,
                }}
            >
                {DAYS.map((day) => (
                    <div
                        key={day}
                        style={{
                            padding: "0.5rem",
                            textAlign: "center",
                            fontSize: theme.typography.sizes.xs,
                            fontWeight: 600,
                            color: theme.colors.text.secondary,
                            backgroundColor: "#f8fafc",
                        }}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                }}
            >
                {dateRange.map((date, i) => {
                    const daySchedules = schedulesByDate.get(date.toDateString()) ?? [];
                    const today = isToday(date);
                    const currentMonth = isCurrentMonth(date);

                    return (
                        <div
                            key={i}
                            onClick={() => onDateClick?.(date)}
                            style={{
                                minHeight: viewMode === "week" ? "120px" : "80px",
                                padding: "0.5rem",
                                borderRight: (i + 1) % 7 !== 0 ? `1px solid ${theme.colors.border}` : undefined,
                                borderBottom: `1px solid ${theme.colors.border}`,
                                backgroundColor: today ? "#f0f5ff" : currentMonth || viewMode === "week" ? "white" : "#f8fafc",
                                cursor: onDateClick ? "pointer" : "default",
                            }}
                        >
                            {/* Date number */}
                            <div
                                style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: theme.typography.sizes.sm,
                                    fontWeight: today ? 700 : 400,
                                    color: today ? "white" : currentMonth || viewMode === "week" ? theme.colors.text.primary : theme.colors.text.secondary,
                                    backgroundColor: today ? theme.colors.primary : "transparent",
                                    marginBottom: "0.25rem",
                                }}
                            >
                                {date.getDate()}
                            </div>

                            {/* Schedules */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                {daySchedules.slice(0, viewMode === "week" ? 4 : 2).map((schedule) => (
                                    <div
                                        key={schedule.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onScheduleClick?.(schedule);
                                        }}
                                        style={{
                                            padding: "2px 4px",
                                            borderRadius: "3px",
                                            backgroundColor: schedule.status === "completed" ? "#dcfce7" : schedule.status === "cancelled" ? "#f3f4f6" : "#e0e7ff",
                                            color: schedule.status === "completed" ? "#166534" : schedule.status === "cancelled" ? "#6b7280" : theme.colors.primary,
                                            fontSize: "10px",
                                            fontWeight: 500,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {schedule.zoneName}
                                    </div>
                                ))}
                                {daySchedules.length > (viewMode === "week" ? 4 : 2) && (
                                    <div
                                        style={{
                                            fontSize: "10px",
                                            color: theme.colors.text.secondary,
                                        }}
                                    >
                                        +{daySchedules.length - (viewMode === "week" ? 4 : 2)} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
