import React, { useEffect } from 'react';
import Svg, { Path, Rect, Defs, ClipPath, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withRepeat,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * FloatingBubble: A single animated bubble for the empty state.
 * Floats upward and fades out, repeating in a loop.
 */
const FloatingBubble = ({ cx, r, delay, duration, cupY, height }) => {
  const cy = useSharedValue(cupY + height * 0.85);
  const opac = useSharedValue(0.7);

  useEffect(() => {
    cy.value = withDelay(
      delay,
      withRepeat(withTiming(cupY + height * 0.15, { duration }), -1, false)
    );
    opac.value = withDelay(
      delay,
      withRepeat(withTiming(0, { duration }), -1, false)
    );
  }, [delay, duration, cupY, height]);

  const animatedProps = useAnimatedProps(() => ({
    cy: cy.value,
    opacity: opac.value,
  }));

  return (
    <AnimatedCircle
      cx={cx}
      r={r}
      stroke="#08D9D6"
      strokeWidth={1.5}
      fill="none"
      animatedProps={animatedProps}
    />
  );
};

/**
 * FloatingBubbles: Empty state with three staggered floating bubbles.
 */
const FloatingBubbles = ({ width, cupY, height }) => {
  const bubbles = [
    { cx: width * 0.3, r: 4, delay: 0, duration: 1800 },
    { cx: width * 0.55, r: 6, delay: 600, duration: 2200 },
    { cx: width * 0.72, r: 3, delay: 1200, duration: 1600 },
  ];

  return bubbles.map((b, i) => (
    <FloatingBubble key={i} {...b} cupY={cupY} height={height} />
  ));
};

/**
 * AnimatedFillLayer: A single layer within the cup, animated with spring physics.
 */
const AnimatedFillLayer = ({ color, targetY, targetH, cupW, clipId }) => {
  const hVal = useSharedValue(0);
  const yVal = useSharedValue(targetY + targetH); // start below

  useEffect(() => {
    hVal.value = withSpring(targetH, { damping: 14, stiffness: 90 });
    yVal.value = withSpring(targetY, { damping: 14, stiffness: 90 });
  }, [targetY, targetH]);

  const animatedProps = useAnimatedProps(() => ({
    height: hVal.value,
    y: yVal.value,
  }));

  return (
    <AnimatedRect
      x={0}
      width={cupW}
      fill={color}
      clipPath={`url(#${clipId})`}
      animatedProps={animatedProps}
    />
  );
};

/**
 * Gif: Main component – SVG cup with animated fill layers, floating bubbles, and straw.
 */
const Gif = ({ layers = [], height = 250, width = 160 }) => {
  const cupY = height * 0.32; // straw overhang above cup top
  const totalSVGH = height + cupY;
  const taper = width * 0.12; // tapers inward by this amount at bottom
  const cornerR = Math.min(width * 0.18, 28);
  const hasLayers = layers && layers.length > 0;

  // Build cup path (tapered trapezoid with rounded bottom, open top)
  const cupPath = `
    M 0 ${cupY}
    L ${width} ${cupY}
    L ${width - taper} ${cupY + height - cornerR}
    Q ${width - taper} ${cupY + height} ${width - taper - cornerR} ${cupY + height}
    L ${taper + cornerR} ${cupY + height}
    Q ${taper} ${cupY + height} ${taper} ${cupY + height - cornerR}
    L 0 ${cupY} Z
  `.trim();

  // Compute layer positions from bottom up
  const computedLayers = layers.map((layer, i) => {
    const layerH = (layer.height / 100) * height;
    const cumulativeFromBottom = layers
      .slice(0, i + 1)
      .reduce((sum, l) => sum + (l.height / 100) * height, 0);
    return {
      color: layer.color,
      targetH: layerH,
      targetY: cupY + height - cumulativeFromBottom,
    };
  });

  // Bent straw path (angular style matching CodePop logo)
  const strawPath = `
    M ${width * 0.6} 0
    L ${width * 0.6} ${cupY * 0.5}
    L ${width * 0.55} ${cupY}
    L ${width * 0.55} ${cupY + height * 0.72}
  `.trim();

  const strawW = Math.max(5, width * 0.075);

  return (
    <Svg width={width} height={totalSVGH} viewBox={`0 0 ${width} ${totalSVGH}`}>
      <Defs>
        <ClipPath id="cup">
          <Path d={cupPath} />
        </ClipPath>
      </Defs>

      {/* Fill layers */}
      {computedLayers.map((layer, i) => (
        <AnimatedFillLayer
          key={`${layer.color}-${i}`}
          {...layer}
          cupW={width}
          clipId="cup"
        />
      ))}

      {/* Empty state floating bubbles */}
      {!hasLayers && <FloatingBubbles width={width} cupY={cupY} height={height} />}

      {/* Cup outline on top of fills */}
      <Path
        d={cupPath}
        stroke="#E5E7EB"
        strokeWidth={Math.max(2, width * 0.016)}
        fill="none"
      />

      {/* Straw on top of everything */}
      <Path
        d={strawPath}
        stroke="#08D9D6"
        strokeWidth={strawW}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default Gif;