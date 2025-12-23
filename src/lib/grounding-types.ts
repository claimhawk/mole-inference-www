/**
 * Grounding types for expert adapters and screen annotations.
 * Data sourced from projects/sl/generators/{generator}/config/annotation.json
 */

/** Bounding box in pixel coordinates */
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A groundable UI element from an annotation */
export interface GroundingElement {
  id: string;
  label: string;        // groundingLabel or text
  type: 'grid' | 'text' | 'button' | 'dropdown' | 'textinput' | 'other';
  bbox: BBox;
}

/** Screen annotation with its groundable elements */
export interface ScreenAnnotation {
  screenName: string;
  imageSize: [number, number];
  imagePath?: string;
  elements: GroundingElement[];
}

/** Expert adapter from adapters.yaml */
export interface ExpertAdapter {
  name: string;
  label: number;
  description?: string;
  screens: ScreenAnnotation[];
}

/** Full grounding data structure */
export interface GroundingData {
  experts: ExpertAdapter[];
}

/** Convert pixel bbox to RU coords (0-1000) for a given image size */
export function bboxToRU(
  bbox: BBox,
  imageSize: [number, number]
): [number, number, number, number] {
  const [imgWidth, imgHeight] = imageSize;
  const x1 = Math.round((bbox.x / imgWidth) * 1000);
  const y1 = Math.round((bbox.y / imgHeight) * 1000);
  const x2 = Math.round(((bbox.x + bbox.width) / imgWidth) * 1000);
  const y2 = Math.round(((bbox.y + bbox.height) / imgHeight) * 1000);
  return [x1, y1, x2, y2];
}
