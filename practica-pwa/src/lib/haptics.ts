export function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const pattern = {
      light: 10,
      medium: 20,
      heavy: 50,
    };
    navigator.vibrate(pattern[type]);
  }
}

export function triggerPattern(pattern: number[]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}