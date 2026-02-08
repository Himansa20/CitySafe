import type { CSSProperties } from "react";

export const theme = {
    colors: {
        bg: "#f8fafc", // slate-50
        bgDark: "#0f172a", // slate-900
        surface: "#ffffff",
        surfaceHover: "#f1f5f9", // slate-100
        primary: "#6366f1", // indigo-500
        primaryHover: "#4f46e5", // indigo-600
        primaryLight: "#e0e7ff", // indigo-100
        secondary: "#64748b", // slate-500
        accent: "#8b5cf6", // violet-500
        text: {
            primary: "#0f172a", // slate-900
            secondary: "#64748b", // slate-500
            muted: "#94a3b8", // slate-400
            light: "#ffffff",
        },
        border: "#e2e8f0", // slate-200
        borderLight: "#f1f5f9", // slate-100
        status: {
            success: "#10b981", // emerald-500
            successLight: "#d1fae5", // emerald-100
            warning: "#f59e0b", // amber-500
            warningLight: "#fef3c7", // amber-100
            danger: "#ef4444", // red-500
            dangerLight: "#fee2e2", // red-100
            info: "#3b82f6", // blue-500
            infoLight: "#dbeafe", // blue-100
        },
        category: {
            waste: "#78350f", // amber-900 (for contrast/feel)
            wasteBg: "#fef3c7", // amber-100
            safety: "#991b1b", // red-800
            safetyBg: "#fee2e2", // red-100
            transport: "#1e40af", // blue-800
            transportBg: "#dbeafe", // blue-100
            flooding: "#0e7490", // cyan-700
            floodingBg: "#cffafe", // cyan-100
            accessibility: "#5b21b6", // violet-800
            accessibilityBg: "#ede9fe", // violet-100
            public_space: "#166534", // green-800
            public_spaceBg: "#dcfce7", // green-100
        },
        gradients: {
            primary: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            success: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
            warm: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
            dark: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        }
    },

    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        sizes: {
            xs: "0.75rem",
            sm: "0.875rem",
            base: "1rem",
            lg: "1.125rem",
            xl: "1.25rem",
            "2xl": "1.5rem",
            "3xl": "1.875rem",
            "4xl": "2.25rem",
        },
        weights: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
            extrabold: 800,
        }
    },

    shadows: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        default: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        glow: "0 0 20px rgba(99, 102, 241, 0.3)",
        inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
    },

    rounded: {
        none: "0",
        sm: "0.25rem",
        DEFAULT: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
        full: "9999px",
    },

    transitions: {
        fast: "all 0.15s ease",
        default: "all 0.2s ease",
        slow: "all 0.3s ease",
        spring: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
    },

    // Reusable style objects
    card: {
        background: "#ffffff",
        borderRadius: "1rem", // xl
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        overflow: "hidden",
    } as CSSProperties,

    cardHover: {
        background: "#ffffff",
        borderRadius: "1rem",
        border: "1px solid #e2e8f0",
        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        overflow: "hidden",
        transform: "translateY(-2px)",
    } as CSSProperties,

    glass: {
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "1rem",
    } as CSSProperties,

    glassDark: {
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "1rem",
    } as CSSProperties,

    input: {
        width: "100%",
        padding: "0.625rem 0.875rem",
        borderRadius: "0.5rem",
        border: "1px solid #e2e8f0", // slate-200
        fontSize: "0.875rem",
        outline: "none",
        transition: "border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out",
        backgroundColor: "#ffffff",
        color: "#0f172a",
    } as CSSProperties,

    inputFocus: {
        borderColor: "#6366f1",
        boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.1)",
    } as CSSProperties,

    button: {
        base: {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.25rem",
            borderRadius: "0.5rem",
            fontWeight: 500,
            fontSize: "0.875rem",
            cursor: "pointer",
            transition: "all 0.2s",
            border: "none",
            outline: "none",
        } as CSSProperties,
        primary: {
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: "#ffffff",
            boxShadow: "0 2px 4px rgba(99, 102, 241, 0.3)",
        } as CSSProperties,
        secondary: {
            backgroundColor: "#ffffff",
            color: "#0f172a",
            border: "1px solid #e2e8f0",
        } as CSSProperties,
        success: {
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#ffffff",
            boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)",
        } as CSSProperties,
        danger: {
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "#ffffff",
            boxShadow: "0 2px 4px rgba(239, 68, 68, 0.3)",
        } as CSSProperties,
        ghost: {
            backgroundColor: "transparent",
            color: "#64748b",
        } as CSSProperties,
    },

    chip: {
        base: {
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.375rem 0.75rem",
            borderRadius: "9999px",
            fontSize: "0.75rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s",
            border: "1px solid transparent",
        } as CSSProperties,
        active: {
            backgroundColor: "#e0e7ff",
            color: "#4f46e5",
            borderColor: "#6366f1",
        } as CSSProperties,
        inactive: {
            backgroundColor: "#f8fafc",
            color: "#64748b",
            borderColor: "#e2e8f0",
        } as CSSProperties,
    },

    badge: {
        base: {
            display: "inline-flex",
            alignItems: "center",
            padding: "0.25rem 0.625rem",
            borderRadius: "9999px",
            fontSize: "0.75rem",
            fontWeight: 600,
        } as CSSProperties,
    },

    layout: {
        pageContainer: {
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            minHeight: "calc(100vh - 60px)",
        } as CSSProperties,
        flexCenter: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        } as CSSProperties,
        flexBetween: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
        } as CSSProperties,
        flexCol: {
            display: "flex",
            flexDirection: "column",
        } as CSSProperties,
        grid2Col: {
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: "1.5rem",
        } as CSSProperties,
    }
};

// Category icon mapping for visual enhancement
export const CATEGORY_ICONS: Record<string, string> = {
    waste: "🗑️",
    safety: "⚠️",
    transport: "🚌",
    flooding: "🌊",
    accessibility: "♿",
    public_space: "🏞️",
};

// Status icon mapping
export const STATUS_ICONS: Record<string, string> = {
    new: "🔴",
    in_progress: "🟡",
    resolved: "🟢",
    rejected: "⚫",
};
