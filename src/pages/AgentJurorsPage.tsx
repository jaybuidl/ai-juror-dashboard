import styled from "styled-components";
import type { Failures } from "../chrome/failures";
import type { Provenance } from "../chrome/provenance";
import { View } from "../chrome/View";
import { ensFallbackOf } from "../roster/ens-fallback";
import { Roster } from "../roster/Roster";
import type { RosterView } from "../roster/useRoster";

/**
 * The agent-juror index: all six, whether or not the court has ever drawn them.
 *
 * The nav names this destination, so it has to arrive somewhere real. It is also the parent
 * ticket 11's per-agent-juror view hangs its breadcrumb from, and the one place a reader can
 * see `baskerville` — never drawn, and therefore absent from every on-chain source.
 *
 * The roster is not a read. It is this repository's own list, checked against ENS nightly in
 * CI, and the footer says as much: an agent juror with no stake and no draw has no on-chain
 * presence at all, so the chain alone would show fewer than six.
 */

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
`;

const Title = styled.h1`
  font: ${({ theme }) => theme.typeDisplay2};
  letter-spacing: ${({ theme }) => theme.trackingDisplay};
  color: ${({ theme }) => theme.textHeading};
`;

const Deck = styled.p`
  max-width: 68ch;
  font: ${({ theme }) => theme.typeBodyLg};
  color: ${({ theme }) => theme.textBody};
`;

/**
 * The one view where nothing can go loud.
 *
 * It reads a single source and that source is the documented exception: ENS carries nicknames
 * and avatars, nothing on this page is a measurement, and there is therefore no state in which a
 * blocking banner over it would be true. `blocking` is empty by construction rather than by
 * accident, which is what "a failure of ENS resolution alone raises no banner" amounts to on the
 * one page where ENS is all there is.
 */
function failuresOf(roster: RosterView): Failures {
  return {
    blocking: [],
    degraded: [ensFallbackOf(roster)].filter((read) => read !== null),
    offline: false,
    lastCompleteRead: null,
    retry: null,
  };
}

function provenanceOf(roster: RosterView): Provenance {
  const caveats: string[] = [
    "The roster is this dashboard's own list, not a read of the court. An agent juror that has never staked or been drawn has no on-chain presence to read.",
  ];

  // `isResolving` as well: the flag is false while the mainnet lookup is still out, so without
  // it every cold load asserts a failure that has not happened and then retracts it.
  if (!roster.isResolving && !roster.isResolvedFromEns) {
    caveats.push(
      "ENS could not be reached, so every nickname above is the one held in this repository and no avatar is shown.",
    );
  }

  return {
    measures:
      "Nothing on this page is a measurement. It names who is being measured; the figures are on the matrix.",
    // Nothing here rests on a dispute read: the six are the six whether or not the court
    // has held anything.
    read: null,
    readAt: null,
    caveats,
    identifiesAgentJurors: true,
  };
}

export function AgentJurorsPage({ roster }: { roster: RosterView }) {
  return (
    <View provenance={provenanceOf(roster)} failures={failuresOf(roster)}>
      <Header>
        <Title>Agent jurors</Title>
        {/* Deliberately not a second description of the roster — `Roster` carries its own, and
            two of them on one page is one sentence too many. This says the half the component
            does not: where the names come from. */}
        <Deck>
          Nicknames resolve from ENS where the record is set; where it is not, the name shown is the
          one held in this repository.
        </Deck>
      </Header>
      <Roster {...roster} />
    </View>
  );
}
