'use client';

import { useState, useCallback, useMemo } from 'react';
import { getExperts, getScreensForExpert, getElementsForScreen, getElement, getScreenBbox } from '@/lib/grounding-data';
import type { BBox } from '@/lib/grounding-types';

/** Transform element bbox (in pixel coords relative to screen) to RU coords on full desktop */
function transformElementToDesktop(
  elementBbox: BBox,
  screenImageSize: [number, number],
  screenBboxRU: [number, number, number, number]
): [number, number, number, number] {
  const [screenX1, screenY1, screenX2, screenY2] = screenBboxRU;
  const screenWidth = screenX2 - screenX1;
  const screenHeight = screenY2 - screenY1;
  const [imgWidth, imgHeight] = screenImageSize;

  // Convert element pixel coords to percentage of screen image
  const elX1Pct = elementBbox.x / imgWidth;
  const elY1Pct = elementBbox.y / imgHeight;
  const elX2Pct = (elementBbox.x + elementBbox.width) / imgWidth;
  const elY2Pct = (elementBbox.y + elementBbox.height) / imgHeight;

  // Transform to desktop RU coords
  const x1 = Math.round(screenX1 + elX1Pct * screenWidth);
  const y1 = Math.round(screenY1 + elY1Pct * screenHeight);
  const x2 = Math.round(screenX1 + elX2Pct * screenWidth);
  const y2 = Math.round(screenY1 + elY2Pct * screenHeight);

  return [x1, y1, x2, y2];
}

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

    // When screen is selected, draw the screen-level bbox
    if (value && selectedExpert) {
      const screenBbox = getScreenBbox(selectedExpert, value);
      if (screenBbox) {
        onElementSelect(screenBbox, null);
        return;
      }
    }
    onElementSelect(null, null);
  }, [selectedExpert, onElementSelect]);

  const handleElementChange = useCallback((value: string) => {
    setSelectedElement(value);
    if (!value || !selectedExpert || !selectedScreen) {
      return;
    }

    // Get element and screen data
    const result = getElement(selectedExpert, selectedScreen, value);
    const screenBbox = getScreenBbox(selectedExpert, selectedScreen);

    if (result && screenBbox) {
      // Transform element bbox to desktop coordinates
      const elementDesktopBbox = transformElementToDesktop(
        result.element.bbox,
        result.imageSize,
        screenBbox
      );
      onElementSelect(elementDesktopBbox, null);
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
