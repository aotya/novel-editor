'use client'

import { useActionState } from 'react'
import { login } from './actions'
import styles from './login.module.css'

// Initial state for useActionState
const initialState = {
  error: null as string | null,
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
      const result = await login(formData);
      if (result?.error) {
          return { error: result.error };
      }
      return { error: null };
  }, initialState)

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Welcome Back</h1>
            <p className={styles.subtitle}>小説編集アプリへログイン</p>
          </div>
          
          <form className={styles.form} action={formAction}>
            <div className={styles.inputGroup}>
              <label htmlFor="email-address" className={styles.label}>
                メールアドレス
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={styles.input}
                placeholder="example@email.com"
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={styles.input}
                placeholder="••••••••"
              />
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
              {isPending ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

