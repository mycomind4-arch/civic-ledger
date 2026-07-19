import { resolve } from "node:path";

export const SYNTHETIC_ORGANIZATION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const SYNTHETIC_USER_ID = "11111111-1111-4111-8111-111111111111";
export const SYNTHETIC_SOURCE_ID = "77777777-7777-4777-8777-777777777777";
export const SYNTHETIC_CORRELATION_ID = "44444444-4444-4444-8444-444444444444";

export function fixturePath(fixtureName: string, ...segments: readonly string[]): string {
  return resolve(process.cwd(), "fixtures", fixtureName, ...segments);
}
