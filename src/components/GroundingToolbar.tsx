'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { getExperts, getScreensForExpert, getElementsForScreen, getElement, getScreenBbox, pixelBboxToRU } from '@/lib/grounding-data';

/** Assignment of a grounding to a region */
export interface GroundingAssignment {
  regionIndex: number;
  type: 'screen' | 'element';
  expert: string;
  screen: string;
  element?: string;
  bbox: [number, number, number, number];
}

interface Props {
  /** Currently active bbox index */
  activeBboxIndex: number;
  /** Current grounding assignments (region index → assignment) */
  assignments: Map<number, GroundingAssignment>;
  /** Callback when grounding is selected - sets bbox for the active region. autoAdvance=true means advance to next region after setting */
  onElementSelect: (bbox: [number, number, number, number] | null, autoAdvance: boolean, assignment?: GroundingAssignment) => void;
  /** Callback to clear a specific region's assignment */
  onClearRegion?: (regionIndex: number) => void;
}

const REGION_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-yellow-500', 'bg-red-500'];
const REGION_TEXT_COLORS = ['text-blue-400', 'text-green-400', 'text-orange-400', 'text-purple-400', 'text-pink-400', 'text-cyan-400', 'text-yellow-400', 'text-red-400'];

/** Custom dropdown with toggle state indicators */
function CustomDropdown<T extends { id: string; label: string }>({
  items,
  value,
  onChange,
  placeholder,
  disabled,
  getAssignedRegion,
}: {
  items: T[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  getAssignedRegion?: (item: T) => number | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedItem = items.find(item => item.label === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`px-2 py-1 text-xs bg-[var(--background)] border border-[var(--card-border)] rounded focus:outline-none focus:border-[var(--primary)] disabled:opacity-50 min-w-[100px] text-left flex items-center justify-between gap-1 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={selectedItem ? 'text-white' : 'text-[var(--muted)]'}>
          {selectedItem?.label || placeholder}
        </span>
        <span className="text-[var(--muted)]">▾</span>
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[150px] bg-[var(--card)] border border-[var(--card-border)] rounded shadow-lg max-h-[200px] overflow-auto">
          <div
            className="px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--card-border)] cursor-pointer"
            onClick={() => { onChange(''); setIsOpen(false); }}
          >
            {placeholder}
          </div>
          {items.map((item) => {
            const assignedRegion = getAssignedRegion?.(item);
            const isSelected = item.label === value;
            return (
              <div
                key={item.id}
                className={`px-2 py-1 text-xs hover:bg-[var(--card-border)] cursor-pointer flex items-center gap-2 ${isSelected ? 'bg-[var(--card-border)]' : ''}`}
                onClick={() => { onChange(item.label); setIsOpen(false); }}
              >
                {assignedRegion !== null && assignedRegion !== undefined && (
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white ${REGION_COLORS[assignedRegion % REGION_COLORS.length]}`}>
                    {assignedRegion + 1}
                  </span>
                )}
                <span className={assignedRegion !== null && assignedRegion !== undefined ? REGION_TEXT_COLORS[assignedRegion % REGION_TEXT_COLORS.length] : ''}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function GroundingToolbar({ activeBboxIndex, assignments, onElementSelect, onClearRegion }: Props) {
  const [selectedExpert, setSelectedExpert] = useState<string>('');
  const [selectedScreen, setSelectedScreen] = useState<string>('');
  const [selectedElement, setSelectedElement] = useState<string>('');

  const experts = useMemo(() => getExperts(), []);

  const screens = useMemo(() => {
    if (!selectedExpert) return [];
    return getScreensForExpert(selectedExpert);
  }, [selectedExpert]);

  const elements = useMemo(() => {
    if (!selectedExpert || !selectedScreen) return [];
    return getElementsForScreen(selectedExpert, selectedScreen);
  }, [selectedExpert, selectedScreen]);

  const handleExpertChange = useCallback((value: string) => {
    setSelectedExpert(value);
    setSelectedScreen('');
    setSelectedElement('');
    onElementSelect(null, false);
  }, [onElementSelect]);

  const handleScreenChange = useCallback((value: string) => {
    setSelectedScreen(value);
    setSelectedElement('');

    // Check if this screen is already assigned to a region - toggle it off
    for (const [regionIndex, assignment] of assignments) {
      if (assignment.type === 'screen' && assignment.screen === value) {
        // Screen is already assigned - clear that region
        onClearRegion?.(regionIndex);
        setSelectedScreen('');
        return;
      }
    }

    // When screen is selected, draw the screen-level bbox and auto-advance for next element
    if (value && selectedExpert) {
      const screenBbox = getScreenBbox(selectedExpert, value);
      if (screenBbox) {
        const assignment: GroundingAssignment = {
          regionIndex: activeBboxIndex,
          type: 'screen',
          expert: selectedExpert,
          screen: value,
          bbox: screenBbox,
        };
        onElementSelect(screenBbox, true, assignment);
        return;
      }
    }
    onElementSelect(null, false);
  }, [selectedExpert, activeBboxIndex, assignments, onElementSelect, onClearRegion]);

  const handleElementChange = useCallback((value: string) => {
    setSelectedElement(value);
    if (!value || !selectedExpert || !selectedScreen) {
      return;
    }

    // Check if this element is already assigned to a region - toggle it off
    for (const [regionIndex, assignment] of assignments) {
      if (assignment.type === 'element' && assignment.element === value) {
        // Element is already assigned - clear that region
        onClearRegion?.(regionIndex);
        setSelectedElement('');
        return;
      }
    }

    // Get element data - bbox is already in desktop pixel coords
    const result = getElement(selectedExpert, selectedScreen, value);

    if (result) {
      // Convert desktop pixel bbox to RU coords
      const elementRU = pixelBboxToRU(result.element.bbox);
      const assignment: GroundingAssignment = {
        regionIndex: activeBboxIndex,
        type: 'element',
        expert: selectedExpert,
        screen: selectedScreen,
        element: value,
        bbox: elementRU,
      };
      onElementSelect(elementRU, true, assignment);
    }
  }, [selectedExpert, selectedScreen, activeBboxIndex, assignments, onElementSelect, onClearRegion]);

  const handleClear = useCallback(() => {
    setSelectedExpert('');
    setSelectedScreen('');
    setSelectedElement('');
    // Clear all region assignments
    for (const regionIndex of assignments.keys()) {
      onClearRegion?.(regionIndex);
    }
    onElementSelect(null, false);
  }, [assignments, onElementSelect, onClearRegion]);

  // Helper to find which region an element is assigned to
  const getElementAssignedRegion = useCallback((elementLabel: string): number | null => {
    for (const [regionIndex, assignment] of assignments) {
      if (assignment.type === 'element' && assignment.element === elementLabel) {
        return regionIndex;
      }
    }
    return null;
  }, [assignments]);

  // Helper to find which region a screen is assigned to
  const getScreenAssignedRegion = useCallback((screenName: string): number | null => {
    for (const [regionIndex, assignment] of assignments) {
      if (assignment.type === 'screen' && assignment.screen === screenName) {
        return regionIndex;
      }
    }
    return null;
  }, [assignments]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Expert Select */}
      <select
        value={selectedExpert}
        onChange={(e) => handleExpertChange(e.target.value)}
        className="px-2 py-1 text-xs bg-[var(--background)] border border-[var(--card-border)] rounded focus:outline-none focus:border-[var(--primary)]"
      >
        <option value="">Expert...</option>
        {experts.map((expert) => (
          <option key={expert.name} value={expert.name}>
            {expert.label}: {expert.name}
          </option>
        ))}
      </select>

      {/* Screen Select */}
      <select
        value={selectedScreen}
        onChange={(e) => handleScreenChange(e.target.value)}
        disabled={!selectedExpert || screens.length === 0}
        className="px-2 py-1 text-xs bg-[var(--background)] border border-[var(--card-border)] rounded focus:outline-none focus:border-[var(--primary)] disabled:opacity-50"
      >
        <option value="">Screen...</option>
        {screens.map((screen) => (
          <option key={screen.screenName} value={screen.screenName}>
            {screen.screenName}
          </option>
        ))}
      </select>

      {/* Element Select - Custom dropdown with toggle state */}
      <CustomDropdown
        items={elements.map(el => ({ id: el.id, label: el.label, type: el.type }))}
        value={selectedElement}
        onChange={handleElementChange}
        placeholder="Element..."
        disabled={!selectedScreen || elements.length === 0}
        getAssignedRegion={(item) => getElementAssignedRegion(item.label)}
      />

      {/* Clear button */}
      {(selectedExpert || selectedScreen || selectedElement) && (
        <button
          onClick={handleClear}
          className="px-2 py-1 text-xs text-[var(--muted)] hover:text-white transition-colors"
          title="Clear grounding selection"
        >
          Clear
        </button>
      )}

      {/* Selected element info */}
      {selectedElement && (() => {
        const colors = ['text-blue-400', 'text-green-400', 'text-orange-400', 'text-purple-400', 'text-pink-400', 'text-cyan-400', 'text-yellow-400', 'text-red-400'];
        return (
          <span className={`text-xs ml-2 ${colors[activeBboxIndex % colors.length]}`}>
            Region {activeBboxIndex + 1}: {selectedElement}
          </span>
        );
      })()}
    </div>
  );
}
