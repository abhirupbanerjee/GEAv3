// ============================================
// NAVIGATION CONFIGURATION
// ============================================
// Menu structure and routing for the portal
// ============================================

import { config } from './env';

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
    label: 'Repository',
    href: config.DMS_URL,
    type: 'external'
  },
  {
    label: 'Wiki',
    href: config.WIKI_URL,
    type: 'external'
  },
  {
    label: 'Services',
    href: config.SERVICES_URL,
    type: 'external'
  }
];

// Site branding
export const siteBranding = {
  name: 'Government of Grenada',
  shortName: 'GoG',
  tagline: 'EA Portal',
  logo: '🇬🇩', // Grenada flag emoji (can be replaced with image)
  homeUrl: '/'
};
