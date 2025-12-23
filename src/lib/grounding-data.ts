/**
 * Grounding data from annotator project.
 * Source: projects/sl/annotator/groundings/{screen}/annotation.json
 *
 * All bboxes are stored in PIXEL coordinates on a 1920x1080 desktop.
 * Use pixelBboxToRU() to convert to RU coords (0-1000).
 */

import type { GroundingData, GroundingElement, ScreenAnnotation, ExpertAdapter } from './grounding-types';

/** Desktop size used for all groundings */
const DESKTOP_WIDTH = 1920;
const DESKTOP_HEIGHT = 1080;

/** Convert pixel bbox {x, y, width, height} to RU coords [x1, y1, x2, y2] */
export function pixelBboxToRU(bbox: { x: number; y: number; width: number; height: number }): [number, number, number, number] {
  const x1 = Math.round((bbox.x / DESKTOP_WIDTH) * 1000);
  const y1 = Math.round((bbox.y / DESKTOP_HEIGHT) * 1000);
  const x2 = Math.round(((bbox.x + bbox.width) / DESKTOP_WIDTH) * 1000);
  const y2 = Math.round(((bbox.y + bbox.height) / DESKTOP_HEIGHT) * 1000);
  return [x1, y1, x2, y2];
}

/**
 * Static grounding data extracted from annotator groundings.
 * Bboxes are in PIXEL coords on full 1920x1080 desktop.
 */
export const GROUNDING_DATA: GroundingData = {
  experts: [
    {
      name: 'account-screen',
      label: 0,
      description: 'Account/billing screens',
      screens: [
        {
          screenName: 'account-screen',
          imageSize: [1920, 1080],
          // Screen bbox in pixel coords (left side of screen, below toolbar)
          screenBboxRU: pixelBboxToRU({ x: 0, y: 48, width: 990, height: 980 }),
          elements: [
            {
              id: 'el_account_section_nav',
              label: 'section-nav',
              type: 'grid',
              // Section nav on left side (from annotator)
              bbox: { x: 0, y: 48, width: 49, height: 408 },
            },
          ],
        },
      ],
    },
    {
      name: 'appointment',
      label: 1,
      description: 'Appointment booking screens',
      screens: [
        {
          screenName: 'appointment',
          imageSize: [1920, 1080],
          screenBboxRU: [1, 46, 1000, 956],
          elements: [
            {
              id: 'el_appointment_grid',
              label: 'appointment-grid',
              type: 'grid',
              bbox: { x: 2, y: 50, width: 1916, height: 982 },
            },
          ],
        },
      ],
    },
    {
      name: 'calendar',
      label: 2,
      description: 'Calendar/scheduling screens',
      screens: [
        {
          screenName: 'calendar',
          imageSize: [1920, 1080],
          // Calendar popup - approximate centered position
          screenBboxRU: pixelBboxToRU({ x: 576, y: 324, width: 380, height: 352 }),
          elements: [
            {
              id: 'el_calendar_grid',
              label: 'calendar',
              type: 'grid',
              bbox: { x: 577, y: 446, width: 379, height: 152 },
            },
          ],
        },
      ],
    },
    {
      name: 'chart-screen',
      label: 3,
      description: 'Patient chart/medical record screens',
      screens: [
        {
          screenName: 'chart',
          imageSize: [1920, 1080],
          screenBboxRU: [1, 44, 601, 937],
          elements: [],
        },
      ],
    },
    {
      name: 'claim-window',
      label: 4,
      description: 'Insurance claim forms',
      screens: [
        {
          screenName: 'edit-claim',
          imageSize: [1920, 1080],
          // From annotator: { x: 382, y: 81, width: 1158, height: 866 }
          screenBboxRU: pixelBboxToRU({ x: 382, y: 81, width: 1158, height: 866 }),
          elements: [
            {
              id: 'el_procedures_grid',
              label: 'procedures-grid',
              type: 'grid',
              // From annotator: { x: 383, y: 265, width: 1154, height: 200 }
              bbox: { x: 383, y: 265, width: 1154, height: 200 },
            },
            {
              id: 'el_billing_provider',
              label: 'billing-provider',
              type: 'dropdown',
              // From annotator: { x: 735, y: 182, width: 145, height: 19 }
              bbox: { x: 735, y: 182, width: 145, height: 19 },
            },
            {
              id: 'el_treating_provider',
              label: 'treating-provider',
              type: 'dropdown',
              // From annotator: { x: 734, y: 201, width: 149, height: 21 }
              bbox: { x: 734, y: 201, width: 149, height: 21 },
            },
            {
              id: 'el_send_button',
              label: 'send-button',
              type: 'button',
              // From annotator: { x: 887, y: 915, width: 84, height: 21 }
              bbox: { x: 887, y: 915, width: 84, height: 21 },
            },
          ],
        },
      ],
    },
    {
      name: 'desktop',
      label: 5,
      description: 'Desktop/home screen interactions',
      screens: [
        {
          screenName: 'desktop',
          imageSize: [1920, 1080],
          screenBboxRU: [0, 0, 1000, 1000],
          elements: [],
        },
      ],
    },
    {
      name: 'login-window',
      label: 6,
      description: 'Login/authentication screens',
      screens: [
        {
          screenName: 'login-window',
          imageSize: [1920, 1080],
          // Login window centered on desktop
          screenBboxRU: pixelBboxToRU({ x: 693, y: 314, width: 502, height: 369 }),
          elements: [
            {
              id: 'el_login_user',
              label: 'user',
              type: 'dropdown',
              bbox: { x: 763, y: 376, width: 120, height: 291 },
            },
            {
              id: 'el_login_password',
              label: 'password',
              type: 'textinput',
              bbox: { x: 966, y: 375, width: 199, height: 16 },
            },
            {
              id: 'el_login_ok',
              label: 'ok',
              type: 'button',
              bbox: { x: 1112, y: 611, width: 66, height: 21 },
            },
            {
              id: 'el_login_exit',
              label: 'exit',
              type: 'button',
              bbox: { x: 1109, y: 646, width: 72, height: 26 },
            },
          ],
        },
      ],
    },
  ],
};

/** Get all experts with screens */
export function getExperts(): ExpertAdapter[] {
  return GROUNDING_DATA.experts;
}

/** Get screens for a specific expert */
export function getScreensForExpert(expertName: string): ScreenAnnotation[] {
  const expert = GROUNDING_DATA.experts.find(e => e.name === expertName);
  return expert?.screens ?? [];
}

/** Get elements for a specific screen */
export function getElementsForScreen(expertName: string, screenName: string): GroundingElement[] {
  const screens = getScreensForExpert(expertName);
  const screen = screens.find(s => s.screenName === screenName);
  return screen?.elements ?? [];
}

/** Get a specific element by expert, screen, and element label */
export function getElement(
  expertName: string,
  screenName: string,
  elementLabel: string
): { element: GroundingElement; imageSize: [number, number] } | null {
  const screens = getScreensForExpert(expertName);
  const screen = screens.find(s => s.screenName === screenName);
  if (!screen) return null;
  const element = screen.elements.find(e => e.label === elementLabel);
  if (!element) return null;
  return { element, imageSize: screen.imageSize };
}

/** Get the screen-level bbox in RU coords for a specific screen */
export function getScreenBbox(
  expertName: string,
  screenName: string
): [number, number, number, number] | null {
  const screens = getScreensForExpert(expertName);
  const screen = screens.find(s => s.screenName === screenName);
  return screen?.screenBboxRU ?? null;
}
