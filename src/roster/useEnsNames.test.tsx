import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ContractFunctionRevertedError } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { shownEnsName, useEnsNames } from "./useEnsNames";

const getEnsName = vi.fn();
vi.mock("viem", async (original) => ({
  ...(await original<typeof import("viem")>()),
  createPublicClient: () => ({ getEnsName }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const ALICE = "0x1111111111111111111111111111111111111111";
const BOB = "0x4444444444444444444444444444444444444444";
const CAROL = "0x5555555555555555555555555555555555555555";

describe("useEnsNames", () => {
  beforeEach(() => {
    getEnsName.mockReset();
  });

  it("names each account that has a name, and only those, by its lowercased address", async () => {
    const MIXED = "0xAbCdEf0000000000000000000000000000000000";
    getEnsName.mockImplementation(async ({ address }: { address: string }) =>
      address === MIXED.toLowerCase() ? "alice.eth" : null,
    );
    const { result } = renderHook(() => useEnsNames([BOB, MIXED]), { wrapper });

    await waitFor(() => expect(result.current.get(MIXED.toLowerCase())).toBe("alice.eth"));
    expect(result.current.has(BOB)).toBe(false);
  });

  it("drops one account's failed lookup and keeps the rest", async () => {
    getEnsName.mockImplementation(async ({ address }: { address: string }) => {
      if (address === BOB) throw new Error("OffchainLookup");
      return address === ALICE ? "alice.eth" : null;
    });
    const { result } = renderHook(() => useEnsNames([ALICE, BOB]), { wrapper });

    await waitFor(() => expect(result.current.get(ALICE)).toBe("alice.eth"));
    expect(result.current.size).toBe(1);
  });

  it("holds no empty answer when mainnet answers nothing at all", async () => {
    // Every lookup failing is an outage: an error to retry, not an hour of "no names".
    getEnsName.mockRejectedValue(new Error("fetch failed"));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useEnsNames([ALICE, BOB]), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() =>
      expect(client.getQueryState(["ensNames", [ALICE, BOB]])?.status).toBe("error"),
    );
    expect(result.current.size).toBe(0);
  });

  it("takes a lone funder whose lookup reverts as an answer, not an outage to retry", async () => {
    // An offchain primary name, with offchain lookups off: the resolver reverts for that account.
    getEnsName.mockRejectedValue(
      new ContractFunctionRevertedError({
        abi: [],
        functionName: "reverseWithGateways",
        // OffchainLookup's selector, as the resolver reverts with it.
        data: "0x556f1830",
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useEnsNames([ALICE]), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() =>
      expect(client.getQueryState(["ensNames", [ALICE]])?.status).toBe("success"),
    );
  });

  it("takes a node's internal error, which viem also calls a revert, as an outage", async () => {
    // -32603 with no return data: nothing answered, so it must not be held as "no names".
    getEnsName.mockRejectedValue(
      new ContractFunctionRevertedError({
        abi: [],
        functionName: "reverseWithGateways",
        message: "Internal error",
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useEnsNames([ALICE]), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(client.getQueryState(["ensNames", [ALICE]])?.status).toBe("error"));
  });

  it("keeps the names it has while a new funder's lookup is in flight", async () => {
    getEnsName.mockImplementation(async ({ address }: { address: string }) =>
      address === ALICE ? "alice.eth" : null,
    );
    const { result, rerender } = renderHook(({ addresses }) => useEnsNames(addresses), {
      wrapper,
      initialProps: { addresses: [ALICE] },
    });
    await waitFor(() => expect(result.current.get(ALICE)).toBe("alice.eth"));

    getEnsName.mockImplementation(() => new Promise(() => {}));
    rerender({ addresses: [ALICE, CAROL] });

    expect(result.current.get(ALICE)).toBe("alice.eth");
  });

  it("asks nothing where there is nobody to name", () => {
    const { result } = renderHook(() => useEnsNames([]), { wrapper });

    expect(result.current.size).toBe(0);
    expect(getEnsName).not.toHaveBeenCalled();
  });
});

describe("shownEnsName", () => {
  it("shows a name already in normal form", () => {
    expect(shownEnsName("vitalik.eth")).toBe("vitalik.eth");
  });

  it("drops a name that normalising would rewrite, which no reader could type back", () => {
    expect(shownEnsName("Vitalik.eth")).toBeNull();
  });

  it("drops a name that does not normalise at all", () => {
    // A zero-width joiner between two letters, the shape a look-alike takes.
    expect(shownEnsName("vit\u200Dalik.eth")).toBeNull();
  });

  it("drops no name, an empty one, and anything that is not a string", () => {
    expect(shownEnsName(null)).toBeNull();
    expect(shownEnsName("")).toBeNull();
    expect(shownEnsName(42)).toBeNull();
  });
});
