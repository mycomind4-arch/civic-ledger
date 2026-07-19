import type { AddressInfo } from "node:net";
import { buildApp } from "./app.js";
import type { BuildAppOptions } from "./types.js";

export async function startServer(
  options: BuildAppOptions & { host?: string; port?: number }
): Promise<{ address: AddressInfo; close(): Promise<void> }> {
  const app = buildApp(options);
  await app.listen({ host: options.host ?? "127.0.0.1", port: options.port ?? 0 });
  return {
    address: app.server.address() as AddressInfo,
    close: () => app.close()
  };
}
