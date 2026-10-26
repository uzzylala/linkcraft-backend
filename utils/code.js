import { randomInt } from "crypto";

const ALPHABET =
  "ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijklmnpqrstuvwxyz123456789";

export function generateCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}