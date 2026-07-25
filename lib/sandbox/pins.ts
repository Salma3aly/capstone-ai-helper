import type { WiringItem } from "./types";

/**
 * Extracts a digital/analog pin from a connection string like:
 * "Data -> Arduino D2", "IN -> Arduino Pin 9", "A0 -> Arduino A0", "OUT -> 3"
 * Returns null for power/ground/non-microcontroller targets.
 */
export function extractPinFromConnection(connString: string): string | null {
  const parts = connString.split(/→|->/);
  if (parts.length < 2) return null;
  const rhs = parts[1].trim();

  // Skip power and ground connections
  if (/\b(vcc|gnd|5v|3\.3v|3v3|vin)\b/i.test(rhs)) return null;

  // Match: Pin 9, D3, A0, GP2, 9
  const match = rhs.match(/\b(?:pin|d|a|gp)?([a-z0-9]+)\b/i);
  if (match) {
    const pin = match[1].toUpperCase();
    if (/^[A-Z0-9]+$/.test(pin)) {
      // If it matches D3, keep "3" since digital pins in code are typically bare numbers
      if (rhs.toUpperCase().includes("D" + pin) && !isNaN(Number(pin))) {
        return pin;
      }
      return pin;
    }
  }
  return null;
}

/**
 * Generates all possible constant name representations in UPPER_SNAKE_CASE
 * for a given component name (e.g. "Soil Moisture Sensor" -> "SOIL_MOISTURE_PIN", "MOISTURE_PIN").
 */
export function getPossibleConstantNames(componentName: string): string[] {
  const clean = componentName.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase();
  const parts = clean.split("_").filter(Boolean);
  const names = new Set<string>();

  names.add(clean);
  names.add(clean + "_PIN");

  if (parts.length > 1) {
    names.add(parts.join("_"));
    names.add(parts.join("_") + "_PIN");

    // Add prefix segments
    for (let i = 0; i < parts.length - 1; i++) {
      const prefix = parts.slice(0, i + 1).join("_");
      names.add(prefix);
      names.add(prefix + "_PIN");
    }

    // Add individual terms
    parts.forEach((p) => {
      if (p !== "SENSOR" && p !== "MODULE" && p !== "VALVE" && p !== "PUMP") {
        names.add(p);
        names.add(p + "_PIN");
      }
    });
  }

  // Common aliases — covers all common sensor/actuator naming patterns
  if (clean.includes("DHT")) {
    names.add("DHTPIN");
    names.add("DHT_PIN");
    names.add("DHT22_PIN");
    names.add("DHT11_PIN");
  }
  if (clean.includes("MOISTURE")) {
    names.add("MOISTURE_PIN");
    names.add("SOIL_MOISTURE");
    names.add("SOIL_MOISTURE_PIN");
  }
  if (clean.includes("PUMP") || clean.includes("RELAY")) {
    names.add("PUMP_PIN");
    names.add("RELAY_PIN");
    names.add("PUMP");
    names.add("RELAY");
    names.add("WATER_PUMP_PIN");
    names.add("WATER_PUMP");
    names.add("WATER");
    names.add("WATER_PIN");
    names.add("MOTOR_PIN");
    names.add("MOTOR");
  }
  if (clean.includes("VALVE") || clean.includes("SOLENOID")) {
    names.add("VALVE_PIN");
    names.add("SOLENOID_PIN");
    names.add("SOLENOID");
  }
  if (clean.includes("ULTRASONIC") || clean.includes("HC") || clean.includes("SR04")) {
    names.add("TRIG_PIN");
    names.add("ECHO_PIN");
    names.add("TRIG");
    names.add("ECHO");
    names.add("HC_SR04_TRIG");
    names.add("HC_SR04_ECHO");
    names.add("ULTRASONIC_TRIG");
    names.add("ULTRASONIC_ECHO");
  }
  if (clean.includes("TEMP") || clean.includes("LM35")) {
    names.add("TEMP_SENSOR");
    names.add("TEMP_SENSOR_PIN");
    names.add("LM35_PIN");
    names.add("TEMP");
    names.add("TEMP_PIN");
  }
  if (clean.includes("LED")) {
    names.add("LED");
    names.add("LED_PIN");
    names.add("LED_BUILTIN");
  }
  if (clean.includes("BUZZER")) {
    names.add("BUZZER");
    names.add("BUZZER_PIN");
  }
  if (clean.includes("SERVO")) {
    names.add("SERVO");
    names.add("SERVO_PIN");
    names.add("SERVO_SG90");
    names.add("SERVO_SG90_PIN");
  }

  return Array.from(names);
}

/**
 * Replaces value of a pin constant (e.g. #define PIN_NAME OLD_VAL or const int PIN_NAME = OLD_VAL)
 * in the code string with expectedPin if it doesn't match.
 */
export function findAndReplacePinInCode(
  code: string,
  constantName: string,
  expectedPin: string
): { newCode: string; found: boolean } {
  const defineRegex = new RegExp(`(#define\\s+${constantName}\\s+)([A-Z0-9_]+)`, "i");
  const varRegex = new RegExp(
    `((?:const\\s+)?(?:int|byte|uint8_t)\\s+${constantName}\\s*=\\s*)([A-Z0-9_]+)`,
    "i"
  );

  let found = false;
  let newCode = code;

  if (defineRegex.test(newCode)) {
    newCode = newCode.replace(defineRegex, (match, prefix, val) => {
      if (val.toUpperCase() !== expectedPin.toUpperCase()) {
        found = true;
        return `${prefix}${expectedPin}`;
      }
      return match;
    });
  }

  if (varRegex.test(newCode)) {
    newCode = newCode.replace(varRegex, (match, prefix, val) => {
      if (val.toUpperCase() !== expectedPin.toUpperCase()) {
        found = true;
        return `${prefix}${expectedPin}`;
      }
      return match;
    });
  }

  return { newCode, found };
}

/**
 * Automated correction process to ensure code matches wiring.
 */
export function correctPinsInCode(wiring: WiringItem[], code: string): string {
  let correctedCode = code;
  wiring.forEach((item) => {
    const pins: string[] = [];
    item.connections.forEach((conn) => {
      const p = extractPinFromConnection(conn);
      if (p) pins.push(p);
    });

    if (pins.length > 0) {
      const expectedPin = pins[0];
      const possibleConstants = getPossibleConstantNames(item.component);
      possibleConstants.forEach((constName) => {
        const res = findAndReplacePinInCode(correctedCode, constName, expectedPin);
        if (res.found) {
          correctedCode = res.newCode;
        }
      });
    }
  });
  return correctedCode;
}

/**
 * Validates if any pin mismatch remains in the code.
 */
/**
 * Hard block: returns all mismatches as error strings.
 * If any pin mismatch exists between wiring and code, generation must be rejected.
 */
export function checkPinMismatch(wiring: WiringItem[], code: string): string[] {
  const errors: string[] = [];
  for (const item of wiring) {
    // Skip power-only components (no signal pin)
    const pinConns = item.connections.filter((c) => {
      const rhs = c.split(/→|->/)[1]?.trim().toLowerCase() || "";
      return !/\b(vcc|gnd|5v|3\.3v|3v3|vin)\b/i.test(rhs);
    });
    if (pinConns.length === 0) continue;

    const pins: string[] = [];
    for (const conn of pinConns) {
      const p = extractPinFromConnection(conn);
      if (p) pins.push(p);
    }
    if (pins.length === 0) continue;

    const expectedPin = pins[0];
    const possibleConstants = getPossibleConstantNames(item.component);
    let constFound = false;
    let pinMatched = false;

    for (const constName of possibleConstants) {
      const defineRegex = new RegExp(`#define\\s+${constName}\\s+([A-Z0-9_]+)`, "i");
      const varRegex = new RegExp(
        `(?:const\\s+)?(?:int|byte|uint8_t)\\s+${constName}\\s*=\\s*([A-Z0-9_]+)`,
        "i"
      );

      const defineMatch = code.match(defineRegex);
      const varMatch = code.match(varRegex);
      const matchedVal = defineMatch?.[1] || varMatch?.[1];

      if (matchedVal) {
        constFound = true;
        if (matchedVal.toUpperCase() === expectedPin.toUpperCase()) {
          pinMatched = true;
        }
      }
    }

    if (constFound && !pinMatched) {
      errors.push(
        `Pin mismatch for "${item.component}": wiring has pin ${expectedPin}, but code defines a different value.`
      );
    }
  }
  return errors;
}

export function validatePins(wiring: WiringItem[], code: string): string[] {
  const issues: string[] = [];
  wiring.forEach((item) => {
    const pins: string[] = [];
    item.connections.forEach((conn) => {
      const p = extractPinFromConnection(conn);
      if (p) pins.push(p);
    });

    if (pins.length > 0) {
      const expectedPin = pins[0];
      const possibleConstants = getPossibleConstantNames(item.component);
      let constFound = false;
      let pinMatched = false;

      for (const constName of possibleConstants) {
        const defineRegex = new RegExp(`#define\\s+${constName}\\s+([A-Z0-9_]+)`, "i");
        const varRegex = new RegExp(
          `(?:const\\s+)?(?:int|byte|uint8_t)\\s+${constName}\\s*=\\s*([A-Z0-9_]+)`,
          "i"
        );

        const defineMatch = code.match(defineRegex);
        const varMatch = code.match(varRegex);
        const matchedVal = defineMatch?.[1] || varMatch?.[1];

        if (matchedVal) {
          constFound = true;
          if (matchedVal.toUpperCase() === expectedPin.toUpperCase()) {
            pinMatched = true;
          }
        }
      }

      if (constFound && !pinMatched) {
        issues.push(
          `Pin mismatch for component "${item.component}". Expected pin ${expectedPin} from wiring.`
        );
      }
    }
  });
  return issues;
}

/**
 * Automates driver injection for actuators in wiring.
 */
const ACTUATOR_REQUIRING_DRIVER = /pump|solenoid|valve|motor|actuator|dc-motor|stepper|nema/i;

export function enforceDriverWiring(wiring: WiringItem[]): WiringItem[] {
  const hasActuator = wiring.some(
    (w) => ACTUATOR_REQUIRING_DRIVER.test(w.component)
  );

  if (hasActuator) {
    let driverComponent = "Relay Module";
    if (wiring.some((w) => w.component.toLowerCase().includes("mosfet"))) {
      driverComponent = "MOSFET Module";
    }

    let driverEntry = wiring.find(
      (w) =>
        w.component.toLowerCase().includes("relay") ||
        w.component.toLowerCase().includes("mosfet")
    );

    if (!driverEntry) {
      driverEntry = {
        component: driverComponent,
        connections: ["VCC → 5V", "GND → GND", "IN → Pin 9"],
      };
      wiring.push(driverEntry);
    }

    // Find direct microcontroller pins of actuators and route them through the driver.
    wiring.forEach((item) => {
      const name = item.component.toLowerCase();
      if (ACTUATOR_REQUIRING_DRIVER.test(name) && !/relay|mosfet/.test(name)) {
        const mcPin = item.connections.map(extractPinFromConnection).find(Boolean);
        if (mcPin) {
          // Relocate the MCU pin connection to the driver module
          driverEntry!.connections = driverEntry!.connections.map((conn) => {
            if (conn.toLowerCase().includes("in →") || conn.toLowerCase().includes("sig →")) {
              return `IN → Pin ${mcPin}`;
            }
            return conn;
          });

          // Rewire actuator to route through the driver module
          item.connections = [
            `+ → ${driverComponent === "Relay Module" ? "Relay NO" : "MOSFET OUT"}`,
            `- → External Power GND`,
          ];
        }
      }
    });
  }

  return wiring;
}

/**
 * Self-check: scan wiring for any actuator that lacks a driver/relay module.
 * Returns error messages for any actuator wired directly to MCU without a driver.
 */
export function checkDriverPresence(wiring: WiringItem[]): string[] {
  const errors: string[] = [];
  const hasDriver = wiring.some(
    (w) => /relay|mosfet|driver/i.test(w.component)
  );

  for (const item of wiring) {
    if (ACTUATOR_REQUIRING_DRIVER.test(item.component) && !/relay|mosfet|driver/i.test(item.component)) {
      // Check if this actuator's connections route through a driver
      const routesThroughDriver = item.connections.some(
        (c) => /relay|mosfet|driver/i.test(c)
      );
      if (!routesThroughDriver && !hasDriver) {
        errors.push(
          `"${item.component}" is wired directly to the microcontroller without a relay or MOSFET driver. ` +
          `High-power actuators must be controlled through a driver stage.`
        );
      }
    }
  }
  return errors;
}
