import type { ValidationIssue } from "./types";
import { COMPONENTS, BOARD_SPECS } from "./components";

export function validateBuild(boardId: string, sensorIds: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const board = BOARD_SPECS.find((b) => b.id === boardId);
  if (!board) {
    issues.push({ severity: "error", message: `Unknown board: ${boardId}` });
    return issues;
  }

  const selected = sensorIds
    .map((id) => COMPONENTS.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => c != null);

  // Power budget
  const totalDraw = selected.reduce((sum, c) => sum + c.currentDrawMa, 0);
  const noDraw = selected.filter((c) => c.currentDrawMa === 0);
  if (totalDraw > board.maxCurrentMa) {
    issues.push({
      severity: "error",
      message: `Total current draw ${Math.round(totalDraw)}mA exceeds ${board.name}'s ${board.maxCurrentMa}mA budget. ${noDraw.length > 0 ? "Some components (pump, solenoid, etc.) need external power." : "Use external power for high-draw components or reduce the sensor count."}`,
    });
  } else if (totalDraw > board.maxCurrentMa * 0.8) {
    issues.push({
      severity: "warning",
      message: `Total current draw ${Math.round(totalDraw)}mA is close to ${board.name}'s ${board.maxCurrentMa}mA budget. Consider external power.`,
    });
  }

  // Voltage mismatches
  selected.forEach((c) => {
    if (c.voltage !== "3.3-5" && c.voltage !== board.logicVoltage) {
      const needsShifter = board.logicVoltage === 3.3 && c.voltage === 5;
      issues.push({
        severity: "error",
        componentId: c.id,
        message: `${c.name} runs at ${c.voltage}V but ${board.name} uses ${board.logicVoltage}V logic.${needsShifter ? " Use a logic level shifter or voltage divider." : " This 5V board cannot directly interface with 3.3V components without level shifting."}`,
      });
    }
  });

  // I2C address collisions
  const i2cSelected = selected.filter((c) => c.interface === "i2c" && c.i2cAddress);
  const addrCounts = new Map<string, { count: number; names: string[] }>();
  i2cSelected.forEach((c) => {
    const entry = addrCounts.get(c.i2cAddress!) || { count: 0, names: [] };
    entry.count++;
    entry.names.push(c.name);
    addrCounts.set(c.i2cAddress!, entry);
  });
  addrCounts.forEach((entry, addr) => {
    if (entry.count > 1) {
      issues.push({
        severity: "error",
        message: `I2C address conflict: ${entry.names.join(" and ")} both default to ${addr}. Use an I2C multiplexer (e.g., TCA9548A) or choose address-configurable variants.`,
      });
    }
  });

  // I2C/SPI bus conflict — warn when mixing many I2C devices
  const i2cCount = selected.filter((c) => c.interface === "i2c").length;
  if (i2cCount > 3 && board.hasI2c) {
    issues.push({
      severity: "warning",
      message: `${i2cCount} I2C devices on one bus. Consider an I2C multiplexer if you experience address conflicts or signal degradation on long wires.`,
    });
  }

  // Pin budget estimate for digital/analog/pwm
  const digitalNeeded = selected.filter((c) => c.interface === "digital" || c.interface === "onewire").reduce((s, c) => s + c.pinsRequired, 0);
  const analogNeeded = selected.filter((c) => c.interface === "analog").reduce((s, c) => s + c.pinsRequired, 0);
  const pwmNeeded = selected.filter((c) => c.interface === "pwm").reduce((s, c) => s + c.pinsRequired, 0);
  const spiNeeded = selected.filter((c) => c.interface === "spi").reduce((s, c) => s + c.pinsRequired, 0);
  const uartNeeded = selected.filter((c) => c.interface === "uart").reduce((s, c) => s + c.pinsRequired, 0);
  const i2cPinsNeeded = selected.filter((c) => c.interface === "i2c").reduce((s, c) => s + c.pinsRequired, 0);

  const totalPinsNeeded = digitalNeeded + analogNeeded + pwmNeeded + spiNeeded + uartNeeded + i2cPinsNeeded;
  const totalPinsAvailable = board.digitalPins.length + board.analogPins.length;

  if (totalPinsNeeded > totalPinsAvailable) {
    issues.push({
      severity: "error",
      message: `Selection needs ~${totalPinsNeeded} pins but ${board.name} has ${totalPinsAvailable}. Consider reducing sensor count or using I2C/SPI which share pins.`,
    });
  } else if (totalPinsNeeded > totalPinsAvailable * 0.8) {
    issues.push({
      severity: "warning",
      message: `Selection uses ~${totalPinsNeeded} of ${totalPinsAvailable} available pins. Ensure your pin assignments don't conflict.`,
    });
  }

  // Protocol compatibility
  if (spiNeeded > 0 && !board.hasSpi) {
    issues.push({
      severity: "error",
      message: `SPI components selected but ${board.name} does not have hardware SPI (or pins are limited). Consider I2C alternatives.`,
    });
  }

  // Specific component warnings
  if (selected.some((c) => c.id === "hc-sr04") && board.logicVoltage === 3.3) {
    issues.push({
      severity: "warning",
      componentId: "hc-sr04",
      message: "HC-SR04 needs 5V supply — use level shifter on echo pin for 3.3V board, or use a voltage divider (2:1 resistor divider).",
    });
  }
  if (selected.some((c) => c.id === "ws2812b") && board.logicVoltage === 3.3) {
    issues.push({
      severity: "warning",
      componentId: "ws2812b",
      message: "WS2812B data line expects ~5V signal. Use a logic level shifter (3.3V → 5V) on the data pin for reliable operation.",
    });
  }

  return issues;
}
