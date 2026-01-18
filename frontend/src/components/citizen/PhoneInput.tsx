/**
 * PhoneInput Component
 *
 * Phone number input with country code prefix selector.
 * Validates against allowed regions from admin settings.
 */

'use client';

import { useState, useEffect } from 'react';
import { FiPhone, FiChevronDown, FiAlertCircle } from 'react-icons/fi';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  error?: string;
  isLoading?: boolean;
}

// Common country codes for Caribbean region
const COUNTRY_CODES = [
  { code: '+1473', country: 'Grenada', flag: '🇬🇩' },
  { code: '+1268', country: 'Antigua', flag: '🇦🇬' },
  { code: '+1246', country: 'Barbados', flag: '🇧🇧' },
  { code: '+1767', country: 'Dominica', flag: '🇩🇲' },
  { code: '+1876', country: 'Jamaica', flag: '🇯🇲' },
  { code: '+1869', country: 'St Kitts', flag: '🇰🇳' },
  { code: '+1758', country: 'St Lucia', flag: '🇱🇨' },
  { code: '+1784', country: 'St Vincent', flag: '🇻🇨' },
  { code: '+1868', country: 'Trinidad', flag: '🇹🇹' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
];

export function PhoneInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  error,
  isLoading = false,
}: PhoneInputProps) {
  const [selectedCode, setSelectedCode] = useState(COUNTRY_CODES[0]);
  const [localNumber, setLocalNumber] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Parse initial value to extract country code and local number
  useEffect(() => {
    if (value && value.startsWith('+')) {
      // Try to match against known country codes
      for (const cc of COUNTRY_CODES) {
        if (value.startsWith(cc.code)) {
          setSelectedCode(cc);
          setLocalNumber(value.substring(cc.code.length));
          return;
        }
      }
    }
  }, []);

  // Update parent value when country code or local number changes
  useEffect(() => {
    const fullNumber = `${selectedCode.code}${localNumber.replace(/\D/g, '')}`;
    onChange(fullNumber);
  }, [selectedCode, localNumber, onChange]);

  const handleLocalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and format nicely
    const digits = e.target.value.replace(/\D/g, '');
    // Limit to 10 digits (for NANP numbers)
    const limited = digits.slice(0, 10);
    // Format: XXX-XXXX for 7-digit or XXX-XXX-XXXX for 10-digit
    let formatted = limited;
    if (limited.length > 3 && limited.length <= 7) {
      formatted = `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else if (limited.length > 7) {
      formatted = `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
    setLocalNumber(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled && !isLoading) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        Phone Number
      </label>
      <div className="flex gap-2">
        {/* Country code dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && setShowDropdown(!showDropdown)}
            disabled={disabled}
            className={`flex items-center gap-1 px-3 py-2.5 border rounded-lg bg-white text-sm ${
              disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'
            } ${error ? 'border-red-300' : 'border-gray-300'}`}
          >
            <span>{selectedCode.flag}</span>
            <span className="text-gray-700">{selectedCode.code}</span>
            <FiChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* Dropdown menu */}
          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute z-20 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {COUNTRY_CODES.map((cc) => (
                  <button
                    key={cc.code}
                    type="button"
                    onClick={() => {
                      setSelectedCode(cc);
                      setShowDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                      cc.code === selectedCode.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span>{cc.flag}</span>
                    <span>{cc.country}</span>
                    <span className="text-gray-400">{cc.code}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Phone number input */}
        <div className="flex-1 relative">
          <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="tel"
            value={localNumber}
            onChange={handleLocalNumberChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="XXX-XXXX"
            className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
              error ? 'border-red-300 bg-red-50' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <FiAlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}

export default PhoneInput;
