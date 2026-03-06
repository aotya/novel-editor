'use client'

import { useState, useActionState } from 'react'
import { login } from './actions'
import styles from './login.module.css'
import Image from 'next/image'
import Link from 'next/link'
import LogoComponent from '@/components/common/logo'

// Initial state for useActionState
const initialState = {
  error: null as string | null,
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
      const result = await login(formData);
      if (result?.error) {
          return { error: result.error };
      }
      return { error: null };
  }, initialState)

  return (
    <div className={styles.container}>
      {/* 左側：背景画像と引用文 */}
      <div className={styles.imageSection}>
        <Image
          src="/login_image.webp"
          alt="Writing inspiration"
          fill
          className={styles.backgroundImage}
          priority
        />
        <div className={styles.overlay} />
        <div className={styles.quoteContainer}>
          <blockquote className={styles.quote}>
            "There is no greater agony than bearing an untold story inside you."
          </blockquote>
          <cite className={styles.author}>— Maya Angelou</cite>
        </div>
      </div>

      {/* 右側：ログインフォーム */}
      <div className={styles.formSection}>
        <div className={styles.formWrapper}>
          <div className={styles.logoContainer}>
            <LogoComponent width={300}  />

          </div>
          
          <form className={styles.form} action={formAction}>
            <div className={styles.inputGroup}>
              <label htmlFor="email-address" className={styles.label}>
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={styles.input}
                placeholder="name@example.com"
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={styles.input}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className={styles.forgotPassword}>
              <Link href="/forgot-password">Forgot password?</Link>
            </div>

            {state?.error && (
              <div className={styles.errorMessage}>
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className={styles.submitButton}
            >
              {isPending ? 'Logging in...' : 'Log in'}
            </button>

            <div className={styles.signupLink}>
              New here? <Link href="/signup">Create an account</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
