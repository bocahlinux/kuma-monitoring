import { useState } from 'react';
import { getEffectiveTheme, setTheme } from '../theme';

export default function ThemeToggle() {
  const [theme, setThemeState] = useState(getEffectiveTheme);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
      title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
