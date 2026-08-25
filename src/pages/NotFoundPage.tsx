import { Link, useLocation } from "react-router";
import styled from "styled-components";
import type { Provenance } from "../chrome/provenance";
import { View } from "../chrome/View";

/**
 * A path that matches no route.
 *
 * The SPA fallback in `netlify.toml` returns the app shell at HTTP 200 for every unknown path,
 * so the app is the only thing that can tell a visitor their URL is wrong. Without this they
 * would get the matrix at a URL that means nothing, or a blank page — both of which read as the
 * dashboard being broken.
 *
 * It deliberately does not look like a failed read. Ticket 13 owns that state and it is loud,
 * rose, and about a source: a mistyped URL is none of those things, and dressing it up as one
 * would tell a visitor that a public dashboard is down when it is not.
 */

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space6};
  padding: ${({ theme }) => `${theme.space11} 0`};
`;

const Code = styled.p`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
`;

const Title = styled.h1`
  font: ${({ theme }) => theme.typeDisplay2};
  letter-spacing: ${({ theme }) => theme.trackingDisplay};
  color: ${({ theme }) => theme.textHeading};
`;

const Body = styled.p`
  max-width: 62ch;
  font: ${({ theme }) => theme.typeBodyLg};
  color: ${({ theme }) => theme.textBody};
`;

const Path = styled.span`
  font-family: ${({ theme }) => theme.fontMono};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textHeading};
  overflow-wrap: anywhere;
`;

const Back = styled(Link)`
  align-self: flex-start;
  padding: ${({ theme }) => `${theme.space5} ${theme.space7}`};
  border: 1px solid ${({ theme }) => theme.accentQuiet};
  border-radius: ${({ theme }) => theme.radiusChip};
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  text-decoration: none;
  color: ${({ theme }) => theme.accent};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.focusRing};
    outline-offset: 3px;
  }
`;

const provenance: Provenance = {
  measures:
    "No figure was read for this page, because there is no page here. Nothing is missing from the dashboard's record.",
  read: null,
  readAt: null,
  caveats: [],
  identifiesAgentJurors: false,
};

export function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <View provenance={provenance}>
      <Header>
        <Code>Page not found</Code>
        <Title>There is nothing at this address.</Title>
        <Body>
          The dashboard has no page at <Path>{pathname}</Path>. Nothing failed to load and no figure
          is missing — this URL simply does not name anything here.
        </Body>
        <Back to="/">Go to the matrix</Back>
      </Header>
    </View>
  );
}
