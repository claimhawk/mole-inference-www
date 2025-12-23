# Research: Grounding Dropdowns for Agent Playground

## Data Sources

### 1. Adapters (Expert Labels)
- **Location**: `/Users/michaeloneal/development/claimhawk/config/adapters.yaml`
- **Format**: YAML with `experts` array containing `name`, `label`, `description`

### 2. Generator Annotations
- **Location**: `projects/sl/generators/{generator-name}/config/annotation.json`
- **Fallback**: `projects/sl/generators/{generator-name}/assets/annotations/annotation.json`

### 3. Annotation Schema
```json
{
  "screenName": "string",
  "imageSize": [width, height],
  "elements": [
    {
      "id": "el_TIMESTAMP",
      "type": "grid|text|button|dropdown|textinput",
      "bbox": { "x": int, "y": int, "width": int, "height": int },
      "grounding": boolean,
      "groundingLabel": "element-name",
      "text": "display-name"
    }
  ]
}
```

### 4. Generators Found
| Generator | Adapter Label | Groundable Elements |
|-----------|--------------|---------------------|
| account-screen-generator | 0 | communications-log, patient-account, select-patient |
| appointment-generator | 1 | full-appointment (grid) |
| calendar-generator | 2 | calendar, nav buttons |
| chart-screen-generator | 3 | TBD |
| claim-window-generator | 4 | billing_provider, treating_provider, claim_form |
| desktop-generator | 5 | TBD |
| login-window-generator | 6 | user, password, ok, exit |

## Implementation Approach

1. Create API endpoint to serve grounding data
2. Load adapters.yaml + all annotation.json files at build/runtime
3. Build cascading dropdown: Expert -> Screen -> Element
4. When element selected, draw bbox on image and set as crop region
