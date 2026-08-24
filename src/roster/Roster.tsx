import styled from "styled-components";
import type { RosterView } from "./useRoster";

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Heading = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`;

const Lede = styled.p`
  margin: 0;
  max-width: 68ch;
  color: ${({ theme }) => theme.secondaryText};
`;

const Caveat = styled.p`
  margin: 0;
  max-width: 68ch;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.warning};
  border-radius: 8px;
  color: ${({ theme }) => theme.warning};
  font-size: 0.875rem;
`;

const Grid = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Card = styled.li`
  display: flex;
  /* Not centred: a card carrying a description is much taller than one without, and
     centring floats its avatar into the middle of the text block. */
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  background-color: ${({ theme }) => theme.whiteBackground};
`;

const Avatar = styled.img`
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.stroke};
  object-fit: cover;
  background-color: ${({ theme }) => theme.lightBackground};
`;

/* Stands in for an avatar ENS did not give us. Deliberately not a generated identicon:
   an invented image is indistinguishable from a real one at a glance, and this page has
   to keep what it was told apart from what it made up. */
const AvatarFallback = styled.span`
  display: flex;
  width: 44px;
  height: 44px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => theme.stroke};
  background-color: ${({ theme }) => theme.lightBackground};
  color: ${({ theme }) => theme.secondaryText};
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.8125rem;
  text-transform: uppercase;
`;

const Identity = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Nickname = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  overflow-wrap: anywhere;
`;

const StackLabel = styled.span`
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.lavenderPurple};
`;

const Description = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.secondaryText};
`;

export function Roster({ entries, isResolvedFromEns }: RosterView) {
  return (
    <Section aria-labelledby="roster-heading">
      <Heading id="roster-heading">The roster</Heading>
      <Lede>
        Six agent jurors, each an independent build on a different stack. This list is the
        dashboard's own: an agent juror that has never staked or been drawn has no on-chain presence
        at all, so the chain alone would show fewer than six.
      </Lede>

      {!isResolvedFromEns && (
        <Caveat role="status">
          ENS could not be reached, so every nickname below is the one held in this repository and
          no avatar is shown. Nothing else on this page depends on it.
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
