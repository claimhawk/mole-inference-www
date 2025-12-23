/**
 * Grounding data from generators.
 * Source: projects/sl/generators/{generator}/config/annotation.json
 */

import type { GroundingData, GroundingElement, ScreenAnnotation, ExpertAdapter } from './grounding-types';

/**
 * Static grounding data extracted from generator annotations.
 * This is loaded at build time - no API needed.
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
          imageSize: [940, 931],
          // Screen bbox on full desktop (1920x1080) in RU coords
          screenBboxRU: [0, 44, 515, 953],
          elements: [
            {
              id: 'el_1765893610900',
              label: 'communications-log',
              type: 'grid',
              bbox: { x: 5, y: 342, width: 747, height: 587 },
            },
            {
              id: 'el_1765893732514',
              label: 'patient-account',
              type: 'grid',
              bbox: { x: 6, y: 77, width: 744, height: 240 },
            },
            {
              id: 'el_1765893821631',
              label: 'select-patient',
              type: 'grid',
              bbox: { x: 756, y: 203, width: 177, height: 162 },
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
          imageSize: [2768, 1572],
          screenBboxRU: [1, 46, 1000, 956],
          elements: [
            {
              id: 'el_appointment_grid',
              label: 'appointment-grid',
              type: 'grid',
              bbox: { x: 0, y: 0, width: 2768, height: 1572 },
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
          imageSize: [380, 352],
          // Calendar is a small popup - approximate position
          screenBboxRU: [300, 300, 500, 630],
          elements: [
            {
              id: 'el_1765038341364',
              label: 'calendar',
              type: 'grid',
              bbox: { x: 1, y: 122, width: 379, height: 152 },
            },
            {
              id: 'el_1765038596465',
              label: 'top-back-year',
              type: 'button',
              bbox: { x: 3, y: 56, width: 34, height: 25 },
            },
            {
              id: 'el_1765038619294',
              label: 'top-back-month',
              type: 'button',
              bbox: { x: 47, y: 57, width: 37, height: 23 },
            },
            {
              id: 'el_1765038635498',
              label: 'top-forward-month',
              type: 'button',
              bbox: { x: 299, y: 55, width: 37, height: 25 },
            },
            {
              id: 'el_1765038653081',
              label: 'top-forward-year',
              type: 'button',
              bbox: { x: 345, y: 57, width: 35, height: 23 },
            },
            {
              id: 'el_1765038665876',
              label: 'bottom-back-month',
              type: 'button',
              bbox: { x: 3, y: 315, width: 29, height: 34 },
            },
            {
              id: 'el_1765038685353',
              label: 'bottom-back-week',
              type: 'button',
              bbox: { x: 35, y: 314, width: 30, height: 34 },
            },
            {
              id: 'el_1765038694763',
              label: 'bottom-back-day',
              type: 'button',
              bbox: { x: 68, y: 314, width: 29, height: 34 },
            },
            {
              id: 'el_1765038704494',
              label: 'bottom-today',
              type: 'button',
              bbox: { x: 100, y: 314, width: 71, height: 35 },
            },
            {
              id: 'el_1765038715158',
              label: 'bottom-forward-day',
              type: 'button',
              bbox: { x: 174, y: 314, width: 28, height: 34 },
            },
            {
              id: 'el_1765038726990',
              label: 'bottom-forward-week',
              type: 'button',
              bbox: { x: 204, y: 315, width: 31, height: 33 },
            },
            {
              id: 'el_1765038740123',
              label: 'bottom-forward-month',
              type: 'button',
              bbox: { x: 238, y: 315, width: 29, height: 33 },
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
          imageSize: [1152, 964],
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
          imageSize: [1159, 865],
          screenBboxRU: [198, 75, 802, 876],
          elements: [
            {
              id: 'el_billing_provider',
              label: 'billing-provider',
              type: 'dropdown',
              bbox: { x: 100, y: 50, width: 200, height: 30 },
            },
            {
              id: 'el_treating_provider',
              label: 'treating-provider',
              type: 'dropdown',
              bbox: { x: 100, y: 100, width: 200, height: 30 },
            },
            {
              id: 'el_claim_form',
              label: 'claim-form',
              type: 'grid',
              bbox: { x: 50, y: 150, width: 700, height: 400 },
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
          // Full screen
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
          imageSize: [502, 369],
          screenBboxRU: [361, 291, 639, 657],
          elements: [
            {
              id: 'el_1764278532765',
              label: 'user',
              type: 'dropdown',
              bbox: { x: 70, y: 62, width: 120, height: 291 },
            },
            {
              id: 'el_1764278671022',
              label: 'password',
              type: 'textinput',
              bbox: { x: 273, y: 61, width: 199, height: 16 },
            },
            {
              id: 'el_1764278692000',
              label: 'ok',
              type: 'button',
              bbox: { x: 419, y: 297, width: 66, height: 21 },
            },
            {
              id: 'el_1764278702048',
              label: 'exit',
              type: 'button',
              bbox: { x: 416, y: 332, width: 72, height: 26 },
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
