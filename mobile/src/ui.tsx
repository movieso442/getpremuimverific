import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true)
  useEffect(() => {
    let mounted = true
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value) })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => { mounted = false; subscription.remove() }
  }, [])
  return reduced
}
export function ScreenTransition({ active, children }: { active: boolean; children: ReactNode }) {
  const reduced = useReducedMotion()
  const opacity = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (!active || reduced) { opacity.setValue(1); return }
    opacity.setValue(0.4)
    const transition = Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true })
    transition.start()
    return () => transition.stop()
  }, [active, reduced, opacity])
  return <Animated.View style={{ display: active ? 'flex' : 'none', opacity, gap: 16 }} accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}>{children}</Animated.View>
}
export function ActionButton({ title, onPress, disabled = false, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  const reduced = useReducedMotion()
  const scale = useRef(new Animated.Value(1)).current
  const animate = (value: number) => { if (!reduced) Animated.timing(scale, { toValue: value, duration: 100, useNativeDriver: true }).start() }
  return <Animated.View style={{ transform: [{ scale }] }}><Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} onPressIn={() => animate(0.98)} onPressOut={() => animate(1)} style={[styles.button, secondary && styles.secondary, disabled && { opacity: 0.5 }]}><Text style={[styles.buttonText, secondary && { color: '#9a3412' }]}>{title}</Text></Pressable></Animated.View>
}
export function Icon({ name, color = '#52647a', size = 22, style }: { name: React.ComponentProps<typeof Ionicons>['name']; color?: string; size?: number; style?: StyleProp<ViewStyle> }) {
  return <Ionicons name={name} color={color} size={size} style={style} />
}
const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: 16, backgroundColor: '#c2410c', padding: 16, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
