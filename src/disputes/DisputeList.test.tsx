import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { describe, expect, it } from "vitest";
import { theme } from "../styles/theme";
import fixture from "./court-34.fixture.json" with { type: "json" };
import { DisputeList } from "./DisputeList";
import type { Dispute, RawDispute } from "./disputes";
import { toDisputes } from "./disputes";

const disputes = toDisputes(fixture as RawDispute[]);

function renderList(view: Partial<Parameters<typeof DisputeList>[0]> = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <DisputeList disputes={disputes} isLoading={false} error={null} {...view} />
    </ThemeProvider>,
  );
}

/** The row for one dispute, found by the core dispute ID that heads it. */
function row(id: number): HTMLElement {
  const heading = screen.getByText(String(id));
  const listItem = heading.closest("li");
  if (!listItem) throw new Error(`dispute ${id} is not in a row`);
  return listItem;
}

describe("DisputeList", () => {
  it("shows every dispute in the court as a row", () => {
    renderList();

    expect(screen.getAllByRole("listitem")).toHaveLength(16);
  });

  it("heads each row with its core dispute ID", () => {
    renderList();

    for (const dispute of disputes) {
      expect(screen.getByText(String(dispute.id))).toBeInTheDocument();
    }
  });

  it("orders the rows newest first", () => {
    renderList();

    const ids = screen.getAllByRole("listitem").map((item) => item.textContent?.match(/^\d+/)?.[0]);

    expect(ids.slice(0, 3)).toEqual(["166", "165", "164"]);
    expect(ids[ids.length - 1]).toBe("151");
  });

  it("names the ruling of a decided dispute", () => {
    renderList();

    expect(within(row(163)).getByText(/ruling 2/i)).toBeInTheDocument();
  });

  it("reads a dispute with no ruling yet as pending, never as a blank", () => {
    renderList();

    expect(within(row(166)).getByText(/pending/i)).toBeInTheDocument();
  });

  it("reads a refusal to arbitrate as a decision rather than as a missing ruling", () => {
    renderList();

    const dispute154 = within(row(154));

    expect(dispute154.getByText(/refuse to arbitrate/i)).toBeInTheDocument();
    expect(dispute154.queryByText(/pending/i)).not.toBeInTheDocument();
  });

  it("reports an empty read as a read, not as a finding that the court is empty", () => {
    // A resyncing subgraph answers 200 with zero rows. Asserting the court has held no
    // disputes on that basis would be a claim the data does not support, on a page that
    // may be cited.
    renderList({ disputes: [] });

    const empty = screen.getByText(/returned no disputes/i);

    expect(empty).toBeInTheDocument();
    expect(empty).toHaveTextContent(/not a finding that the court has held none/i);
  });

  it("says so when the disputes could not be read, rather than reading as an empty court", () => {
    renderList({ disputes: [], error: new Error("network down") });

    expect(screen.getByRole("status")).toHaveTextContent(/could not be read/i);
    expect(screen.queryByText(/returned no disputes/i)).not.toBeInTheDocument();
  });

  it("keeps the rows it has when a refetch fails, and still says the read failed", () => {
    renderList({ error: new Error("network down") });

    expect(screen.getAllByRole("listitem")).toHaveLength(16);
    expect(screen.getByRole("status")).toHaveTextContent(/could not be read/i);
  });

  it("fills the slots later tickets own, without moving anything", () => {
    // Ticket 04 supplies the title and category, ticket 05 the panel size and the flag.
    // This ticket only reserves their positions, so the row must render correctly both
    // with them and without.
    const dispute = disputes[0] as Dispute;

    render(
      <ThemeProvider theme={theme}>
        <DisputeList
          disputes={[dispute]}
          isLoading={false}
          error={null}
          slotsFor={() => ({
            title: "Missing Attribution in a Commissioned Illustration",
            category: "Licensing",
            panel: "Panel 4",
            flag: "Lone panel",
          })}
        />
      </ThemeProvider>,
    );

    const only = screen.getAllByRole("listitem")[0] as HTMLElement;

    expect(within(only).getByText(/missing attribution/i)).toBeInTheDocument();
    expect(within(only).getByText("Licensing")).toBeInTheDocument();
    expect(within(only).getByText("Panel 4")).toBeInTheDocument();
    expect(within(only).getByText("Lone panel")).toBeInTheDocument();
  });

  it("treats a slot supplied as null or empty text as unfilled, not as a value", () => {
    // A subgraph field with no value arrives as null or "", not as undefined. Rendering
    // it would put a separator either side of nothing.
    const dispute = disputes.find((candidate) => candidate.id === 163) as Dispute;

    render(
      <ThemeProvider theme={theme}>
        <DisputeList
          disputes={[dispute]}
          isLoading={false}
          error={null}
          slotsFor={() => ({ title: null, category: "", panel: undefined, flag: null })}
        />
      </ThemeProvider>,
    );

    const only = screen.getAllByRole("listitem")[0] as HTMLElement;

    expect(only.textContent).not.toMatch(/·/);
    expect(within(only).getByText(/ruling 2/i)).toBeInTheDocument();
  });

  it("leaves no dangling separator where an unfilled slot sits", () => {
    renderList();

    // The second line is `category · ruling · panel · flag` on the canvas, and this
    // ticket fills only the ruling. A separator either side of it would read as a value
    // that failed to load.
    expect(row(163).textContent).not.toMatch(/·\s*·/);
    expect(row(163).textContent?.trim()).not.toMatch(/^163\s*·|·\s*$/);
  });

  it("keeps a long title on one line, clipped rather than wrapped", () => {
    // Court 34 holds titles from "x402 escrow dispute" to a two-clause question about a
    // tailored jacket. Wrapping would give the list rows of two different heights and
    // stop it scanning as a column.
    renderList({
      slotsFor: () => ({
        title: "Will Zelenskyy wear a suit before July? - Is a black tailored jacket a suit?",
      }),
    });

    const title = getComputedStyle(within(row(163)).getByText(/zelenskyy/i));

    expect(title.whiteSpace).toBe("nowrap");
    expect(title.overflow).toBe("hidden");
    expect(title.textOverflow).toBe("ellipsis");
  });

  it("gives the row's grid a zero minimum, without which the clipping never happens", () => {
    // The failure this guards is silent: a `1fr` track takes its minimum from its
    // content, so the title grows the column instead of truncating and the row overflows
    // sideways with nothing in the console.
    renderList();

    const grid = getComputedStyle(screen.getAllByRole("listitem")[0] as HTMLElement);

    expect(grid.gridTemplateColumns).toBe("2.5rem minmax(0, 1fr)");
  });

  it("keeps the whole title reachable once it is clipped", () => {
    const full = "Restricted Travel Credit Accepted Before Refund Session Expiry";

    renderList({ slotsFor: () => ({ title: full }) });

    expect(within(row(163)).getByText(full)).toHaveAttribute("title", full);
  });

  it("still renders a dispute whose template could not be resolved, identified by ID", () => {
    // A dispute with no template, or one the endpoint did not return, is the ordinary
    // case rather than the exceptional one — and it must not cost the row its identity.
    renderList({ slotsFor: () => ({ title: undefined, category: undefined }) });

    expect(screen.getAllByRole("listitem")).toHaveLength(16);
    expect(within(row(155)).getByText("155")).toBeInTheDocument();
    expect(within(row(155)).getByText(/refuse to arbitrate|ruling|pending/i)).toBeInTheDocument();
  });

  it("keeps the title's line whether or not the row has a title", () => {
    // Without this the row's first line falls back to the smaller dispute ID when the
    // title slot is empty, so untitled rows sit shorter than titled ones and the whole
    // list shifts the moment the titles arrive.
    renderList({ slotsFor: () => ({}) });

    // The row is id, title, second line — in that order, and the title slot is present
    // even with nothing in it, which is the whole point of this test.
    const untitled = row(163);

    expect(untitled.children).toHaveLength(3);

    const title = getComputedStyle(untitled.children[1] as HTMLElement);

    // One line reserved, and the same multiple the line box uses, so an empty title holds
    // the row open to exactly the height a filled one would take.
    expect(Number.parseFloat(title.minHeight)).toBeGreaterThan(0);
    expect(title.lineHeight).toBe("1.35");
  });

  it("says when no title could be read, without claiming the list is incomplete", () => {
    // The distinction is the point: the disputes were read. Reusing the disputes-failed
    // notice here would tell a visitor the court's record is partial when it is whole.
    renderList({ titles: { expected: 16, resolved: 0, isLoading: false } });

    const notice = screen.getByRole("status");

    expect(notice).toHaveTextContent(/identified by ID alone/i);
    expect(notice).toHaveTextContent(/list itself is complete/i);
    expect(screen.getAllByRole("listitem")).toHaveLength(16);
  });

  it("counts the titles that are missing rather than reporting all or nothing", () => {
    // The shape a lagging template subgraph produces: HTTP 200, no error, and some of
    // the ids simply absent. Saying "the titles could not be read" over thirteen that
    // were read would be as wrong as saying nothing.
    renderList({ titles: { expected: 16, resolved: 13, isLoading: false } });

    expect(screen.getByRole("status")).toHaveTextContent(/3 of these 16 disputes/i);
  });

  it("says nothing about missing titles while the read is still in flight", () => {
    // Every title is legitimately absent before the answer arrives. A notice here would
    // fire on every load, and on every refetch a new dispute triggers.
    renderList({ titles: { expected: 16, resolved: 0, isLoading: true } });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("says nothing when every title that was expected came back", () => {
    renderList({ titles: { expected: 16, resolved: 16, isLoading: false } });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not count a dispute that has no template as a missing title", () => {
    // A dispute with no template id has no title to be missing. Counting it would leave
    // a notice on the page permanently, which trains people to ignore it.
    renderList({ titles: { expected: 15, resolved: 15, isLoading: false } });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("reports a failed title read separately from a failed dispute read", () => {
    renderList({
      error: new Error("core down"),
      titles: { expected: 16, resolved: 0, isLoading: false },
    });

    const notices = screen.getAllByRole("status");

    expect(notices).toHaveLength(2);
    expect(notices[0]).toHaveTextContent(/could not be read/i);
    expect(notices[1]).toHaveTextContent(/only the titles are missing/i);
  });
});
