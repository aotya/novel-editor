'use client';

import React from 'react';
import Link from 'next/link';
import styles from './home.module.css';
import LogoComponent from '@/components/common/logo';
import ThemeToggle from '@/components/common/theme-toggle';

// Type definition for Novel (You might want to move this to a types file later)
type Novel = {
  id: string;
  title: string;
  synopsis: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type HomeProps = {
  novels: Novel[];
};

export default function Home({ novels }: HomeProps) {
  return (
    <div className={styles.wrapper}>
      <main className={styles.main}>

        <div className={styles.container}>
          {/* Header Section */}
          <div className={styles.mainLogoHeader}>
            <div className={styles.logoContainer}>
              <LogoComponent width={260} height={72} />
            </div>
          </div>
          <div className={styles.headerSection}>
            <div className={styles.titleGroup}>
              <h2 className={styles.title}>小説一覧</h2>
            </div>
            <div className={styles.actionGroup}>
              <Link href="/new">
                <button className={styles.createButton}>
                  <span className={`material-symbols-outlined`}>add</span>
                  <span>新規小説作成</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Controls Section */}
          <div className={styles.controlsSection}>
            <div className={styles.filtersGroup}>
              <ThemeToggle />
            </div>
          </div>

          {/* Grid Section */}
          <div className={styles.grid}>
            {/* New Project Card */}
            <Link href="/new" style={{display: 'contents'}}>
              <button className={styles.newProjectCard}>
                <div className={styles.plusIconCircle}>
                  <span className={`material-symbols-outlined ${styles.plusIcon}`}>add</span>
                </div>
                <div className={styles.newProjectText}>
                  <p className={styles.newProjectTitle}>新規小説作成</p>
                </div>
              </button>
            </Link>

            {/* Dynamic Novel Cards */}
            {novels.map((novel) => (
              <Link key={novel.id} href={`/novel/${novel.id}`} style={{display: 'contents'}}>
                <div className={`${styles.card} ${novel.status === 'draft' && !novel.image_url ? styles.cardDraft : ''}`}>
                  <div className={`${styles.cardImageWrapper} ${!novel.image_url ? styles.bgGradientPurple : ''}`}>
                    {novel.image_url ? (
                      <img 
                      alt={novel.title} 
                      className={styles.cardImage} 
                      src={novel.image_url}
                    />
                    ) : (
                      <div className={styles.cardGradient}></div>
                    )}
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.cardTextGroup}>
                      <h3 className={styles.cardTitle}>{novel.title}</h3>
                      <p className={styles.cardDescription} style={!novel.synopsis ? {fontStyle: 'italic'} : {}}>
                        {novel.synopsis || 'No description added yet...'}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
