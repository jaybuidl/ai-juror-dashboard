import styled from "styled-components";
import type { Failures } from "../chrome/failures";
import { useDocumentTitle } from "../chrome/title";
import { View } from "../chrome/View";
import { ensFallbackOf } from "../roster/ens-fallback";
import { Roster } from "../roster/Roster";
import type { RosterView } from "../roster/useRoster";

/**
 * The agent-juror index: every one of them, whether or not the court has ever drawn them.
 *
 * The nav names this destination, so it has to arrive somewhere real. It is also the parent
 * ticket 11's per-agent-juror view hangs its breadcrumb from, and the one place a reader can
 * see an agent juror the court has yet to draw — absent, until then, from every on-chain source.
 *
 * The roster is not a read. It is this repository's own list, checked against ENS nightly in
 * CI: an agent juror with no stake and no draw has no on-chain presence at all, so the chain
 * alone could show fewer names than this page does.
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

export function AgentJurorsPage({ roster }: { roster: RosterView }) {
  useDocumentTitle("The agent jurors");
  return (
    <View failures={failuresOf(roster)}>
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
