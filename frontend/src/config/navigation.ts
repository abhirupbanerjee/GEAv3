// ============================================
// NAVIGATION CONFIGURATION
// ============================================
// Menu structure and routing for the portal
// ============================================

// Navigation item type
export interface NavItem {
  label: string;
  href: string;
  type: 'internal' | 'external';
}

// Main navigation menu
export const navigationItems: NavItem[] = [
  {
    label: 'About',
    href: '/about',
    type: 'internal'
  },
  {
    label: 'Services',
    href: '/services',
    type: 'internal'
  },
  {
    label: 'Feedback',
    href: '/feedback',
    type: 'internal'
  }
];

// Site branding
export const siteBranding = {
  name: 'Government of Grenada',
  shortName: 'GoG',
  tagline: 'EA Portal',
  logo: '🇬🇩',
  homeUrl: '/'
};
