# High-Performance Animations

> **KaiSip note.** Frozen, trimmed copy of Callstack's
> `references/js-animations-reanimated.md` (commit 59e9d17, MIT; see
> `README.md`). Review checklist only; Grove §8 and `motion.tsx` win on
> conflict. KaiSip is already on Reanimated 4 with react-native-worklets, and
> `babel-preset-expo` configures the worklets plugin. Cut: the frontmatter,
> the install command and Babel setup, the Reanimated 3 → 4 migration
> checklist, and links to files that were not vendored. The examples use
> `.value`; prefer `.get()` / `.set()` (see `expo-animation.md` §6).

Use React Native Reanimated for smooth 60+ FPS animations.

## Quick Pattern

**Incorrect (JS thread - blocks on heavy work):**

```jsx
const opacity = useRef(new Animated.Value(0)).current;
Animated.timing(opacity, { toValue: 1 }).start();
```

**Correct (UI thread - smooth even during JS work):**

```jsx
const opacity = useSharedValue(0);
const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
opacity.value = withTiming(1);
```

## When to Use

- Animations drop frames or feel janky
- UI freezes during animations
- Need gesture-driven animations
- Want animations to run during heavy JS work

## Prerequisites

- `react-native-reanimated` (v4+) and `react-native-worklets` (both already in KaiSip)

> **Note**: Reanimated 4 requires React Native's **New Architecture** (Fabric + TurboModules). The Legacy Architecture is no longer supported.

## Key Concepts

### Main Thread vs JS Thread

- **Main/UI Thread**: Handles native rendering (60+ FPS target)
- **JS Thread**: Runs React and your JavaScript

**Problem**: Heavy JS work blocks animations running on JS thread.

**Solution**: Run animations on UI thread with Reanimated worklets.

## Step-by-Step Instructions

### 1. Basic Animated Style (UI Thread)

```jsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming
} from 'react-native-reanimated';

const FadeInView = () => {
  const opacity = useSharedValue(0);

  // This runs on UI thread - won't be blocked by JS
  const animatedStyle = useAnimatedStyle(() => {
    return { opacity: opacity.value };
  });

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
  }, []);

  return <Animated.View style={[styles.box, animatedStyle]} />;
};
```

### 2. Run Code on UI Thread with `scheduleOnUI`

```jsx
import { scheduleOnUI } from 'react-native-worklets';

const triggerAnimation = () => {
  scheduleOnUI(() => {
    'worklet';
    console.log('Running on UI thread');
    // Direct UI manipulations here
  });
};
```

### 3. Call JS from UI Thread with `scheduleOnRN`

```jsx
import { scheduleOnRN } from 'react-native-worklets';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

// Regular JS function
const trackAnalytics = (value) => {
  analytics.track('animation_complete', { value });
};

const AnimatedComponent = () => {
  const progress = useSharedValue(0);

  const handlePress = () => {
    progress.value = withTiming(1, { duration: 200 }, (finished) => {
      if (finished) {
        scheduleOnRN(trackAnalytics, 1);
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return { opacity: progress.value };
  });

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={animatedStyle} />
    </Pressable>
  );
};
```

Avoid calling `scheduleOnRN` from `useAnimatedStyle`; style worklets can evaluate more often than an analytics or state callback should run. Prefer animation completion callbacks or `useAnimatedReaction`.

### 4. Animation with Callback

```jsx
import { scheduleOnRN } from 'react-native-worklets';

const AnimatedButton = () => {
  const scale = useSharedValue(1);

  const onComplete = () => {
    console.log('Animation finished!');
  };

  const handlePress = () => {
    scale.value = withTiming(
      1.2,
      { duration: 200 },
      (finished) => {
        if (finished) {
          scheduleOnRN(onComplete);
        }
      }
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.button, animatedStyle]}>
        <Text>Press Me</Text>
      </Animated.View>
    </Pressable>
  );
};
```

## When to Use What

| Thread | Best For |
|--------|----------|
| **UI Thread** (worklets) | Visual animations, transforms, gestures |
| **JS Thread** | State updates, data processing, API calls |

| Hook/API | Use Case |
|----------|----------|
| `useAnimatedStyle` | Animated styles (auto UI thread) |
| `scheduleOnUI` | Manual UI thread execution (from `react-native-worklets`) |
| `scheduleOnRN` | Call JS functions from worklets (from `react-native-worklets`) |
| `useTransition` | Alternative for React state-driven delays |

For React Native Web targets, CSS transitions can be appropriate for simple state-driven style changes. In native apps, keep shared values/worklets for gesture-driven, scroll-driven, layout-sensitive, or orchestrated animations.

## Common Pitfalls

- **Accessing React state in worklets**: Use `useSharedValue` instead of `useState` for animated values
- **Not using Animated components**: Must use `Animated.View`, `Animated.Text`, etc.
- **Heavy computation in useAnimatedStyle**: Keep worklets fast
- **Forgetting 'worklet' directive**: Required for inline worklet functions

```jsx
// BAD: Regular function in useAnimatedStyle
const style = useAnimatedStyle(() => {
  heavyComputation();  // Blocks UI thread!
  return { opacity: 1 };
});

// GOOD: Keep worklets fast
const style = useAnimatedStyle(() => {
  return { opacity: opacity.value };  // Just read value
});
```

## Migrating from Reanimated 3.x to 4.x

If you're upgrading from Reanimated 3.x, here are the key changes.

> **Can't upgrade to v4?** If your project is blocked from migrating to New Architecture (e.g., incompatible native libraries, complex native code, or timeline constraints), keep using existing APIs and leverage native drivers where applicable. Avoid introducing legacy Reanimated 3.x or older to reduce future migration complexity.

### Breaking Changes

| Old API (v3) | New API (v4) | Package |
|--------------|--------------|---------|
| `runOnUI(() => {...})()` | `scheduleOnUI(() => {...})` | `react-native-worklets` |
| `runOnJS(fn)(args)` | `scheduleOnRN(fn, args)` | `react-native-worklets` |
| `executeOnUIRuntimeSync` | `runOnUISync` | `react-native-worklets` |
| `runOnRuntime` | `scheduleOnRuntime` | `react-native-worklets` |
| `useScrollViewOffset` | `useScrollOffset` | `react-native-reanimated` |
| `useWorkletCallback` | Use `useCallback` with `'worklet';` directive | React |

### Removed APIs

- `useAnimatedGestureHandler` - Migrate to the Gesture API from `react-native-gesture-handler` v2+
- `addWhitelistedNativeProps` / `addWhitelistedUIProps` - No longer needed
- `combineTransition` - Use `EntryExitTransition.entering(...).exiting(...)` instead

### withSpring Changes

```jsx
// Before (v3)
withSpring(value, {
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
  duration: 300,
});

// After (v4)
withSpring(value, {
  energyThreshold: 0.01,  // Replaces both threshold parameters
  duration: 200,          // Duration is now "perceptual" (~1.5x actual time)
});
```

## Related references (this folder)

- `expo-animation.md` - when and how to animate, Reduce Motion, haptics
- `callstack-js-profile-react.md` - find the renders behind a dropped frame
