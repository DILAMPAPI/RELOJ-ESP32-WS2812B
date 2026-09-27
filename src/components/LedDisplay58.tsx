import React from 'react';

interface LedDisplay58Props {
  d1: string;
  d2: string;
  colon: boolean;
  d3: string;
  d4: string;
  color: { r: number; g: number; b: number };
  brightness: number; // 0-255
  isFlashing?: boolean;
  className?: string;
  scale?: number;
}

// 7-segment lookup map: a, b, c, d, e, f, g
const DIGIT_SEGMENTS: Record<string, boolean[]> = {
  '0': [true, true, true, true, true, true, false],
  '1': [false, true, true, false, false, false, false],
  '2': [true, true, false, true, true, false, true],
  '3': [true, true, true, true, false, false, true],
  '4': [false, true, true, false, false, true, true],
  '5': [true, false, true, true, false, true, true],
  '6': [true, false, true, true, true, true, true],
  '7': [true, true, true, false, false, false, false],
  '8': [true, true, true, true, true, true, true],
  '9': [true, true, true, true, false, true, true],
  '-': [false, false, false, false, false, false, true],
  ' ': [false, false, false, false, false, false, false],
};

export const LedDisplay58: React.FC<LedDisplay58Props> = ({
  d1,
  d2,
  colon,
  d3,
  d4,
  color,
  brightness,
  isFlashing = false,
  className = '',
  scale = 1,
}) => {
  // Brillo normalizado (0 a 1)
  const normBrightness = Math.max(0.08, brightness / 255);
  const rgbString = `rgb(${color.r}, ${color.g}, ${color.b})`;
  const glowStyle = {
    boxShadow: `0 0 ${12 * normBrightness}px ${rgbString}, 0 0 ${24 * normBrightness}px ${rgbString}`,
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center p-4 sm:p-6 bg-stone-950 rounded-2xl border border-stone-800 shadow-2xl ${
        isFlashing ? 'animate-pulse ring-4 ring-red-600 bg-red-950/40' : ''
      } ${className}`}
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'center center',
      }}
    >
      {/* Etiqueta de hardware */}
      <div className="absolute top-2 left-4 flex items-center gap-2 text-[10px] uppercase font-mono tracking-wider text-stone-500">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        <span>ESP32-C3 · 58x WS2812B</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 mt-3">
        {/* Dígito 1 */}
        <SevenSegmentDigit char={d1} color={color} brightness={normBrightness} glowStyle={glowStyle} />
        {/* Dígito 2 */}
        <SevenSegmentDigit char={d2} color={color} brightness={normBrightness} glowStyle={glowStyle} />

        {/* Dos Puntos Centrales (2 LEDs WS2812B) */}
        <div className="flex flex-col justify-center gap-4 px-1 sm:px-2 py-4">
          <LedDiode active={colon} color={color} brightness={normBrightness} glowStyle={glowStyle} size="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <LedDiode active={colon} color={color} brightness={normBrightness} glowStyle={glowStyle} size="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>

        {/* Dígito 3 */}
        <SevenSegmentDigit char={d3} color={color} brightness={normBrightness} glowStyle={glowStyle} />
        {/* Dígito 4 */}
        <SevenSegmentDigit char={d4} color={color} brightness={normBrightness} glowStyle={glowStyle} />
      </div>

      <div className="absolute bottom-1 right-4 text-[9px] font-mono text-stone-600">
        4 Dígitos × 14 LEDs + 2 Colon
      </div>
    </div>
  );
};

interface SevenSegmentDigitProps {
  char: string;
  color: { r: number; g: number; b: number };
  brightness: number;
  glowStyle: React.CSSProperties;
}

const SevenSegmentDigit: React.FC<SevenSegmentDigitProps> = ({ char, color, brightness, glowStyle }) => {
  const segs = DIGIT_SEGMENTS[char] || DIGIT_SEGMENTS[' '];
  const [a, b, c, d, e, f, g] = segs;

  return (
    <div className="relative w-14 sm:w-20 h-28 sm:h-36 bg-black/60 rounded-lg p-2 border border-stone-900 flex flex-col justify-between">
      {/* Segmento A (Horizontal Superior: 2 LEDs) */}
      <SegmentHorizontal active={a} color={color} brightness={brightness} glowStyle={glowStyle} />

      {/* Fila Media Superior (F y B: cada uno 2 LEDs verticales) */}
      <div className="flex justify-between items-center h-10 sm:h-12 px-0.5">
        <SegmentVertical active={f} color={color} brightness={brightness} glowStyle={glowStyle} />
        <SegmentVertical active={b} color={color} brightness={brightness} glowStyle={glowStyle} />
      </div>

      {/* Segmento G (Horizontal Central: 2 LEDs) */}
      <SegmentHorizontal active={g} color={color} brightness={brightness} glowStyle={glowStyle} />

      {/* Fila Media Inferior (E y C: cada uno 2 LEDs verticales) */}
      <div className="flex justify-between items-center h-10 sm:h-12 px-0.5">
        <SegmentVertical active={e} color={color} brightness={brightness} glowStyle={glowStyle} />
        <SegmentVertical active={c} color={color} brightness={brightness} glowStyle={glowStyle} />
      </div>

      {/* Segmento D (Horizontal Inferior: 2 LEDs) */}
      <SegmentHorizontal active={d} color={color} brightness={brightness} glowStyle={glowStyle} />
    </div>
  );
};

const SegmentHorizontal: React.FC<{
  active: boolean;
  color: { r: number; g: number; b: number };
  brightness: number;
  glowStyle: React.CSSProperties;
}> = ({ active, color, brightness, glowStyle }) => {
  return (
    <div className="flex items-center justify-center gap-2 h-3 w-full bg-stone-900/50 rounded-sm px-2">
      <LedDiode active={active} color={color} brightness={brightness} glowStyle={glowStyle} />
      <LedDiode active={active} color={color} brightness={brightness} glowStyle={glowStyle} />
    </div>
  );
};

const SegmentVertical: React.FC<{
  active: boolean;
  color: { r: number; g: number; b: number };
  brightness: number;
  glowStyle: React.CSSProperties;
}> = ({ active, color, brightness, glowStyle }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 w-3 h-full bg-stone-900/50 rounded-sm py-1">
      <LedDiode active={active} color={color} brightness={brightness} glowStyle={glowStyle} />
      <LedDiode active={active} color={color} brightness={brightness} glowStyle={glowStyle} />
    </div>
  );
};

const LedDiode: React.FC<{
  active: boolean;
  color: { r: number; g: number; b: number };
  brightness: number;
  glowStyle: React.CSSProperties;
  size?: string;
}> = ({ active, color, brightness, glowStyle, size = 'w-2 h-2 sm:w-2.5 sm:h-2.5' }) => {
  if (!active) {
    return <div className={`${size} rounded-full bg-stone-800/80 border border-stone-700/40`} />;
  }

  const bgRgba = `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.min(1, brightness + 0.2)})`;

  return (
    <div
      className={`${size} rounded-full transition-all duration-75 relative`}
      style={{
        backgroundColor: bgRgba,
        ...glowStyle,
      }}
    >
      <div className="absolute inset-0 rounded-full bg-white/40 scale-50" />
    </div>
  );
};
