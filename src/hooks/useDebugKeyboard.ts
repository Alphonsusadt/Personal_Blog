import { useEffect } from 'react';

export function useDebugKeyboard() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('🎹 Key pressed:', {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        target: e.target,
        defaultPrevented: e.defaultPrevented
      });
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    console.log('🎹 Keyboard debugger active');

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      console.log('🎹 Keyboard debugger removed');
    };
  }, []);
}
