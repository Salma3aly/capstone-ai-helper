import { COMPONENTS } from "./components";

export const ACTUATOR_IDS = new Set([
  "led", "rgb-led", "ws2812b", "buzzer", "servo-sg90", "stepper",
  "nema-17", "dc-motor", "relay", "water-pump", "solenoid-lock",
  "vibration-motor",
]);

const ACTUATOR_CATEGORIES = new Set(["Output & Display", "Power & Control"]);

/**
 * Keywords that, when present in a core feature string, imply the feature
 * needs a physical output component (actuator) — not just a sensor.
 */
export const ACTION_KEYWORDS = [
  "water", "pump", "irrigate", "sprinkler",
  "motor", "rotate", "spin", "move",
  "light", "illuminate", "glow", "blink", "led",
  "alarm", "buzzer", "beep", "sound", "siren",
  "heat", "cool", "fan", "temperature control",
  "lock", "unlock", "solenoid", "valve",
  "open", "close", "dispense",
  "trigger", "activate", "actuate", "drive",
  "display", "show", "indicate",
  "pulse", "vibrate", "shake",
];

function isActuatorById(id: string): boolean {
  if (ACTUATOR_IDS.has(id)) return true;
  const comp = COMPONENTS.find((c) => c.id === id);
  return comp ? ACTUATOR_CATEGORIES.has(comp.category) : false;
}

export function hasAnyActuator(selectedIds: string[]): boolean {
  return selectedIds.some((id) => {
    if (id.startsWith("ram-")) return false;
    return isActuatorById(id);
  });
}

export function findActionFeaturesWithoutActuators(
  coreFeatures: string[],
  selectedIds: string[]
): { feature: string; matchedKeyword: string }[] {
  if (hasAnyActuator(selectedIds)) return [];
  const results: { feature: string; matchedKeyword: string }[] = [];
  for (const feature of coreFeatures) {
    const lower = feature.toLowerCase();
    for (const kw of ACTION_KEYWORDS) {
      if (lower.includes(kw)) {
        results.push({ feature, matchedKeyword: kw });
        break;
      }
    }
  }
  return results;
}

/**
 * Check if generated code contains control-logic statements for each actuator
 * present in the wiring. Returns missing actuators that have no corresponding
 * digitalWrite/analogWrite/pinMode call.
 */
export function findMissingControlLogic(
  code: string,
  wiring: { component: string; connections: string[] }[]
): string[] {
  const codeLower = code.toLowerCase();
  const missing: string[] = [];

  const controlPatterns = [
    /digitalwrite\s*\(/i,
    /analogwrite\s*\(/i,
    /pinmode\s*\(/i,
    /\.write\s*\(/i,
    /\.writeMicroseconds\s*\(/i,
    /\.servoWrite\s*\(/i,
    /pwm\s*\(/i,
    /setPwm\s*\(/i,
    /ledcWrite\s*\(/i,
    /digitalio\.value\s*=/i,
    /i2c\.write\s*\(/i,
    /spi\.write\s*\(/i,
  ];

  const hasControlCode = controlPatterns.some((p) => p.test(codeLower));

  // If there are actuators in wiring but NOT a single control call, flag each
  if (!hasControlCode) {
    for (const item of wiring) {
      const compLower = item.component.toLowerCase();
      if (ACTUATOR_KEYWORDS.some((kw) => compLower.includes(kw))) {
        missing.push(item.component);
      }
    }
    return missing;
  }

  return missing;
}

const ACTUATOR_KEYWORDS = [
  "led", "buzzer", "relay", "motor", "pump", "solenoid", "servo",
  "stepper", "lcd", "oled", "display", "fan", "valve", "lamp",
  "light", "heater", "lock",
];

/**
 * Map common actuator label patterns from architecture diagram nodes
 * to corresponding catalog component IDs.
 */
const NODE_LABEL_TO_COMPONENT: { pattern: RegExp; componentId: string }[] = [
  { pattern: /\b(pump|water.?pump)\b/i, componentId: "water-pump" },
  { pattern: /\b(solenoid|lock|valve)\b/i, componentId: "solenoid-lock" },
  { pattern: /\b(relay)\b/i, componentId: "relay" },
  { pattern: /\b(motor|dc.?motor|stepper)\b/i, componentId: "dc-motor" },
  { pattern: /\b(servo)\b/i, componentId: "servo-sg90" },
  { pattern: /\b(led|rgb.?led)\b/i, componentId: "led" },
  { pattern: /\b(buzzer|speaker|alarm|siren)\b/i, componentId: "buzzer" },
  { pattern: /\b(fan)\b/i, componentId: "dc-motor" },
  { pattern: /\b(vibrator|vibration)\b/i, componentId: "vibration-motor" },
  { pattern: /\b(heater|heating|element)\b/i, componentId: "relay" },
];

/**
 * Map analysis core_feature keywords to catalog component IDs.
 */
const FEATURE_KEYWORD_TO_COMPONENT: { keyword: string; componentId: string }[] = [
  { keyword: "water", componentId: "water-pump" },
  { keyword: "pump", componentId: "water-pump" },
  { keyword: "irrigate", componentId: "water-pump" },
  { keyword: "sprinkler", componentId: "water-pump" },
  { keyword: "motor", componentId: "dc-motor" },
  { keyword: "rotate", componentId: "dc-motor" },
  { keyword: "spin", componentId: "dc-motor" },
  { keyword: "move", componentId: "servo-sg90" },
  { keyword: "lock", componentId: "solenoid-lock" },
  { keyword: "unlock", componentId: "solenoid-lock" },
  { keyword: "solenoid", componentId: "solenoid-lock" },
  { keyword: "valve", componentId: "solenoid-lock" },
  { keyword: "alarm", componentId: "buzzer" },
  { keyword: "buzzer", componentId: "buzzer" },
  { keyword: "heat", componentId: "relay" },
  { keyword: "cool", componentId: "relay" },
  { keyword: "fan", componentId: "dc-motor" },
  { keyword: "light", componentId: "led" },
  { keyword: "illuminate", componentId: "led" },
  { keyword: "blink", componentId: "led" },
  { keyword: "display", componentId: "led" },
  { keyword: "vibrate", componentId: "vibration-motor" },
];

/**
 * Scan architecture diagram nodes for actuator-like labels and return
 * those that are NOT present in the selected hardware IDs.
 */
export function findActuatorNodesMissingFromHardware(
  nodes: { id: string; label: string }[],
  selectedIds: string[]
): { label: string; suggestedComponentId: string }[] {
  const result: { label: string; suggestedComponentId: string }[] = [];
  const seen = new Set<string>();
  for (const node of nodes) {
    const label = node.label;
    for (const entry of NODE_LABEL_TO_COMPONENT) {
      if (entry.pattern.test(label) && !selectedIds.includes(entry.componentId) && !seen.has(entry.componentId)) {
        result.push({ label, suggestedComponentId: entry.componentId });
        seen.add(entry.componentId);
        break;
      }
    }
  }
  return result;
}

/**
 * Scan analysis core_features for action keywords that imply actuators
 * not present in the selected hardware IDs.
 */
export function findCoreFeaturesMissingActuators(
  coreFeatures: string[],
  selectedIds: string[]
): { feature: string; suggestedComponentId: string }[] {
  const result: { feature: string; suggestedComponentId: string }[] = [];
  const seen = new Set<string>();
  for (const feat of coreFeatures) {
    const lower = feat.toLowerCase();
    for (const entry of FEATURE_KEYWORD_TO_COMPONENT) {
      if (lower.includes(entry.keyword) && !selectedIds.includes(entry.componentId) && !seen.has(entry.componentId)) {
        result.push({ feature: feat, suggestedComponentId: entry.componentId });
        seen.add(entry.componentId);
        break;
      }
    }
  }
  return result;
}
