import type { CanonicalResourceIdentityAttribute, ConventionPack } from "../../../model/index.js";

export function applyAbbreviation(
  attribute: CanonicalResourceIdentityAttribute,
  value: string,
  abbreviations: ConventionPack["abbreviations"],
): string {
  return abbreviations?.[attribute]?.[value] ?? value;
}
