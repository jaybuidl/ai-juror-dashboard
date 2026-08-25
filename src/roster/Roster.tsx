import styled from "styled-components";
import type { RosterView } from "./useRoster";

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space7};
`;

const Heading = styled.h2`
  font: ${({ theme }) => theme.typeTitle1};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme }) => theme.textHeading};
`;

const Lede = styled.p`
  max-width: 68ch;
  color: ${({ theme }) => theme.textBody};
`;

/* The canvas draws this exact block — Errors.dc.html:142, the amber "Degraded, not broken"
   panel, whose copy is all but ours. Amber here is not a cell state: ADR-0006 governs colour
   inside the matrix, and its rule is that a glyph and a word carry the meaning before a colour
   does, which is why the label below says what happened in words and the diamond is the canvas's
   own mark for degraded. A caveat has to be visible in the UI to be a caveat at all, and the
   first cut of this restyle — hairline on near-transparent fill — made it quieter than the prose
   it interrupts. Ticket 13 owns the louder rose banner for a read that actually cost a figure;
   nothing here did. */
const Caveat = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
  max-width: 68ch;
  padding: ${({ theme }) => `${theme.space7} ${theme.space8}`};
  border: 1px solid ${({ theme }) => theme.lineAmber};
  border-radius: ${({ theme }) => theme.radiusCard};
  background-color: ${({ theme }) => theme.washAmber};
`;

const CaveatLabel = styled.p`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space4};
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.stateWork};
`;

const CaveatBody = styled.p`
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textBody};
`;

const Grid = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: ${({ theme }) => theme.space6};
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Card = styled.li`
  display: flex;
  /* Not centred: a card carrying a description is much taller than one without, and
     centring floats its avatar into the middle of the text block. */
  align-items: flex-start;
  gap: ${({ theme }) => theme.space5};
  padding: ${({ theme }) => theme.space6};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusTile};
  background-color: ${({ theme }) => theme.surfaceCard};
`;

const Avatar = styled.img`
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: ${({ theme }) => theme.radiusTile};
  border: ${({ theme }) => theme.borderHairline};
  object-fit: cover;
  background-color: ${({ theme }) => theme.page};
`;

/* Stands in for an avatar ENS did not give us. Deliberately not a generated identicon:
   an invented image is indistinguishable from a real one at a glance, and this page has
   to keep what it was told apart from what it made up. Drawn as the system's glyph tile —
   inset fill, visible hairline, mono mark — which is how the canvas draws a thing that is
   absent rather than broken. */
const AvatarFallback = styled.span`
  display: flex;
  width: 44px;
  height: 44px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radiusTile};
  border: ${({ theme }) => theme.borderVisible};
  background-color: ${({ theme }) => theme.surfaceInset};
  font: ${({ theme }) => theme.typeMono};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textMeta};
  text-transform: uppercase;
`;

const Identity = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space1};
  min-width: 0;
`;

const Nickname = styled.span`
  font: ${({ theme }) => theme.typeTitle3};
  color: ${({ theme }) => theme.textHeading};
  overflow-wrap: anywhere;
`;

/* The system's mono label: uppercase, widely tracked, quiet. Same anatomy as base.css's
   .ka-mono utility, written here because these are styled components and not class names. */
const StackLabel = styled.span`
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
`;

const Description = styled.span`
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};
`;

export function Roster({ entries, isResolving, isResolvedFromEns }: RosterView) {
  return (
    <Section aria-labelledby="roster-heading">
      <Heading id="roster-heading">The roster</Heading>
      <Lede>
        Six agent jurors, each an independent build on a different stack. This list is the
        dashboard's own: an agent juror that has never staked or been drawn has no on-chain presence
        at all, so the chain alone would show fewer than six.
      </Lede>

      {/* `isResolving` as well as `isResolvedFromEns`: the second is false while the mainnet
          lookup is still out, so on its own this panel claims a failure for the length of every
          cold load and then takes it back. A caveat that appears and disappears teaches a reader
          to ignore caveats. */}
      {!isResolving && !isResolvedFromEns && (
        <Caveat role="status">
          <CaveatLabel>
            <span aria-hidden="true">◇</span>
            Degraded, not broken
          </CaveatLabel>
          <CaveatBody>
            ENS could not be reached, so every nickname below is the one held in this repository and
            no avatar is shown. Nothing else on this page depends on it.
          </CaveatBody>
        </Caveat>
      )}

      <Grid>
        {entries.map(({ agentJuror, identity }) => (
          <Card key={agentJuror.address}>
            {identity.avatarUrl ? (
              <Avatar src={identity.avatarUrl} alt="" loading="lazy" />
            ) : (
              <AvatarFallback aria-hidden="true">{identity.nickname.slice(0, 2)}</AvatarFallback>
            )}
            <Identity>
              <Nickname>{identity.nickname}</Nickname>
              <StackLabel>{agentJuror.stack.label}</StackLabel>
              {agentJuror.description && <Description>{agentJuror.description}</Description>}
            </Identity>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}
