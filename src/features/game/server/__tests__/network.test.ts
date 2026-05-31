import { describe, expect, it } from "vitest";
import {
  buildAllowedDevOrigins,
  buildLanInviteUrls,
  getUsableLanIpv4Addresses,
} from "../network";

const sampleInterfaces = {
  "Wi-Fi": [
    {
      address: "192.168.0.12",
      family: "IPv4",
      internal: false,
      cidr: "192.168.0.12/24",
      mac: "00:00:00:00:00:00",
      netmask: "255.255.255.0",
      scopeid: 0,
    },
  ],
  Loopback: [
    {
      address: "127.0.0.1",
      family: "IPv4",
      internal: true,
      cidr: "127.0.0.1/8",
      mac: "00:00:00:00:00:00",
      netmask: "255.0.0.0",
      scopeid: 0,
    },
  ],
  Tunnel: [
    {
      address: "169.254.1.20",
      family: "IPv4",
      internal: false,
      cidr: "169.254.1.20/16",
      mac: "00:00:00:00:00:00",
      netmask: "255.255.0.0",
      scopeid: 0,
    },
    {
      address: "fe80::1",
      family: "IPv6",
      internal: false,
      cidr: "fe80::1/64",
      mac: "00:00:00:00:00:00",
      netmask: "ffff:ffff:ffff:ffff::",
      scopeid: 1,
    },
  ],
  "vEthernet (WSL)": [
    {
      address: "172.25.96.1",
      family: "IPv4",
      internal: false,
      cidr: "172.25.96.1/20",
      mac: "00:00:00:00:00:00",
      netmask: "255.255.240.0",
      scopeid: 0,
    },
  ],
};

describe("network helpers", () => {
  it("finds private IPv4 LAN addresses only", () => {
    expect(getUsableLanIpv4Addresses(sampleInterfaces)).toEqual([
      "192.168.0.12",
    ]);
  });

  it("builds same-WiFi invite URLs with the room code", () => {
    expect(
      buildLanInviteUrls({
        interfaces: sampleInterfaces,
        port: "3000",
        roomCode: "ab12",
      }),
    ).toEqual(["http://192.168.0.12:3000/game?room=AB12"]);
  });

  it("builds allowed Next.js dev origins for LAN addresses", () => {
    expect(buildAllowedDevOrigins(sampleInterfaces)).toEqual(["192.168.0.12"]);
  });
});
