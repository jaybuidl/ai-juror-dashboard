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
  display: inline-block;
  padding-block: ${({ theme }) => theme.space2};
`;

const REPOSITORY = "https://github.com/jaybuidl/ai-juror-dashboard";

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
          Built with <span aria-hidden="true">💜</span>
          <VisuallyHidden>love</VisuallyHidden> by{" "}
          <ColophonLink href="https://github.com/jaybuidl" target="_blank" rel="noreferrer">
            jaybuidl
          </ColophonLink>
        </p>
        <ColophonLink href={REPOSITORY} target="_blank" rel="noreferrer">
          Source on GitHub
        </ColophonLink>
      </Colophon>
    </Bar>
  );
}
