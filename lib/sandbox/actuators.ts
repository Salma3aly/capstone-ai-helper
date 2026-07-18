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
