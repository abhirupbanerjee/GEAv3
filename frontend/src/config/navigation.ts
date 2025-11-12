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
    label: 'Services',
    href: '/services',
    type: 'internal'
  },
  {
    label: 'Feedback',
    href: '/feedback',
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
    label: 'Git',                   
    href: config.GIT_URL,          
    type: 'external'                
  },
  {
    label: 'Helpdesk',
    href: config.HELPDESK_URL,
    type: 'external'
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
