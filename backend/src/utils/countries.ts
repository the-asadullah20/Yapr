/**
 * Static ISO 3166-1 alpha-2 country list for profile country selection
 */
export interface Country {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' },
];

export function getCountryByCode(code: string): Country {
  return COUNTRIES.find((c) => c.code.toUpperCase() === code.toUpperCase()) || {
    code: code.toUpperCase(),
    name: code.toUpperCase(),
    flag: '🌐',
  };
}
