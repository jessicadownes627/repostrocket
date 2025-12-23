import test from "node:test";
import assert from "node:assert/strict";
import { deriveFieldsFromOcr } from "../netlify/functions/cardIntel.js";

test("vintage Ron Darling card never hallucinate modern player", () => {
  const lines = [
    { text: "1985 TOPPS", confidence: 0.92, index: 0 },
    { text: "NEW YORK METS", confidence: 0.88, index: 1 },
  ];
  const result = deriveFieldsFromOcr(lines);
  assert.equal(result.player, "", "Player must remain empty when not in OCR");
  assert.ok(
    result.needsUserConfirmation,
    "lack of OCR text should keep needsUserConfirmation true"
  );
  assert.equal(
    result.team,
    "New York Mets",
    "Known MLB text should still map to the team"
  );
});

test("Ron Darling recognized when OCR includes name", () => {
  const lines = [
    { text: "RON DARLING", confidence: 0.95, index: 0 },
    { text: "NEW YORK METS", confidence: 0.9, index: 1 },
    { text: "1985 TOPPS", confidence: 0.85, index: 2 },
  ];
  const result = deriveFieldsFromOcr(lines);
  assert.equal(result.player, "Ron Darling");
  assert.equal(result.team, "New York Mets");
  assert.equal(result.year, "1985");
  assert.equal(result.setName, "Topps");
  assert.equal(result.isTextVerified.player, true);
  assert.equal(result.needsUserConfirmation, false);
});
