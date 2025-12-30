import React from 'react';
import Link from 'next/link';
import styles from './home.module.css';

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
        {/* Mobile Header */}
        <div className={styles.mobileHeader}>
          <span className={styles.logoText}>NovelStudio</span>
        </div>

        <div className={styles.container}>
          {/* Header Section */}
          <div className={styles.headerSection}>
            <div className={styles.titleGroup}>
              <h2 className={styles.title}>My Library</h2>
              <p className={styles.subtitle}>Select a project to continue writing.</p>
            </div>
            <div className={styles.actionGroup}>
              <Link href="/new">
                <button className={styles.createButton}>
                  <span className={`material-symbols-outlined`}>add</span>
                  <span>Create New Novel</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Controls Section */}
          <div className={styles.controlsSection}>
            <div className={styles.searchWrapper}>
              <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
              <input 
                className={styles.searchInput} 
                placeholder="Search titles, characters, or scenes..." 
                type="text" 
              />
            </div>
            <div className={styles.filtersGroup}>
              <button className={styles.filterButton}>
                <span>Sort: Recent</span>
                <span className={`material-symbols-outlined ${styles.filterIcon}`}>keyboard_arrow_down</span>
              </button>
              <button className={styles.filterButton}>
                <span>Status: All</span>
                <span className={`material-symbols-outlined ${styles.filterIcon}`}>keyboard_arrow_down</span>
              </button>
              <button className={styles.filterButton}>
                <span className={`material-symbols-outlined ${styles.filterIcon}`}>grid_view</span>
              </button>
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
                  <p className={styles.newProjectTitle}>New Project</p>
                  <p className={styles.newProjectSubtitle}>Start a fresh manuscript</p>
                </div>
              </button>
            </Link>

            {/* Dynamic Novel Cards */}
            {novels.map((novel) => (
              <Link key={novel.id} href={`/novel/${novel.id}`} style={{display: 'contents'}}>
                <div className={styles.card} style={novel.status === 'draft' && !novel.image_url ? {opacity: 0.75} : {}}>
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
                   
                    <div className={styles.cardOverlayButton}>
                      <button className={styles.menuButton}>
                        <span className="material-symbols-outlined" style={{fontSize: '20px'}}>more_vert</span>
                      </button>
                    </div>
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
