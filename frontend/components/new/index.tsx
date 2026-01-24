"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createNovel, updateNovel, deleteNovel } from '@/app/new/actions';
import styles from './new.module.css';

type NewProps = {
  initialData?: {
    title: string;
    synopsis: string | null;
  };
  novelId?: string;
  backHref?: string;
};

export default function New({ initialData, novelId, backHref = "/" }: NewProps) {
  const [isPending, setIsPending] = useState(false);
  const isEdit = !!novelId;
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    if (isEdit && novelId) {
      await updateNovel(novelId, formData);
    } else {
      await createNovel(formData);
    }
    // Note: If successful, it redirects, so we don't need to set isPending(false)
  }

  async function handleDelete() {
    if (!novelId) return;
    
    const confirmed = window.confirm('この小説を削除してもよろしいですか？この操作は取り消せません。');
    if (!confirmed) return;

    setIsPending(true);
    const result = await deleteNovel(novelId);
    
    if (result?.error) {
      alert(result.error);
      setIsPending(false);
      return;
    }
    
    // 削除成功後、トップページにリダイレクト
    router.push('/');
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logoIcon}>
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z" fill="currentColor" fillRule="evenodd"></path>
            </svg>
          </div>
          <h2 className={styles.logoText}>Novel Studio</h2>
        </div>
        
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.container}>
          
          <div className={styles.backLinkWrapper}>
            <Link href={backHref} className={styles.backLink}>
              <span className="material-symbols-outlined" style={{fontSize: '16px'}}>arrow_back</span>
              {isEdit ? 'Back to Novel' : 'Back to Dashboard'}
            </Link>
          </div>

          <div className={styles.headerContent}>
            <h1 className={styles.title}>{isEdit ? '小説詳細編集' : '新規小説作成'}</h1>
            <p className={styles.subtitle}>
              {isEdit 
                ? '小説の詳細情報を更新します。' 
                : '新しい小説を作成します。詳細を入力して開始します。'}
            </p>
          </div>

          <form action={handleSubmit} className={styles.formSection}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span className={styles.labelText}>小説タイトル</span>
                <input 
                  name="title"
                  autoFocus 
                  className={styles.input} 
                  placeholder="小説タイトルを入力してください。" 
                  type="text" 
                  required
                  defaultValue={initialData?.title}
                />
                <span className={styles.helperText}>A catchy title can be changed later.</span>
              </label>
              
              <label className={styles.label} style={{flexGrow: 1}}>
                <span className={styles.labelText}>概要 / オーバービュー</span>
                <textarea 
                  name="synopsis"
                  className={styles.textarea} 
                  placeholder="In a world where..."
                  defaultValue={initialData?.synopsis || ''}
                ></textarea>
                <span className={styles.helperText}>Write a brief elevator pitch or summary. You can expand on this later.</span>
              </label>

              <div className={styles.footerActions}>
                <div className={styles.leftActions}>
                  {isEdit && (
                    <button 
                      type="button" 
                      className={styles.deleteButton} 
                      onClick={handleDelete}
                      disabled={isPending}
                    >
                      <span className="material-symbols-outlined" style={{fontSize: '20px'}}>
                        delete
                      </span>
                      削除
                    </button>
                  )}
                </div>
                <div className={styles.rightActions}>
                  <Link href={backHref}>
                    <button type="button" className={styles.cancelButton}>
                      キャンセル
                    </button>
                  </Link>
                  <button type="submit" className={styles.createButton} disabled={isPending}>
                    <span className="material-symbols-outlined" style={{fontSize: '20px'}}>
                      {isEdit ? 'save' : 'add'}
                    </span>
                    {isPending 
                      ? (isEdit ? '保存中...' : '作成中...') 
                      : (isEdit ? '保存' : '作成')}
                  </button>
                </div>
              </div>
            </div>
          </form>

        </div>
      </main>
    </div>
  );
}
