/**
 * ClaimIt SVG icon set (Phase 1 redesign).
 * Line icons follow the 2px-stroke Feather-style vocabulary from the
 * approved mockups; brand marks reproduce the mockup SVGs.
 */
import { View } from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polyline,
  Rect,
  type SvgProps,
} from "react-native-svg";

function baseProps(size: number, props: SvgProps): SvgProps {
  return { width: size, height: size, ...props };
}
void baseProps;

/** Pin + emerald dot brand mark (login screen logo). */
export function PinLogo({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <Path
        d="M22 6C13.1634 6 6 13.1634 6 22C6 26.6896 8.02058 30.9088 11.2426 33.8284L14.7782 30.2929C12.4497 28.2144 11 25.2754 11 22C11 15.9249 15.9249 11 22 11C28.0751 11 33 15.9249 33 22C33 28.0751 28.0751 33 22 33C20.803 33 19.6456 32.8087 18.5619 32.4566L15.4262 35.5923C17.4093 36.5057 19.6384 37 22 37C30.2843 37 37 30.2843 37 22C37 13.7157 30.2843 6 22 6Z"
        fill="#112240"
      />
      <Path d="M11 36L17.5 39.5L15 33L11 36Z" fill="#112240" />
      <Circle cx={22} cy={18} r={4.5} fill="#10B981" />
      <Path
        d="M22 22.5L22 26"
        stroke="#10B981"
        strokeLinecap="round"
        strokeWidth={2.5}
      />
    </Svg>
  );
}

/** Heart-pin brand mark (possible matches header). */
export function HeartPinLogo({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 42" fill="none">
      <Path
        d="M18 2C9.71573 2 3 8.71573 3 17C3 26.5 16 39.5 17.15 40.65C17.62 41.12 18.38 41.12 18.85 40.65C20 39.5 33 26.5 33 17C33 8.71573 26.2843 2 18 2Z"
        stroke="#1952BE"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3.5}
      />
      <Path
        d="M18 19.5L14.4 15.6C13.2 14.3 13.2 12.3 14.4 11.1C15.6 9.9 17.4 9.9 18.6 11.1L18 11.7L17.4 11.1C18.6 9.9 20.4 9.9 21.6 11.1C22.8 12.3 22.8 14.3 21.6 15.6L18 19.5Z"
        fill="#FBBF24"
      />
    </Svg>
  );
}

/** Google quad-color logo (SSO button). */
export function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
        fill="#4285F4"
      />
      <Path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.26 21.36 7.35 24 12 24z"
        fill="#34A853"
      />
      <Path
        d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.41l4.02-3.13z"
        fill="#FBBC05"
      />
      <Path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.26 6.59l4.02 3.13c.95-2.83 3.6-4.93 6.72-4.93z"
        fill="#EA4335"
      />
    </Svg>
  );
}

/** Semantic QR code artwork for the QR Tag Ready screen. */
export function QrArtwork({ size = 176 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <Rect fill="white" height={160} width={160} />
      <Rect fill="#0f172a" height={40} rx={6} width={40} x={10} y={10} />
      <Rect fill="white" height={28} rx={3} width={28} x={16} y={16} />
      <Rect fill="#0f172a" height={16} rx={2} width={16} x={22} y={22} />
      <Rect fill="#0f172a" height={40} rx={6} width={40} x={110} y={10} />
      <Rect fill="white" height={28} rx={3} width={28} x={116} y={16} />
      <Rect fill="#0f172a" height={16} rx={2} width={16} x={122} y={22} />
      <Rect fill="#0f172a" height={40} rx={6} width={40} x={10} y={110} />
      <Rect fill="white" height={28} rx={3} width={28} x={16} y={116} />
      <Rect fill="#0f172a" height={16} rx={2} width={16} x={22} y={122} />
      <G fill="#0f172a">
        <Rect height={14} rx={1} width={7} x={56} y={12} />
        <Rect height={7} rx={1} width={14} x={68} y={12} />
        <Rect height={7} rx={1} width={14} x={88} y={12} />
        <Rect height={18} rx={1} width={7} x={56} y={32} />
        <Rect height={8} rx={1} width={8} x={68} y={25} />
        <Rect height={8} rx={1} width={20} x={82} y={25} />
        <Rect height={12} rx={1} width={14} x={68} y={38} />
        <Rect height={12} rx={1} width={8} x={88} y={38} />
        <Rect height={14} rx={1} width={8} x={12} y={58} />
        <Rect height={8} rx={1} width={14} x={26} y={58} />
        <Rect height={8} rx={1} width={8} x={46} y={58} />
        <Rect height={14} rx={1} width={14} x={60} y={56} />
        <Rect height={20} rx={1} width={8} x={80} y={56} />
        <Rect height={7} rx={1} width={18} x={94} y={58} />
        <Rect height={8} rx={1} width={14} x={118} y={58} />
        <Rect height={14} rx={1} width={10} x={138} y={58} />
        <Rect height={8} rx={1} width={14} x={12} y={78} />
        <Rect height={20} rx={1} width={8} x={32} y={72} />
        <Rect height={8} rx={1} width={20} x={46} y={72} />
        <Rect height={16} rx={1} width={8} x={72} y={76} />
        <Rect height={8} rx={1} width={16} x={86} y={82} />
        <Rect height={20} rx={1} width={8} x={108} y={72} />
        <Rect height={8} rx={1} width={14} x={122} y={72} />
        <Rect height={14} rx={1} width={8} x={142} y={78} />
        <Rect height={12} rx={1} width={8} x={12} y={92} />
        <Rect height={18} rx={1} width={8} x={26} y={86} />
        <Rect height={8} rx={1} width={14} x={40} y={92} />
        <Rect height={14} rx={1} width={14} x={60} y={96} />
        <Rect height={8} rx={1} width={8} x={80} y={96} />
        <Rect height={14} rx={1} width={8} x={94} y={90} />
        <Rect height={8} rx={1} width={20} x={108} y={98} />
        <Rect height={12} rx={1} width={16} x={134} y={92} />
        <Rect height={14} rx={1} width={8} x={56} y={116} />
        <Rect height={8} rx={1} width={14} x={70} y={116} />
        <Rect height={20} rx={1} width={8} x={90} y={110} />
        <Rect height={14} rx={1} width={14} x={104} y={112} />
        <Rect height={14} rx={1} width={8} x={124} y={116} />
        <Rect height={8} rx={1} width={12} x={138} y={112} />
        <Rect height={8} rx={1} width={20} x={56} y={136} />
        <Rect height={16} rx={1} width={8} x={82} y={132} />
        <Rect height={8} rx={1} width={14} x={96} y={132} />
        <Rect height={14} rx={1} width={8} x={116} y={136} />
        <Rect height={14} rx={1} width={14} x={130} y={126} />
      </G>
    </Svg>
  );
}

/** Reticle corner accent (scan screen). */
export function ReticleCorner({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br";
}) {
  const radiusMap = {
    tl: { topLeft: 18 },
    tr: { topRight: 18 },
    bl: { bottomLeft: 18 },
    br: { bottomRight: 18 },
  } as const;
  const sideMap = {
    tl: { borderTopWidth: 4, borderLeftWidth: 4 },
    tr: { borderTopWidth: 4, borderRightWidth: 4 },
    bl: { borderBottomWidth: 4, borderLeftWidth: 4 },
    br: { borderBottomWidth: 4, borderRightWidth: 4 },
  } as const;
  const posMap = {
    tl: { top: -2, left: -2 },
    tr: { top: -2, right: -2 },
    bl: { bottom: -2, left: -2 },
    br: { bottom: -2, right: -2 },
  } as const;
  return (
    <View
      className="absolute h-8 w-8 border-[#34D399]"
      style={[
        posMap[position],
        sideMap[position],
        { borderStyle: "solid", ...radiusMap[position] },
      ]}
    />
  );
}

type LineIconName =
  | "chevron-left"
  | "chevron-right"
  | "search"
  | "smartphone"
  | "shopping-bag"
  | "shirt"
  | "credit-card"
  | "map-pin"
  | "calendar"
  | "bell"
  | "user"
  | "home"
  | "file-text"
  | "log-out"
  | "plus"
  | "clock"
  | "shield"
  | "help-circle"
  | "check"
  | "check-circle"
  | "camera"
  | "info"
  | "tag"
  | "package"
  | "printer"
  | "scan"
  | "category"
  | "headphones"
  | "user-check";

const paths: Record<LineIconName, React.ReactNode> = {
  "chevron-left": <Polyline points="15 18 9 12 15 6" />,
  "chevron-right": <Polyline points="9 18 15 12 9 6" />,
  search: (
    <>
      <Circle cx={11} cy={11} r={8} />
      <Line x1={21} y1={21} x2={16.65} y2={16.65} />
    </>
  ),
  smartphone: (
    <>
      <Rect height={20} rx={2} width={16} x={4} y={2} />
      <Line x1={12} y1={18} x2={12.01} y2={18} />
    </>
  ),
  "shopping-bag": (
    <>
      <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <Line x1={3} y1={6} x2={21} y2={6} />
      <Path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  shirt: (
    <Path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.5a2 2 0 0 0 1.34 1.58L6 11.5V20a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8.5l1.76-.73a2 2 0 0 0 1.34-1.58l.58-3.5a2 2 0 0 0-1.3-2.23z" />
  ),
  "credit-card": (
    <>
      <Rect height={14} rx={2} width={20} x={2} y={3} />
      <Line x1={8} y1={21} x2={16} y2={21} />
      <Line x1={12} y1={17} x2={12} y2={21} />
    </>
  ),
  "map-pin": (
    <>
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <Circle cx={12} cy={10} r={3} />
    </>
  ),
  calendar: (
    <>
      <Rect height={18} rx={2} width={18} x={3} y={4} />
      <Line x1={16} y1={2} x2={16} y2={6} />
      <Line x1={8} y1={2} x2={8} y2={6} />
      <Line x1={3} y1={10} x2={21} y2={10} />
    </>
  ),
  bell: (
    <>
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  user: (
    <>
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </>
  ),
  home: <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />,
  "file-text": (
    <>
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <Polyline points="14 2 14 8 20 8" />
      <Line x1={16} y1={13} x2={8} y2={13} />
      <Line x1={16} y1={17} x2={8} y2={17} />
      <Polyline points="10 9 9 9 8 9" />
    </>
  ),
  "log-out": (
    <>
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Polyline points="16 17 21 12 16 7" />
      <Line x1={21} y1={12} x2={9} y2={12} />
    </>
  ),
  plus: (
    <>
      <Line x1={12} y1={5} x2={12} y2={19} />
      <Line x1={5} y1={12} x2={19} y2={12} />
    </>
  ),
  clock: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Polyline points="12 7 12 12 15 14" />
    </>
  ),
  shield: (
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  ),
  "help-circle": (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <Line x1={12} y1={17} x2={12.01} y2={17} />
    </>
  ),
  check: <Path d="M5 13l4 4L19 7" />,
  "check-circle": (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Polyline points="9 12 11.5 14.5 15.5 9.5" />
    </>
  ),
  camera: (
    <>
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <Circle cx={12} cy={13} r={4} />
    </>
  ),
  info: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Line x1={12} y1={16} x2={12} y2={12} />
      <Line x1={12} y1={8} x2={12.01} y2={8} />
    </>
  ),
  tag: (
    <>
      <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <Line x1={7} y1={7} x2={7.01} y2={7} />
    </>
  ),
  package: (
    <>
      <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <Polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <Line x1={12} y1={22.08} x2={12} y2={12} />
    </>
  ),
  printer: (
    <>
      <Polyline points="6 9 6 2 18 2 18 9" />
      <Path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <Rect height={8} width={12} x={6} y={14} />
    </>
  ),
  scan: (
    <>
      <Path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <Path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <Path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <Path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <Rect height={3} width={3} x={7} y={7} />
      <Rect height={3} width={3} x={14} y={7} />
      <Rect height={3} width={3} x={7} y={14} />
      <Rect height={3} width={3} x={14} y={14} />
    </>
  ),
  category: (
    <>
      <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <Line x1={7} y1={7} x2={7.01} y2={7} />
    </>
  ),
  "user-check": (
    <>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx={8.5} cy={7} r={4} />
      <Polyline points="17 11 19 13 23 9" />
    </>
  ),
  headphones: (
    <>
      <Path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <Path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </>
  ),
};

export type { LineIconName };

export function LineIcon({
  name,
  size = 20,
  color = "#0F172A",
  strokeWidth = 2,
}: {
  name: LineIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </Svg>
  );
}
