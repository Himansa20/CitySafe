import type { CSSProperties } from "react";

export const theme = {
    colors: {
        bg: "#f8fafc", // slate-50
        surface: "#ffffff",
        primary: "#6366f1", // indigo-500
        primaryHover: "#4f46e5", // indigo-600
        secondary: "#64748b", // slate-500
        text: {
            primary: "#0f172a", // slate-900
            secondary: "#64748b", // slate-500
            light: "#ffffff",
        },
        border: "#e2e8f0", // slate-200
        status: {
            success: "#10b981", // emerald-500
            warning: "#f59e0b", // amber-500
            danger: "#ef4444", // red-500
            info: "#3b82f6", // blue-500
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
        }
    },

    typography: {
        fontFamily: "'Inter', sans-serif",
        sizes: {
            xs: "0.75rem",
            sm: "0.875rem",
            base: "1rem",
            lg: "1.125rem",
            xl: "1.25rem",
            "2xl": "1.5rem",
            "3xl": "1.875rem",
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
    },

    rounded: {
        sm: "0.25rem",
        DEFAULT: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        full: "9999px",
    },

    // Reusable style objects
    card: {
        background: "#ffffff",
        borderRadius: "0.75rem", // lg
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        overflow: "hidden",
    } as CSSProperties,

    input: {
        width: "100%",
        padding: "0.5rem 0.75rem",
        borderRadius: "0.375rem",
        border: "1px solid #cbd5e1", // slate-300
        fontSize: "0.875rem",
        outline: "none",
        transition: "border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out",
        backgroundColor: "#ffffff",
        color: "#0f172a",
    } as CSSProperties,

    button: {
        base: {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            fontWeight: 500,
            fontSize: "0.875rem",
            cursor: "pointer",
            transition: "all 0.2s",
            border: "none",
            outline: "none",
        } as CSSProperties,
        primary: {
            backgroundColor: "#6366f1",
            color: "#ffffff",
        } as CSSProperties,
        secondary: {
            backgroundColor: "#ffffff",
            color: "#0f172a",
            border: "1px solid #cbd5e1",
        } as CSSProperties,
        danger: {
            backgroundColor: "#ef4444",
            color: "#ffffff",
        } as CSSProperties,
        ghost: {
            backgroundColor: "transparent",
            color: "#64748b",
        } as CSSProperties,
    },

    layout: {
        pageContainer: {
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            minHeight: "100vh",
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
    }
};
