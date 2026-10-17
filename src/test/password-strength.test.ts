import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { checkPassword, suggestPasswords } from "@/lib/password-strength";

beforeAll(() => vi.stubGlobal("crypto", webcrypto));

function preservesInOrder(original: string, output: string) {
  let position = 0;
  for (const character of output) if (character === original[position]) position++;
  return position === original.length;
}

describe("Strengthening the user's own password", () => {
  it.each(["123456", "alphabet", "harshit123", "abc@12", "111111", " a b "])("preserves %s while adding strength", (input) => {
    for (const { value } of suggestPasswords(input)) {
      expect(preservesInOrder(input, value)).toBe(true);
      expect(value).not.toBe(input);
      expect(checkPassword(value).score).toBeGreaterThanOrEqual(3);
      expect(value).toMatch(/[A-Z]/);
      expect(value).toMatch(/[a-z]/);
      expect(value).toMatch(/\d/);
      expect(value).toMatch(/[^A-Za-z0-9]/);
    }
  });
  it("does not replace an empty input with unrelated suggestions", () => {
    expect(suggestPasswords("")).toEqual([]);
  });
});