
import React from 'react';
import { MagnifyingGlassIcon } from './icons/index';

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = 'Search...', className, id = 'search' }) => {
  return (
    <div className={`relative ${className || ''}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <MagnifyingGlassIcon className="h-5 w-5 text-text-secondary" aria-hidden="true" />
      </div>
      <input
        type="search"
        name={id}
        id={id}
        className="block w-full rounded-md border-0 bg-input py-2 pl-10 pr-3 text-on-input ring-1 ring-inset ring-border-default placeholder:text-text-secondary focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-colors"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};
