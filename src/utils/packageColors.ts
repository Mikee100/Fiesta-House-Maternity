// Package color mapping utility
// Each package gets a unique, visually distinct color

export const PACKAGE_COLORS: Record<string, string> = {
    'THE BLOOM': '#10B981',    // Green
    'THE MUSE': '#3B82F6',     // Blue
    'THE ICON': '#8B5CF6',     // Purple
    'THE LEGEND': '#F59E0B',   // Gold
    'THE QUEEN': '#EC4899',    // Pink
    'THE EMPRESS': '#EF4444',   // Red/Burgundy (Signature/Most Loved)
    'THE GODDESS': '#6366F1',   // Indigo/Royal Flagship
    // Title Case variations
    'The Bloom': '#10B981',
    'The Muse': '#3B82F6',
    'The Icon': '#8B5CF6',
    'The Legend': '#F59E0B',
    'The Queen': '#EC4899',
    'The Empress': '#EF4444',
    'The Goddess': '#6366F1',
    // Legacy fallbacks
    'Standard Package': '#10B981',
    'Economy Package': '#3B82F6',
    'Executive Package': '#8B5CF6',
    'Gold Package': '#F59E0B',
    'Platinum Package': '#6B7280',
    'VIP Package': '#EF4444',
    'VVIP Package': '#EC4899',
};

/**
 * Get the color for a given package name
 * Returns a default gray color if package is not found
 */
export function getPackageColor(packageName: string): string {
    return PACKAGE_COLORS[packageName] || '#9CA3AF'; // Default gray
}

/**
 * Get all package colors as an array of [packageName, color] tuples
 */
export function getAllPackageColors(): [string, string][] {
    return Object.entries(PACKAGE_COLORS);
}

/**
 * Get a lighter version of the package color for backgrounds
 */
export function getPackageColorLight(packageName: string, opacity: number = 0.1): string {
    const color = getPackageColor(packageName);
    return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
}
