'use client';

import { useState, useCallback, useMemo } from 'react';
import { getExperts, getScreensForExpert, getElementsForScreen, getElement } from '@/lib/grounding-data';
import { bboxToRU } from '@/lib/grounding-types';

interface Props {
  /** Currently active bbox index (0, 1, or 2) */
  activeBboxIndex: 0 | 1 | 2;
  /** Callback when element is selected - sets bbox for the active region */
  onElementSelect: (bbox: [number, number, number, number] | null, imageSize: [number, number] | null) => void;
}

export function GroundingToolbar({ activeBboxIndex, onElementSelect }: Props) {
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
    onElementSelect(null, null);
  }, [onElementSelect]);

  const handleScreenChange = useCallback((value: string) => {
    setSelectedScreen(value);
    setSelectedElement('');
    onElementSelect(null, null);
  }, [onElementSelect]);

  const handleElementChange = useCallback((value: string) => {
    setSelectedElement(value);
    if (!value) {
      onElementSelect(null, null);
      return;
    }

    const result = getElement(selectedExpert, selectedScreen, value);
    if (result) {
      const ruBbox = bboxToRU(result.element.bbox, result.imageSize);
      onElementSelect(ruBbox, result.imageSize);
    }
  }, [selectedExpert, selectedScreen, onElementSelect]);

  const handleClear = useCallback(() => {
    setSelectedExpert('');
    setSelectedScreen('');
    setSelectedElement('');
    onElementSelect(null, null);
  }, [onElementSelect]);

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

      {/* Element Select */}
      <select
        value={selectedElement}
        onChange={(e) => handleElementChange(e.target.value)}
        disabled={!selectedScreen || elements.length === 0}
        className="px-2 py-1 text-xs bg-[var(--background)] border border-[var(--card-border)] rounded focus:outline-none focus:border-[var(--primary)] disabled:opacity-50"
      >
        <option value="">Element...</option>
        {elements.map((el) => (
          <option key={el.id} value={el.label}>
            {el.label} ({el.type})
          </option>
        ))}
      </select>

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
      {selectedElement && (
        <span className={`text-xs ml-2 ${activeBboxIndex === 0 ? 'text-blue-400' : activeBboxIndex === 1 ? 'text-green-400' : 'text-orange-400'}`}>
          Region {activeBboxIndex + 1}: {selectedElement}
        </span>
      )}
    </div>
  );
}
