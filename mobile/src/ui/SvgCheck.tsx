import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import type { SvgProps } from "react-native-svg";

// Импорт .svg как React-компонента. Работает благодаря
// react-native-svg-transformer, настроенному в mobile/metro.config.js.
import Check from "../../assets/svg/sample-check.svg";

export type SvgCheckProps = SvgProps & {
  /** Сторона квадрата в пикселях. */
  size?: number;
  /** Цвет обводки для файлового варианта (currentColor). */
  color?: string;
};

/**
 * Заготовка для нового SVG-дизайна: кружок с градиентом и галочкой,
 * нарисованный инлайн примитивами react-native-svg.
 * Ни к одному экрану не подключён — это пример для команды.
 */
export default function SvgCheck({ size = 72, ...props }: SvgCheckProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" {...props}>
      <Defs>
        <LinearGradient id="svgCheckGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#34D399" />
          <Stop offset="1" stopColor="#0EA5E9" />
        </LinearGradient>
      </Defs>
      <Circle cx="32" cy="32" r="30" fill="url(#svgCheckGradient)" />
      <Path
        d="M19 33.5 28 42.5 45.5 23"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Тот же смысл, но из файла assets/svg/sample-check.svg.
 * Цвет меняется через color (в SVG стоит stroke="currentColor") или fill.
 */
export function SvgCheckFile({ size = 24, color = "#0B6BFF", ...props }: SvgCheckProps) {
  return <Check width={size} height={size} color={color} {...props} />;
}
