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

/* The amber "Degraded, not broken" panel this view used to declare for itself now lives in
   chrome/Failure.tsx and is rendered by `View`, above whichever route is on screen. Ticket 14
   built it here against Errors.dc.html:142 and recorded why it is amber rather than uncoloured;
   ticket 13 lifted it out rather than reinventing it. It had to move: ticket 15 sent the roster
   to its own route, so a panel that lived here was invisible on the matrix — which shows the
   same six nicknames and the same six avatars as its column headers, and was therefore falling
   back to the roster while saying nothing at all about it.

   What stays here is what the panel cannot say: which elements the fallback actually reached.
   That is the other half of the criterion, and it belongs on the elements themselves. */

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
   absent rather than broken.

   Dashed rather than solid when the fallback is a *failure* to fetch, per Errors.dc.html:152:
   a dashed edge is the system's mark for a placeholder, and it is what tells this apart from
   an agent juror who simply has no avatar set. */
const AvatarFallback = styled.span<{ $fallenBack?: boolean }>`
  display: flex;
  width: 44px;
  height: 44px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radiusTile};
  border: ${({ theme, $fallenBack }) =>
    $fallenBack === true ? `1px dashed ${theme.lineAmber}` : theme.borderVisible};
  background-color: ${({ theme }) => theme.surfaceInset};
  font: ${({ theme }) => theme.typeMono};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textMeta};
  text-transform: uppercase;
`;

/* Where the nickname came from, on the element it affects. The panel above says ENS is
   unreachable once; this says which names are the consequence, so a reader looking at one card
   does not have to carry the panel in their head. */
const FromRoster = styled.span`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.stateWork};
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
  // `isResolving` as well as `isResolvedFromEns`: the second is false while the mainnet lookup
  // is still out *and* after it fails, so a caveat keyed on it alone claims a failure for the
  // length of every cold load and then takes it back. A caveat that appears and disappears
  // teaches a reader to ignore caveats.
  const fallenBack = !isResolving && !isResolvedFromEns;

  return (
    <Section aria-labelledby="roster-heading">
      <Heading id="roster-heading">The roster</Heading>
      <Lede>
        Six agent jurors, each an independent build on a different stack. This list is the
        dashboard's own: an agent juror that has never staked or been drawn has no on-chain presence
        at all, so the chain alone would show fewer than six.
      </Lede>

      <Grid>
        {entries.map(({ agentJuror, identity }) => (
          <Card key={agentJuror.address}>
            {identity.avatarUrl ? (
              <Avatar src={identity.avatarUrl} alt="" loading="lazy" />
            ) : (
              <AvatarFallback aria-hidden="true" $fallenBack={fallenBack}>
                {identity.nickname.slice(0, 2)}
              </AvatarFallback>
            )}
            <Identity>
              <Nickname>{identity.nickname}</Nickname>
              {/* Beside the stack label, never instead of it: which stack an agent juror is
                  built on is a fact about the roster and is still true when ENS is down. */}
              <StackLabel>
                {agentJuror.stack.label}
                {fallenBack && <FromRoster> · From roster</FromRoster>}
              </StackLabel>
              {agentJuror.description && <Description>{agentJuror.description}</Description>}
            </Identity>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}
