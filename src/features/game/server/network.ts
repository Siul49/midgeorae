import { networkInterfaces } from "node:os";

interface MinimalNetworkAddress {
  address: string;
  family: string | number;
  internal: boolean;
}

type MinimalNetworkInterfaces = Record<
  string,
  MinimalNetworkAddress[] | undefined
>;

function isIpv4(address: MinimalNetworkAddress) {
  return address.family === "IPv4" || address.family === 4;
}

function isPrivateLanIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isLikelyVirtualInterface(name: string) {
  return /virtual|vethernet|wsl|docker|vmware|virtualbox|hyper-v|tunnel|loopback/i.test(
    name,
  );
}

export function getUsableLanIpv4Addresses(
  interfaces: MinimalNetworkInterfaces = networkInterfaces(),
) {
  const addresses = new Set<string>();

  for (const [name, entries] of Object.entries(interfaces)) {
    if (isLikelyVirtualInterface(name)) continue;

    for (const entry of entries ?? []) {
      if (!entry.internal && isIpv4(entry) && isPrivateLanIpv4(entry.address)) {
        addresses.add(entry.address);
      }
    }
  }

  return Array.from(addresses);
}

export function buildLanInviteUrls({
  interfaces,
  pathname = "/game",
  port,
  roomCode,
}: {
  interfaces?: MinimalNetworkInterfaces;
  pathname?: string;
  port?: string;
  roomCode: string;
}) {
  const normalizedCode = roomCode.trim().toUpperCase();
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const portSuffix = port ? `:${port}` : "";

  return getUsableLanIpv4Addresses(interfaces).map(
    (address) =>
      `http://${address}${portSuffix}${normalizedPathname}?room=${encodeURIComponent(
        normalizedCode,
      )}`,
  );
}

export function buildAllowedDevOrigins(interfaces?: MinimalNetworkInterfaces) {
  return getUsableLanIpv4Addresses(interfaces);
}
