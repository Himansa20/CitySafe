import type { WasteSchedule } from "../types/wasteSchedule";
import { RECURRENCE_LABELS, STATUS_LABELS } from "../types/wasteSchedule";
import { theme } from "../theme";

type Props = {
    schedule: WasteSchedule;
    onEdit?: () => void;
    onDelete?: () => void;
    onStatusChange?: (status: WasteSchedule["status"]) => void;
    showActions?: boolean;
};

const STATUS_COLORS: Record<WasteSchedule["status"], string> = {
    scheduled: theme.colors.status.info,
    in_progress: theme.colors.status.warning,
    completed: theme.colors.status.success,
    cancelled: theme.colors.text.secondary,
};

export default function ScheduleCard({
    schedule,
    onEdit,
    onDelete,
    onStatusChange,
    showActions = false,
}: Props) {
    const scheduledDate = schedule.scheduledDate?.toDate?.() ?? new Date();
    const isPast = scheduledDate < new Date() && schedule.status === "scheduled";

    return (
        <div
            style={{
                ...theme.card,
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                }}
            >
                <div>
                    <h3
                        style={{
                            margin: 0,
                            fontSize: theme.typography.sizes.base,
                            fontWeight: 600,
                            color: theme.colors.text.primary,
                        }}
                    >
                        {schedule.title}
                    </h3>
                    <span
                        style={{
                            fontSize: theme.typography.sizes.sm,
                            color: theme.colors.text.secondary,
                        }}
                    >
                        {schedule.zoneName}
                    </span>
                </div>

                {/* Status badge */}
                <span
                    style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: theme.rounded.full,
                        backgroundColor: `${STATUS_COLORS[schedule.status]}20`,
                        color: STATUS_COLORS[schedule.status],
                        fontSize: theme.typography.sizes.xs,
                        fontWeight: 600,
                    }}
                >
                    {STATUS_LABELS[schedule.status]}
                </span>
            </div>

            {/* Description */}
            {schedule.description && (
                <p
                    style={{
                        margin: 0,
                        fontSize: theme.typography.sizes.sm,
                        color: theme.colors.text.secondary,
                        lineHeight: 1.5,
                    }}
                >
                    {schedule.description}
                </p>
            )}

            {/* Details */}
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "1rem",
                    fontSize: theme.typography.sizes.sm,
                }}
            >
                <div>
                    <span style={{ color: theme.colors.text.secondary }}>Date: </span>
                    <span
                        style={{
                            color: isPast ? theme.colors.status.danger : theme.colors.text.primary,
                            fontWeight: 500,
                        }}
                    >
                        {scheduledDate.toLocaleDateString()} {scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isPast && (
                        <span
                            style={{
                                marginLeft: "0.5rem",
                                color: theme.colors.status.danger,
                                fontSize: theme.typography.sizes.xs,
                            }}
                        >
                            (Overdue)
                        </span>
                    )}
                </div>

                <div>
                    <span style={{ color: theme.colors.text.secondary }}>Recurrence: </span>
                    <span style={{ color: theme.colors.text.primary }}>
                        {RECURRENCE_LABELS[schedule.recurrence]}
                    </span>
                </div>

                <div>
                    <span style={{ color: theme.colors.text.secondary }}>Duration: </span>
                    <span style={{ color: theme.colors.text.primary }}>
                        {schedule.estimatedDuration} min
                    </span>
                </div>

                {schedule.assignedTeam && (
                    <div>
                        <span style={{ color: theme.colors.text.secondary }}>Team: </span>
                        <span style={{ color: theme.colors.text.primary }}>
                            {schedule.assignedTeam}
                        </span>
                    </div>
                )}
            </div>

            {/* Actions */}
            {showActions && (
                <div
                    style={{
                        display: "flex",
                        gap: "0.5rem",
                        marginTop: "0.5rem",
                        paddingTop: "0.75rem",
                        borderTop: `1px solid ${theme.colors.border}`,
                    }}
                >
                    {onStatusChange && schedule.status === "scheduled" && (
                        <button
                            onClick={() => onStatusChange("in_progress")}
                            style={{
                                ...theme.button.base,
                                backgroundColor: theme.colors.status.warning,
                                color: "white",
                                padding: "0.4rem 0.75rem",
                                fontSize: theme.typography.sizes.sm,
                            }}
                        >
                            Start
                        </button>
                    )}

                    {onStatusChange && schedule.status === "in_progress" && (
                        <button
                            onClick={() => onStatusChange("completed")}
                            style={{
                                ...theme.button.base,
                                backgroundColor: theme.colors.status.success,
                                color: "white",
                                padding: "0.4rem 0.75rem",
                                fontSize: theme.typography.sizes.sm,
                            }}
                        >
                            Complete
                        </button>
                    )}

                    {onEdit && (
                        <button
                            onClick={onEdit}
                            style={{
                                ...theme.button.base,
                                ...theme.button.secondary,
                                padding: "0.4rem 0.75rem",
                                fontSize: theme.typography.sizes.sm,
                            }}
                        >
                            Edit
                        </button>
                    )}

                    {onDelete && (
                        <button
                            onClick={onDelete}
                            style={{
                                ...theme.button.base,
                                ...theme.button.danger,
                                padding: "0.4rem 0.75rem",
                                fontSize: theme.typography.sizes.sm,
                            }}
                        >
                            Delete
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
