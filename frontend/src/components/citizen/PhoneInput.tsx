/**
 * PhoneInput Component
 *
 * Phone number input with country code prefix selector.
 * Fetches allowed countries from admin settings via API.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiPhone, FiChevronDown, FiAlertCircle, FiLoader } from 'react-icons/fi';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  error?: string;
  isLoading?: boolean;
}

interface CountryCode {
  code: string;
  name: string;
  flag: string;
}

// Fallback country codes (used if API fails)
const FALLBACK_COUNTRY_CODES: CountryCode[] = [
  { code: '+1473', name: 'Grenada', flag: '🇬🇩' },
];

export function PhoneInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  error,
  isLoading = false,
}: PhoneInputProps) {
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>(FALLBACK_COUNTRY_CODES);
  const [selectedCode, setSelectedCode] = useState<CountryCode>(FALLBACK_COUNTRY_CODES[0]);
  const [localNumber, setLocalNumber] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);

  // Fetch allowed countries from API
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('/api/citizen/auth/allowed-countries');
        if (response.ok) {
          const data = await response.json();
          if (data.countries && data.countries.length > 0) {
            setCountryCodes(data.countries);
            // Set first country as default (Grenada if available)
            setSelectedCode(data.countries[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch allowed countries:', err);
        // Keep fallback countries
      } finally {
        setIsLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  // Parse initial value to extract country code and local number
  useEffect(() => {
    if (value && value.startsWith('+') && countryCodes.length > 0) {
      // Try to match against known country codes (sorted by length desc for proper matching)
      const sortedCodes = [...countryCodes].sort((a, b) => b.code.length - a.code.length);
      for (const cc of sortedCodes) {
        if (value.startsWith(cc.code)) {
          setSelectedCode(cc);
          setLocalNumber(value.substring(cc.code.length));
          return;
        }
      }
    }
  }, [countryCodes]);

  // Update parent value when country code or local number changes
  const updateValue = useCallback(() => {
    const fullNumber = `${selectedCode.code}${localNumber.replace(/\D/g, '')}`;
    onChange(fullNumber);
  }, [selectedCode, localNumber, onChange]);

  useEffect(() => {
    updateValue();
  }, [updateValue]);

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
            onClick={() => !disabled && !isLoadingCountries && setShowDropdown(!showDropdown)}
            disabled={disabled || isLoadingCountries}
            className={`flex items-center gap-1 px-3 py-2.5 border rounded-lg bg-white text-sm min-w-[120px] ${
              disabled || isLoadingCountries ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'
            } ${error ? 'border-red-300' : 'border-gray-300'}`}
          >
            {isLoadingCountries ? (
              <>
                <FiLoader className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-gray-400">Loading...</span>
              </>
            ) : (
              <>
                <span>{selectedCode.flag}</span>
                <span className="text-gray-700">{selectedCode.code}</span>
                <FiChevronDown className="w-4 h-4 text-gray-400" />
              </>
            )}
          </button>

          {/* Dropdown menu */}
          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute z-20 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {countryCodes.map((cc, index) => (
                  <button
                    key={`${cc.code}-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedCode(cc);
                      setShowDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                      cc.code === selectedCode.code && cc.name === selectedCode.name
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700'
                    }`}
                  >
                    <span>{cc.flag}</span>
                    <span className="flex-1 text-left truncate">{cc.name}</span>
                    <span className="text-gray-400 text-xs">{cc.code}</span>
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
