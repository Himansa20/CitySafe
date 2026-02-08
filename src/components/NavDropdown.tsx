import { useState, useRef, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { theme } from "../theme";
import { Icon, Icons } from "../icons";

type NavItem = {
    label: string;
    path: string;
    icon?: string;
    iconComponent?: ReactNode;
    description?: string;
};

type Props = {
    label: string;
    items: NavItem[];
    icon?: string;
    iconComponent?: ReactNode;
};

export default function NavDropdown({ label, items, icon, iconComponent }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    // Check if any child item is active
    const isActive = items.some((item) => location.pathname === item.path);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close on navigation
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    return (
        <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    color: isActive ? theme.colors.primary : theme.colors.text.secondary,
                    fontWeight: isActive ? 600 : 500,
                    fontSize: theme.typography.sizes.sm,
                    padding: "0.5rem",
                    borderRadius: theme.rounded.md,
                    transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                }}
            >
                {iconComponent || (icon && <span>{icon}</span>)}
                {label}
                <span
                    style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                        fontSize: "0.6rem",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <Icon icon={Icons.chevronDown} size="0.6rem" />
                </span>
            </button>

            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        marginTop: "0.5rem",
                        minWidth: "200px",
                        backgroundColor: "white",
                        borderRadius: theme.rounded.lg,
                        boxShadow: theme.shadows.lg,
                        border: `1px solid ${theme.colors.border}`,
                        overflow: "hidden",
                        zIndex: 1000,
                    }}
                >
                    {items.map((item, index) => {
                        const itemActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.75rem",
                                    padding: "0.75rem 1rem",
                                    textDecoration: "none",
                                    color: itemActive ? theme.colors.primary : theme.colors.text.primary,
                                    backgroundColor: itemActive ? "#f0f5ff" : "transparent",
                                    borderBottom: index < items.length - 1 ? `1px solid ${theme.colors.border}` : "none",
                                    transition: "background-color 0.15s",
                                }}
                                onMouseEnter={(e) => {
                                    if (!itemActive) e.currentTarget.style.backgroundColor = "#f5f5f5";
                                }}
                                onMouseLeave={(e) => {
                                    if (!itemActive) e.currentTarget.style.backgroundColor = "transparent";
                                }}
                            >
                                {(item.iconComponent || item.icon) && (
                                    <span style={{ fontSize: "1.1rem", width: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        {item.iconComponent || item.icon}
                                    </span>
                                )}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500, fontSize: theme.typography.sizes.sm }}>
                                        {item.label}
                                    </div>
                                    {item.description && (
                                        <div
                                            style={{
                                                fontSize: theme.typography.sizes.xs,
                                                color: theme.colors.text.secondary,
                                                marginTop: "2px",
                                            }}
                                        >
                                            {item.description}
                                        </div>
                                    )}
                                </div>
                                {itemActive && (
                                    <span style={{ color: theme.colors.primary, fontSize: "0.8rem", display: "flex", alignItems: "center" }}><Icon icon={Icons.check} size="0.8rem" /></span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
