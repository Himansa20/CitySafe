import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrash,
  faTriangleExclamation,
  faBus,
  faWater,
  faWheelchair,
  faTree,
  faCircle,
  faLocationDot,
  faCircleExclamation,
  faSliders,
  faMoon,
  faMap,
  faClipboardList,
  faInbox,
  faUsers,
  faBolt,
  faCamera,
  faCrosshairs,
  faCity,
  faWrench,
  faHandshake,
  faChartBar,
  faShield,
  faGear,
  faRightFromBracket,
  faPlus,
  faBell,
  faCheck,
  faMapPin,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { CSSProperties } from 'react';

// Icon wrapper component with consistent styling
type IconProps = {
  icon: IconDefinition;
  size?: string;
  color?: string;
  style?: CSSProperties;
  className?: string;
};

export function Icon({ icon, size = '1em', color, style, className }: IconProps) {
  return (
    <FontAwesomeIcon
      icon={icon}
      style={{ fontSize: size, color, ...style }}
      className={className}
    />
  );
}

// Pre-configured icon components for common use cases
export const Icons = {
  // Categories
  waste: faTrash,
  safety: faTriangleExclamation,
  transport: faBus,
  flooding: faWater,
  accessibility: faWheelchair,
  public_space: faTree,

  // Status
  statusNew: faCircle,
  statusInProgress: faCircle,
  statusResolved: faCircle,
  statusRejected: faCircle,

  // Navigation & Actions
  location: faLocationDot,
  mapPin: faMapPin,
  alert: faCircleExclamation,
  filters: faSliders,
  moon: faMoon,
  map: faMap,
  list: faClipboardList,
  inbox: faInbox,
  users: faUsers,
  bolt: faBolt,
  camera: faCamera,
  target: faCrosshairs,
  city: faCity,
  wrench: faWrench,
  handshake: faHandshake,
  chart: faChartBar,
  shield: faShield,
  gear: faGear,
  signOut: faRightFromBracket,
  plus: faPlus,
  bell: faBell,
  check: faCheck,
};

// Category icon mapping for visual enhancement (returns icon definition)
export const CATEGORY_ICON_MAP: Record<string, IconDefinition> = {
  waste: Icons.waste,
  safety: Icons.safety,
  transport: Icons.transport,
  flooding: Icons.flooding,
  accessibility: Icons.accessibility,
  public_space: Icons.public_space,
};

// Helper function to get category icon component
export function getCategoryIcon(category: string, size = '1.25rem', color?: string) {
  const icon = CATEGORY_ICON_MAP[category];
  if (!icon) return <Icon icon={Icons.mapPin} size={size} color={color} />;
  return <Icon icon={icon} size={size} color={color} />;
}

// Status colors mapping
export const STATUS_COLORS = {
  new: '#ef4444',      // red
  in_progress: '#f59e0b', // amber
  resolved: '#10b981', // green
  rejected: '#6b7280', // gray
};
