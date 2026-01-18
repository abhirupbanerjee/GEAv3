/**
 * Allowed Countries API
 *
 * Returns list of countries allowed for citizen registration based on admin settings.
 * Combines CITIZEN_ALLOWED_COUNTRIES (preset countries) with CITIZEN_CUSTOM_COUNTRY_CODES.
 */

import { NextResponse } from 'next/server';
import { getCitizenLoginSettings } from '@/lib/settings';

// Country data mapping - all supported countries
const COUNTRY_DATA: Record<string, { code: string; name: string; flag: string }> = {
  // Primary
  grenada: { code: '+1473', name: 'Grenada', flag: '🇬🇩' },

  // Caribbean Islands
  antigua: { code: '+1268', name: 'Antigua & Barbuda', flag: '🇦🇬' },
  barbados: { code: '+1246', name: 'Barbados', flag: '🇧🇧' },
  dominica: { code: '+1767', name: 'Dominica', flag: '🇩🇲' },
  dominican_republic: { code: '+1809', name: 'Dominican Republic', flag: '🇩🇴' },
  jamaica: { code: '+1876', name: 'Jamaica', flag: '🇯🇲' },
  st_kitts: { code: '+1869', name: 'St Kitts & Nevis', flag: '🇰🇳' },
  st_lucia: { code: '+1758', name: 'St Lucia', flag: '🇱🇨' },
  st_vincent: { code: '+1784', name: 'St Vincent & Grenadines', flag: '🇻🇨' },
  trinidad: { code: '+1868', name: 'Trinidad & Tobago', flag: '🇹🇹' },
  usvi: { code: '+1340', name: 'US Virgin Islands', flag: '🇻🇮' },
  bvi: { code: '+1284', name: 'British Virgin Islands', flag: '🇻🇬' },
  bahamas: { code: '+1242', name: 'Bahamas', flag: '🇧🇸' },
  cayman: { code: '+1345', name: 'Cayman Islands', flag: '🇰🇾' },
  turks_caicos: { code: '+1649', name: 'Turks & Caicos', flag: '🇹🇨' },
  bermuda: { code: '+1441', name: 'Bermuda', flag: '🇧🇲' },
  anguilla: { code: '+1264', name: 'Anguilla', flag: '🇦🇮' },
  montserrat: { code: '+1664', name: 'Montserrat', flag: '🇲🇸' },
  guyana: { code: '+592', name: 'Guyana', flag: '🇬🇾' },
  suriname: { code: '+597', name: 'Suriname', flag: '🇸🇷' },

  // Other Regions
  usa: { code: '+1', name: 'United States', flag: '🇺🇸' },
  uk: { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  canada: { code: '+1', name: 'Canada', flag: '🇨🇦' },
};

export interface AllowedCountry {
  code: string;
  name: string;
  flag: string;
}

export async function GET() {
  try {
    const settings = await getCitizenLoginSettings();

    if (!settings.enabled) {
      return NextResponse.json({
        enabled: false,
        countries: [],
      });
    }

    const countries: AllowedCountry[] = [];
    const addedCodes = new Set<string>();

    // Add countries from CITIZEN_ALLOWED_COUNTRIES (preset selections)
    for (const key of settings.allowedCountries) {
      const countryData = COUNTRY_DATA[key];
      if (countryData && !addedCodes.has(countryData.code)) {
        countries.push({
          code: countryData.code,
          name: countryData.name,
          flag: countryData.flag,
        });
        addedCodes.add(countryData.code);
      }
    }

    // Add custom country codes from CITIZEN_CUSTOM_COUNTRY_CODES
    // Format: "Country Name:+XX" (e.g., "India:+91,Germany:+49")
    for (const entry of settings.customCountryCodes) {
      // Check if it's in the new "Name:+XX" format
      if (entry.includes(':')) {
        const [name, code] = entry.split(':').map(s => s.trim());
        if (code && code.startsWith('+') && !addedCodes.has(code)) {
          countries.push({
            code: code,
            name: name || `Custom (${code})`,
            flag: '🌍',
          });
          addedCodes.add(code);
        }
      } else if (entry.startsWith('+') && !addedCodes.has(entry)) {
        // Legacy format: just the code (e.g., "+91")
        countries.push({
          code: entry,
          name: `Custom (${entry})`,
          flag: '🌍',
        });
        addedCodes.add(entry);
      }
    }

    // Ensure Grenada is always first if it's in the list
    const grenadaIndex = countries.findIndex(c => c.code === '+1473');
    if (grenadaIndex > 0) {
      const grenada = countries.splice(grenadaIndex, 1)[0];
      countries.unshift(grenada);
    }

    return NextResponse.json({
      enabled: true,
      countries,
    });
  } catch (error) {
    console.error('Error fetching allowed countries:', error);
    // Return fallback with just Grenada
    return NextResponse.json({
      enabled: true,
      countries: [
        { code: '+1473', name: 'Grenada', flag: '🇬🇩' },
      ],
    });
  }
}
