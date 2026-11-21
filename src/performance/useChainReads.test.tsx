import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import chainFixture from "./dispute-156-chain.fixture.json" with { type: "json" };
import { fetchDisputeChain } from "./dispute-chain";
import { useDisputeChain } from "./useChainReads";

vi.mock("./dispute-chain", () => ({ fetchDisputeChain: vi.fn() }));
const fetched = vi.mocked(fetchDisputeChain);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const RANGE = { fromBlock: 496_780_897n, toBlock: 497_058_149n };

describe("useDisputeChain", () => {
  beforeEach(() => {
    fetched.mockReset();
    fetched.mockResolvedValue(chainFixture as never);
  });

  it("asks nothing before the dispute's own read has given it a range", () => {
    const { result } = renderHook(() => useDisputeChain(156, null, "1:commit:0"), { wrapper });

    expect(fetched).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ data: null, answered: false, error: null });
  });

  it("does not run on Retry while it cannot run, so it cannot invent an Arbitrum failure", () => {
    // The banner's Retry reaches every read on the page. Pressed over a failed dispute read, a
    // retry that ran this read with no range would throw and raise Arbitrum as a second failure.
    const { result } = renderHook(() => useDisputeChain(156, null, "1:commit:0"), { wrapper });

    act(() => result.current.retry());

    expect(fetched).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it("answers once its read lands, and keeps the answer standing in while the next one runs", async () => {
    let release: () => void = () => {};
    const { result, rerender } = renderHook(
      ({ progress }) => useDisputeChain(156, RANGE, progress),
      { wrapper, initialProps: { progress: "1:commit:1" } },
    );
    await waitFor(() => expect(result.current.answered).toBe(true));

    fetched.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(chainFixture as never);
        }),
    );
    rerender({ progress: "1:commit:2" });

    // The court saw a new commitment: the old read is still shown, and is not an answer.
    expect(result.current.data).not.toBeNull();
    expect(result.current.answered).toBe(false);
    release();
    await waitFor(() => expect(result.current.answered).toBe(true));
  });

  it("never lets one dispute's read stand in for another's", async () => {
    const { result, rerender } = renderHook(({ id }) => useDisputeChain(id, RANGE, "1:commit:1"), {
      wrapper,
      initialProps: { id: 156 },
    });
    await waitFor(() => expect(result.current.answered).toBe(true));

    fetched.mockImplementationOnce(() => new Promise(() => {}));
    rerender({ id: 160 });

    expect(result.current.data).toBeNull();
  });
});
