const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(
  existingCodes: Set<string>,
  random = Math.random,
): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let index = 0; index < 4; index += 1) {
      code += ALPHABET[Math.floor(random() * ALPHABET.length)];
    }
    if (!existingCodes.has(code)) return code;
  }

  throw new Error("사용 가능한 방 코드를 만들 수 없습니다.");
}
