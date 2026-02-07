'use client';

import React, { useEffect, useState } from 'react';
import styles from './theme-toggle.module.css';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    // ローカルストレージまたはシステム設定からテーマを取得
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    const initialTheme = storedTheme || 
      (root.getAttribute('data-theme') as 'light' | 'dark') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    setTheme(initialTheme);
    // 初期設定がまだ属性に反映されていない場合のためにセット
    if (!root.getAttribute('data-theme')) {
        root.setAttribute('data-theme', initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // ハイドレーションエラーを防ぐため、マウントされるまで何も表示しない
  if (!mounted) {
    return null; 
    // レイアウトシフトが気になる場合は、同じサイズのプレースホルダーを返すと良い
    // return <div className={styles.toggleButton} style={{visibility: 'hidden'}}>Loading</div>;
  }

  return (
    <button className={styles.toggleButton} onClick={toggleTheme} aria-label="Toggle Dark Mode">
      <span className={`material-symbols-outlined ${styles.icon}`}>
        {theme === 'light' ? 'dark_mode' : 'light_mode'}
      </span>
      <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
    </button>
  );
}
