import { Link } from "react-router";
import styled from "styled-components";
import { narrow } from "../styles/breakpoints";
import { VisuallyHidden } from "../styles/hidden";
import { Lockup } from "./Lockup";

/**
 * The site footer, after the one on ai.kleros.io (maintainer's request, 2026-09-24): the lockup,
 * one line saying what Kleros AI is for, and a row of links. Three columns on a desktop, stacked
 * on a phone. It carries no caveat and no figure: those live where the figure is, or on /method.
 *
 * A colophon row under the three columns credits the dashboard's maintainer and links its source
 * (maintainer's request, 2026-11-20). It sits apart from the Kleros links on purpose: that nav is
 * named "Kleros", and the repository is not a Kleros destination. Crediting who built the
 * *dashboard* does not touch the rule against naming who built an agent juror.
 */

const Bar = styled.footer`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: ${({ theme }) => theme.space9};
  width: 100%;
  max-width: ${({ theme }) => theme.container};
  margin: ${({ theme }) => theme.space11} auto 0;
  padding: ${({ theme }) => `${theme.space9} ${theme.gutter}`};
  border-top: ${({ theme }) => theme.borderHairline};

  ${narrow} {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.space5};
  }
`;

const Home = styled(Link)`
  display: inline-flex;
  color: inherit;
  text-decoration: none;
`;

const Tagline = styled.p`
  margin: 0;
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};
`;

const Links = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space6};
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Out = styled.a`
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};
  text-decoration: none;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.textBody};
    text-decoration: underline;
  }
`;

const Colophon = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space5};
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};

  p {
    margin: 0;
  }
`;

/* The colophon's two links, styled like the row above. No resting underline on the inline name:
   the maintainer's ruling (2026-11-20), knowingly against the prose-link tripwire, since hover
   and focus change its colour. The block padding lifts each target to at least 24px tall. */
const ColophonLink = styled(Out)`
  display: inline-flex;
  align-items: center;
  padding-block: ${({ theme }) => theme.space2};
`;

/* A little air either side of the emoji, which sits tight against a word space at this size. */
const Heart = styled.span`
  margin-inline: 0.2em;
`;

const REPOSITORY = "https://github.com/jaybuidl/ai-juror-dashboard";

/* GitHub's own mark, from Octicons (mark-github, 16px grid, MIT). Inline markup, so it reaches no
   CSP directive and is not hot-linked. currentColor lets it take the link's hover colour. The
   link carries the accessible name; the mark is decoration. */
function GitHubMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  );
}

const LINKS: readonly { label: string; href: string }[] = [
  { label: "Kleros", href: "https://kleros.io/" },
  { label: "Kleros AI", href: "https://ai.kleros.io/" },
  { label: "Skills", href: "https://skills.kleros.io/" },
  { label: "Agent Access", href: "https://ai.kleros.io/builders" },
];

export function SiteFooter() {
  return (
    <Bar>
      <Home to="/" aria-label="Dashboard home">
        <Lockup />
      </Home>
      <Tagline>Fair, open coordination for an economy of autonomous software.</Tagline>
      <nav aria-label="Kleros">
        <Links>
          {LINKS.map((link) => (
            <li key={link.href}>
              <Out href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </Out>
            </li>
          ))}
        </Links>
      </nav>
      <Colophon>
        <p>
          Built with <Heart aria-hidden="true">🩶</Heart>
          <VisuallyHidden>love</VisuallyHidden> by{" "}
          <ColophonLink href="https://github.com/jaybuidl" target="_blank" rel="noreferrer">
            jaybuidl
          </ColophonLink>
        </p>
        <ColophonLink
          href={REPOSITORY}
          target="_blank"
          rel="noreferrer"
          aria-label="Source on GitHub"
        >
          <GitHubMark />
        </ColophonLink>
      </Colophon>
    </Bar>
  );
}
