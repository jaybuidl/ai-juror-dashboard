import styled from "styled-components";
import { narrow } from "../styles/breakpoints";

/**
 * The Kleros ×AI lockup, inline.
 *
 * The paths are the official mark, copied verbatim from `canvas/_logo.html` — the same file
 * every artboard's nav inlines. Inline and not fetched: an `<img>` or a background would be one
 * more request under a policy whose whole point is that it lists what this page may reach, and
 * a mark that fails to load is a nav with a hole in it. `fill="currentColor"` is what lets the
 * ink come from the theme rather than from a second copy of the palette.
 *
 * Redrawing it — tracing an approximation, or rebuilding the wordmark in type — is the thing
 * this comment exists to prevent. It is somebody's trademark, not a decoration.
 */

const Mark = styled.svg`
  display: block;
  flex: none;
  height: 26px;
  width: 102px;

  ${narrow} {
    height: 22px;
    width: 86px;
  }
`;

/** The ×AI suffix: a dim multiplication sign and the violet AI, as the system sets it. */
const Suffix = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space2};
  font-family: ${({ theme }) => theme.fontMono};
  font-weight: 500;
  font-size: 13px;
  line-height: 1;
  letter-spacing: ${({ theme }) => theme.trackingMonoTight};
  color: ${({ theme }) => theme.brandAi};
`;

const Times = styled.span`
  font-size: 17px;
  color: ${({ theme }) => theme.brandX};
`;

/**
 * The lockup as it sits in the nav.
 *
 * `aria-label` carries "Kleros ×AI" and the SVG is hidden, because a screen reader announcing
 * the outline of a K is worse than one announcing nothing.
 */
export function Lockup() {
  return (
    <>
      <Mark viewBox="20.47 36.54 1353.9 346.5" fill="currentColor" aria-hidden="true">
        <path d="M134.59,36.54l195.76,8.74,79.52,176.31L298,382.58,101.16,370.15,20.47,179.08ZM278.36,138.18l-141.93,62,121.31,93.95ZM261.92,107,148.52,58.16,124.73,161ZM233.17,317.77,110,229.62l3,119.52Zm157-96.79-84-85.09L283.87,299.94ZM262,336.72,158.11,364.13,280.36,372ZM373.76,260l-91,67.76,18.11,35.38Zm-43-190.08-17.83,36.34,65.81,66.86ZM308.45,52.53,193,47.85l95.29,41.68ZM117.87,69.3,37,171.61l54.11,11.48ZM87.84,203,33.45,191.5,90,325.35Z" />
        <path d="M512,199.51h6.44L565,138.26l13.23,10.4L533.3,205.8l52.75,63.91-13.32,11.15-54.8-67H512v63.66H494.57V141.61H512Z" />
        <path d="M652.53,141.61h17.33V261.87h70.95v15.64H652.53Z" />
        <path d="M805,141.61h84.44v15.72h-67V198h55.34V213.6H822.46v48.27h67v15.64H805Z" />
        <path d="M958.75,141.61h46c22.59,0,40.46,10.74,40.46,37a40.38,40.38,0,0,1-27.49,38.13l33.24,55-15,9.11-34.36-61.51H976.42V277.5H959.24ZM999,203.72c17.18,0,28.09-9.71,28.09-25.08a20.26,20.26,0,0,0-19-21.43,19.38,19.38,0,0,0-3.81.13H976.2v46.38Z" />
        <path d="M1202.36,209.73c0,10.91-.77,70.09-48,70.09-21.9,0-48.1-15.63-48.1-70.09s25.77-70.43,48.1-70.43S1202.36,154.93,1202.36,209.73Zm-77.91,0c0,19.75,3.61,53.68,29.89,53.68s29.81-34.36,29.81-53.68-3.6-54-29.81-54-30.32,33.95-30.32,54Z" />
        <path d="M1281.38,234.47c3.44,16.67,11.43,29,29.64,29,14.26,0,25.76-7.8,25.76-22.94,0-16.75-14.08-20.87-27.3-26.36C1289.72,205.53,1271,200.54,1271,175c0-22.94,18.46-35.73,39.77-35.73,22.59,0,35.82,13,41.31,34.35l-16.66,4.9c-3.09-13.23-10.13-22.68-24.9-22.68-11.15,0-22.08,5.76-22.08,18s7.8,16.41,18.21,21.13l28.77,12.71a34.37,34.37,0,0,1,18.73,31.87c0,25.77-18,40.37-43,40.37s-41.06-16.16-45.18-40.37Z" />
      </Mark>
      <Suffix aria-hidden="true">
        <Times>×</Times>
        AI
      </Suffix>
    </>
  );
}
