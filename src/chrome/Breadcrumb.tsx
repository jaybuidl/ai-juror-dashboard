import { Link } from "react-router";
import styled from "styled-components";

/**
 * The trail on a detail view: a link to the parent, a separator, and where you are.
 *
 * One component for every detail view — built against `canvas/Juror.dc.html:47-51`, drawn the
 * same way on `Dispute.dc.html:52-56` and `JurorEmpty.dc.html:37-41`. Tickets 09 and 11 build
 * the views underneath and pass the label; neither rebuilds the trail, and neither invents a
 * second parent for a route that already has one.
 *
 * The current item is text, not a link to itself. It is also the *roster* nickname or the
 * dispute's own id — never the nickname ENS resolves, which is a text record an operator can
 * rewrite from a wallet, and a trail naming it would name something the route is not keyed on.
 */

const Trail = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space5};
`;

const shared = `
  text-transform: uppercase;
  text-decoration: none;
`;

const Parent = styled(Link)`
  ${shared}
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  color: ${({ theme }) => theme.textMeta};

  &:hover {
    color: ${({ theme }) => theme.textBody};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.focusRing};
    outline-offset: 3px;
  }
`;

const Separator = styled.span`
  color: ${({ theme }) => theme.stateIdle};
`;

const Here = styled.span`
  ${shared}
  font: ${({ theme }) => theme.typeMonoSm};
  /* The one numeric element in the trail: a dispute id. The shorthand above resets the
     tabular figures base.css puts on body, and nothing warns when it does. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  color: ${({ theme }) => theme.textHeading};
`;

export type BreadcrumbProps = {
  /** Where the parent index is. */
  to: string;
  /** What that parent is called — "Matrix", "Agent jurors". */
  parent: string;
  /** The item being looked at: a dispute id, or a roster nickname. */
  current: string;
};

export function Breadcrumb({ to, parent, current }: BreadcrumbProps) {
  return (
    <Trail aria-label="Breadcrumb">
      <Parent to={to}>{parent}</Parent>
      <Separator aria-hidden="true">/</Separator>
      <Here aria-current="page">{current}</Here>
    </Trail>
  );
}
