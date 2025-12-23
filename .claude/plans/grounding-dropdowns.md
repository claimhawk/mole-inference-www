# Plan: Grounding Dropdowns Implementation

## Goal
Add expert/screen/element dropdowns to image topbar for selecting groundable elements from generators.

## Implementation Steps

### 1. Create grounding data types (`src/lib/grounding-types.ts`)
- GroundingElement interface
- ScreenAnnotation interface
- ExpertAdapter interface

### 2. Create static grounding data (`src/lib/grounding-data.ts`)
- Hard-code the grounding data from generators (simpler than API for now)
- Structure: experts -> screens -> elements with bboxes

### 3. Add GroundingToolbar component (`src/components/GroundingToolbar.tsx`)
- Expert dropdown (account-screen, calendar, login-window, etc.)
- Screen dropdown (filtered by expert)
- Element dropdown (filtered by screen, shows groundable elements)
- On element select: callback with bbox

### 4. Integrate into InferencePanel
- Add GroundingToolbar above/beside ImageDropzone
- When element selected, set as active bbox region
- Visual feedback showing selected grounding

## Files to Create/Modify
- `src/lib/grounding-types.ts` (new)
- `src/lib/grounding-data.ts` (new)
- `src/components/GroundingToolbar.tsx` (new)
- `src/components/InferencePanel.tsx` (modify)

## Related Documents
- Research: `.claude/research/grounding-dropdowns.md`
- Todos: `.claude/todos/grounding-dropdowns.md`
