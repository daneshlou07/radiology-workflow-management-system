import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, Navigation, Sparkles, Check, X, Building2, Map } from 'lucide-react';
import { searchMalaysianAddresses, getCurrentLocationAddress, type AddressSuggestion } from '../../services/addressService';
import { geocodeAddress } from '../../services/routingService';

interface PredictiveAddressInputProps {
  value: string;
  onChange: (value: string, details?: { lat?: number; lon?: number }) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export const PredictiveAddressInput: React.FC<PredictiveAddressInputProps> = ({
  value,
  onChange,
  placeholder = 'Type or select Malaysian address (e.g., 8, Jalan Puteri 5D/3, Cyberjaya)...',
  required = false,
  className = 'input-field',
  id = 'predictive-address-input',
  disabled = false,
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [selectedGeo, setSelectedGeo] = useState<{ lat?: number; lon?: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced address search execution
  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchMalaysianAddresses(value);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Error fetching address predictions:', err);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value]);

  // Click outside detection to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    let lat = suggestion.lat;
    let lon = suggestion.lon;

    if (!lat || !lon) {
      try {
        const geo = await geocodeAddress(suggestion.formattedAddress);
        if (geo) {
          lat = geo.lat;
          lon = geo.lon;
        }
      } catch (err) {
        console.warn('Geocoding selected suggestion failed:', err);
      }
    }

    onChange(suggestion.formattedAddress, { lat, lon });
    setSelectedGeo({ lat, lon });
    setIsOpen(false);
  };

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const location = await getCurrentLocationAddress();
      if (location) {
        onChange(location.address, { lat: location.lat, lon: location.lon });
        setSelectedGeo({ lat: location.lat, lon: location.lon });
      }
    } catch (e) {
      console.error('Failed to locate current GPS address:', e);
    } finally {
      setIsLocating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getTypeBadge = (type: AddressSuggestion['type']) => {
    switch (type) {
      case 'hospital':
        return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Hospital</span>;
      case 'landmark':
        return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Landmark</span>;
      case 'taman':
        return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Taman / Area</span>;
      default:
        return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Street</span>;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <MapPin className="absolute left-3 w-4 h-4 text-surface-400 pointer-events-none" />

        <input
          id={id}
          type="text"
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`${className} pl-9 pr-20`}
          placeholder={placeholder}
          autoComplete="off"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="w-4 h-4 text-[#0F4C42] animate-spin mr-1" />
          )}

          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 rounded-full transition-colors"
              title="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

        </div>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white/95 dark:bg-surface-900/95 backdrop-blur-md border border-surface-200 dark:border-surface-700 rounded-lg shadow-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-800 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 bg-[#F1F8F6] dark:bg-surface-800/80 flex items-center justify-between text-[11px] font-semibold text-[#0F4C42]">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#0F4C42]" /> Google Places & Malaysian Registry
            </span>
            <span className="text-[10px] text-surface-500 font-normal">{suggestions.length} matched</span>
          </div>

          {suggestions.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={item.id}
                onClick={() => handleSelectSuggestion(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`px-3.5 py-2.5 cursor-pointer flex items-start gap-2.5 transition-colors ${isSelected
                  ? 'bg-[#F1F8F6] text-[#0F4C42]'
                  : 'hover:bg-surface-50 dark:hover:bg-surface-800/60 text-surface-700 dark:text-surface-200'
                  }`}
              >
                <div className="mt-0.5 p-1 rounded-md bg-surface-100 dark:bg-surface-800 shrink-0 text-surface-500">
                  {item.type === 'hospital' ? (
                    <Building2 className="w-3.5 h-3.5 text-rose-500" />
                  ) : item.type === 'landmark' ? (
                    <Map className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5 text-[#0F4C42]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-xs font-medium truncate text-surface-900 dark:text-surface-100">
                      {item.formattedAddress}
                    </p>
                    {getTypeBadge(item.type)}
                  </div>
                  {item.postcode || item.state ? (
                    <p className="text-[11px] text-surface-400 truncate">
                      {[item.areaOrTaman, item.city, item.postcode, item.state].filter(Boolean).join(' • ')}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Geocoding Status Badge */}
      <div className="mt-1 flex items-center justify-between text-[10px] text-surface-400">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#0F4C42] inline shrink-0" />
          <span>Google Places predictions &middot; Real-time AI routing coordinates.</span>
        </span>
        {selectedGeo?.lat && selectedGeo?.lon && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
            <Check className="w-3 h-3" /> Geocoded
          </span>
        )}
      </div>
    </div>
  );
};
