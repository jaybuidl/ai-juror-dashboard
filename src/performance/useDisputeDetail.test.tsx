import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import detailFixture from "./dispute-156-detail.fixture.json" with { type: "json" };
import { fetchDisputeDetail } from "./dispute-detail-subgraph";
import { useDisputeDetail } from "./useDisputeDetail";

vi.mock("./dispute-detail-subgraph", () => ({ fetchDisputeDetail: vi.fn() }));
const fetched = vi.mocked(fetchDisputeDetail);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/**
 * #21: the court read polls and this one does not, so a reveal the court sees after this read
 * landed has to bring this read back, or the page says "published empty" of prose it never read.
 */
describe("useDisputeDetail and reveals it has not seen", () => {
  beforeEach(() => {
    fetched.mockReset();
    fetched.mockResolvedValue(detailFixture as never);
  });

  it("re-reads, and says it is behind until it has, when the court sees a new reveal", async () => {
    const { result, rerender } = renderHook(({ revealed }) => useDisputeDetail(156, revealed), {
      wrapper,
      initialProps: { revealed: 2 as number | null },
    });
    await waitFor(() => expect(result.current.readAt).not.toBeNull());
    expect(fetched).toHaveBeenCalledTimes(1);
    expect(result.current.isBehindReveals).toBe(false);

    let release: () => void = () => {};
    fetched.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(detailFixture as never);
        }),
    );
    rerender({ revealed: 3 });

    // Behind from the very render that saw the reveal, before any re-read has answered.
    expect(result.current.isBehindReveals).toBe(true);
    await waitFor(() => expect(fetched).toHaveBeenCalledTimes(2));
    release();
    await waitFor(() => expect(result.current.isBehindReveals).toBe(false));
    expect(fetched).toHaveBeenCalledTimes(2);
  });

  it("does not re-read when nothing new has been revealed", async () => {
    const { result, rerender } = renderHook(({ revealed }) => useDisputeDetail(156, revealed), {
      wrapper,
      initialProps: { revealed: 2 as number | null },
    });
    await waitFor(() => expect(result.current.readAt).not.toBeNull());
    rerender({ revealed: 2 });
    rerender({ revealed: null });

    expect(result.current.isBehindReveals).toBe(false);
    expect(fetched).toHaveBeenCalledTimes(1);
  });

  it("re-reads a read that started before the court read had landed", async () => {
    // A cold deep link: the dispute's read starts with no court read to count against, so it
    // knows nothing about reveals, and the first count the court gives is one it has not seen.
    const { result, rerender } = renderHook(({ revealed }) => useDisputeDetail(156, revealed), {
      wrapper,
      initialProps: { revealed: null as number | null },
    });
    await waitFor(() => expect(result.current.readAt).not.toBeNull());
    expect(result.current.isBehindReveals).toBe(false);

    rerender({ revealed: 2 });
    expect(result.current.isBehindReveals).toBe(true);
    await waitFor(() => expect(fetched).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isBehindReveals).toBe(false));
  });

  it("re-reads when an appeal round starts the count again", async () => {
    const { result, rerender } = renderHook(({ revealed }) => useDisputeDetail(156, revealed), {
      wrapper,
      initialProps: { revealed: 3 as number | null },
    });
    await waitFor(() => expect(result.current.readAt).not.toBeNull());

    rerender({ revealed: 0 });
    expect(result.current.isBehindReveals).toBe(true);
    await waitFor(() => expect(fetched).toHaveBeenCalledTimes(2));
  });

  it("asks once per reveal, not again and again while the re-read fails", async () => {
    const { result, rerender } = renderHook(({ revealed }) => useDisputeDetail(156, revealed), {
      wrapper,
      initialProps: { revealed: 2 as number | null },
    });
    await waitFor(() => expect(result.current.readAt).not.toBeNull());

    fetched.mockRejectedValue(new Error("HTTP 503"));
    rerender({ revealed: 3 });
    await waitFor(() => expect(result.current.error).not.toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Still behind, and honest about it, but not hammering the endpoint.
    expect(result.current.isBehindReveals).toBe(true);
    expect(fetched).toHaveBeenCalledTimes(2);
  });
});
