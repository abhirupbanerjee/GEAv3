'use client'

import { useState, Fragment } from 'react'
import { Combobox } from '@headlessui/react'
import { FiChevronDown, FiCheck } from 'react-icons/fi'

interface Option {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  label?: string
  emptyMessage?: string
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  required = false,
  className = '',
  label,
  emptyMessage = 'No results found'
}: SearchableSelectProps) {
  const [query, setQuery] = useState('')

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) =>
          option.label
            .toLowerCase()
            .replace(/\s+/g, '')
            .includes(query.toLowerCase().replace(/\s+/g, ''))
        )

  return (
    <Combobox value={value} onChange={onChange} disabled={disabled}>
      <div className={`relative ${className}`}>
        {label && (
          <Combobox.Label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </Combobox.Label>
        )}

        <div className="relative">
          <Combobox.Input
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-600"
            displayValue={(val: string) => {
              const option = options.find(o => o.value === val)
              return option?.label ?? ''
            }}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />

          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
            <FiChevronDown
              className="h-4 w-4 text-gray-400"
              aria-hidden="true"
            />
          </Combobox.Button>

          {/* Hidden input for form validation */}
          {required && (
            <input
              type="hidden"
              value={value}
              required
              onChange={() => {}}
            />
          )}
        </div>

        <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white border border-gray-200 shadow-lg py-1">
          {filteredOptions.length === 0 && query !== '' ? (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-500 text-sm">
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <Combobox.Option
                key={option.value}
                value={option.value}
                as={Fragment}
              >
                {({ active, selected }) => (
                  <li
                    className={`relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`}
                  >
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`} title={option.label}>
                      {option.label}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                        <FiCheck className="h-4 w-4" aria-hidden="true" />
                      </span>
                    ) : null}
                  </li>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </div>
    </Combobox>
  )
}
