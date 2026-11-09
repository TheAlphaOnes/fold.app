/**
 * Whether the software keyboard is up. Controls that sit above the keyboard
 * need the bottom safe-area inset only while it's down.
 */

import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setShown(true));
    const hide = Keyboard.addListener(hideEvent, () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}
