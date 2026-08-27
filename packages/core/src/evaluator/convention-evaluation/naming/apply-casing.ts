import type { NamingCasing } from "../../../model/index.js";

export function applyCasing(value: string, casing: NamingCasing): string {
  if (casing === "lower") {
    return value.toLowerCase();
  }
  if (casing === "upper") {
    return value.toUpperCase();
  }
  return value;
}
