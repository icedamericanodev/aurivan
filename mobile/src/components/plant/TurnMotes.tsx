/**
 * <TurnMotes>: the species' motes rising during The Turning (mobile 1.50,
 * DESIGN_SYSTEM §8.10). At most `motion.celebrate.leaves` (8) Animated.Views,
 * each a static disc or tiny drawing (components/plant/turnSignatures.ts)
 * that moves by transform and opacity only, read from the reveal's one clock
 * on the UI thread. Positions are fixed per mote (engine/turnTimeline.ts
 * moteAt: golden-ratio hashes, never random). Inside the clipped stage only,
 * never over the words. Decorative: hidden from screen readers. Never drawn
 * under Reduce Motion.
 */
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import type { PlantSpecies } from '../../engine/plant';
import { moteAt, type TurnPhases } from '../../engine/turnTimeline';
import { moteShape, type MotePart, type MoteShape } from './turnSignatures';

export interface TurnMotesProps {
  species: PlantSpecies;
  theme: 'light' | 'dark';
  P: TurnPhases;
  clock: SharedValue<number>;
  skip: SharedValue<number>;
  /** Points per stage unit (size / 200). */
  u: number;
  /** The gathered light's centre, the plant's base and the crown's tip, in stage units. */
  light: { cx: number; cy: number };
  base: number;
  tipY: number;
}

function partEl(p: MotePart, i: number, dark: boolean) {
  const fill = p.fill === 'none' ? 'none' : p.fill[dark ? 1 : 0];
  const line = p.stroke ? { stroke: p.stroke[dark ? 1 : 0], strokeWidth: p.sw ?? 0.5 } : {};
  if (p.t === 'path') return <Path key={i} d={p.d} fill={fill} {...line} />;
  if (p.t === 'circle') return <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={fill} {...line} />;
  return <Ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={fill} {...line} />;
}

function OneMote({ k, shape, dark, P, clock, skip, u, light, base, tipY }: { k: number; shape: MoteShape; dark: boolean } & Omit<TurnMotesProps, 'species' | 'theme'>) {
  const box = shape.disc ? shape.disc.r * 2 : (shape.box ?? 12);
  const half = (box * u) / 2;
  const move = shape.move;
  const { cx, cy } = light;
  const style = useAnimatedStyle(() => {
    const m = moteAt(clock.value, k, P);
    const live = m.op > 0;
    let x = cx + m.x;
    let y = cy + 40 + m.y;
    let op = m.op;
    let rot = 0;
    let sx = 1;
    let sc = m.scale;
    switch (move) {
      case 'rock':
        rot = 25 * m.sway;
        break;
      case 'spin':
        rot = 540 * m.spin;
        break;
      case 'flip':
        sx = 0.25 + 0.75 * Math.abs(m.flip);
        break;
      case 'turn':
        rot = 120 * m.spin;
        break;
      case 'turn60':
        rot = 60 * m.spin;
        break;
      case 'grow':
        sc = 0.8 + 0.4 * m.p;
        break;
      case 'spiral': {
        const a = k * 2.39996; // the golden angle, 137.5°
        const r = 6 + 5 * Math.sqrt(k + 1);
        x = cx + r * Math.cos(a);
        y = cy + 40 + 0.85 * m.y + 0.5 * r * Math.sin(a);
        break;
      }
      case 'ring':
        x = 100;
        y = base;
        sc = 0.6 + 0.7 * m.p;
        op = live ? 0.7 * Math.min(1, m.p / 0.15) * (1 - m.p) : 0;
        break;
      case 'node':
        x = 100 + (((k * 0.618034) % 1) * 2 - 1) * 6;
        y = base - 12 - 100 * m.p;
        sc = 1;
        break;
      case 'rimGlint':
        x = 78 + 44 * m.p;
        y = base + 1.5;
        sc = 1;
        op = live ? 0.9 * Math.sin(Math.PI * m.p) : 0;
        break;
      case 'tipGlint':
        x = 100;
        y = tipY + 2;
        sc = 1;
        op = live ? 0.9 * Math.sin(Math.PI * m.p) : 0;
        break;
      default:
        break;
    }
    return {
      opacity: op * (1 - skip.value),
      transform: [{ translateX: x * u - half }, { translateY: y * u - half }, { rotate: `${rot}deg` }, { scaleX: sx * sc }, { scaleY: sc }],
    };
  });
  return (
    <Animated.View style={[styles.mote, { width: box * u, height: box * u }, style]}>
      {shape.disc ? (
        <View style={{ flex: 1, borderRadius: half, backgroundColor: shape.disc.fill[dark ? 1 : 0] }} />
      ) : (
        <Svg width={box * u} height={box * u} viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`}>
          {shape.parts!.map((p, i) => partEl(p, i, dark))}
        </Svg>
      )}
    </Animated.View>
  );
}

function TurnMotesInner(p: TurnMotesProps) {
  const dark = p.theme === 'dark';
  const ks = Array.from({ length: p.P.motes }, (_, k) => k);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {ks.map((k) => (
        <OneMote key={k} k={k} shape={moteShape(p.species, k, p.P.motes)} dark={dark} P={p.P} clock={p.clock} skip={p.skip} u={p.u} light={p.light} base={p.base} tipY={p.tipY} />
      ))}
    </View>
  );
}

export const TurnMotes = memo(TurnMotesInner);

const styles = StyleSheet.create({
  mote: { position: 'absolute', left: 0, top: 0 },
});
