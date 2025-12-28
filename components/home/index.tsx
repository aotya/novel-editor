import React from 'react';
import Link from 'next/link';
import styles from './home.module.css';

export default function Home() {
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

          {/* ... existing code ... */}

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

            {/* Card 1: The Glass Horizon */}
            <Link href="/novel/the-glass-horizon" style={{display: 'contents'}}>
              <div className={styles.card}>
                <div className={styles.cardImageWrapper}>
                  <img 
                    alt="Mysterious foggy forest landscape representing a thriller novel cover" 
                    className={styles.cardImage} 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD438v32Me0dNK4IAtAy54ahGtk-XAMVA1nCT3NsnRpiomDzRtx2QO49Jz6eabZy84vA24GUY6hl1edSziY9wWn1QMeI2CEmtb4NuC_MfLFZbxy5Hzw10US6aNn0tkDi6Qey7shaGki1NuVPuXozVgAYQtY8ZnQWu4M2ONYQqIsY6PnbuWkfnrdmnIrQ2RKdazDPlmtoy4v8zTcLUNO3-wasJcMY5EQ5VHIFMOPr2IJ7MbYiZzd_SHmZ8KLJ79NrMYgYD2YDY_0cRhj"
                  />
                  <div className={styles.cardGradient}></div>
                  <div className={styles.cardOverlayButton}>
                    <button className={styles.menuButton}>
                      <span className="material-symbols-outlined" style={{fontSize: '20px'}}>more_vert</span>
                    </button>
                  </div>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.cardTextGroup}>
                    <h3 className={styles.cardTitle}>The Glass Horizon</h3>
                    <p className={styles.cardDescription}>A mystery set in a world where the sky is made of fragile glass.</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Card 2: Midnight Echoes */}
            <Link href="/novel/midnight-echoes" style={{display: 'contents'}}>
              <div className={styles.card}>
                <div className={`${styles.cardImageWrapper} ${styles.bgGradientPurple}`}>
                  <div className={styles.cardGradient}></div>
                  <div className={styles.cardOverlayButton}>
                    <button className={styles.menuButton}>
                      <span className="material-symbols-outlined" style={{fontSize: '20px'}}>more_vert</span>
                    </button>
                  </div>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.cardTextGroup}>
                    <h3 className={styles.cardTitle}>Midnight Echoes</h3>
                    <p className={styles.cardDescription}>Sci-fi noir anthology about sounds from the past.</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Card 3: The Last Alchemist */}
            <Link href="/novel/the-last-alchemist" style={{display: 'contents'}}>
              <div className={styles.card}>
                <div className={styles.cardImageWrapper}>
                  <img 
                    alt="Starry night sky over mountains representing a fantasy novel cover" 
                    className={styles.cardImage} 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB995ayFn09yjEDvFYt6IgM0UWEpSiUHGkg7KGMQp8PwupBrpoyQGqEx50K-128WuPCUka7WQ_4dc4zvJmclRkqaBlF3KvITyDyfDB4Rg56NcBS7KCxfM2QvGXnuhz7uAZIZV9jhn90DlLL2PlybhSVHqtZi6ILPt38YZSuFWNIlzQ-1Pyg6UmFfaWghaFCQizS4xLZV2IZsc9QDqOxSSPOjNKuRn_1EysNLyi7IrDTPaW5m7CywMclxL7NLJgW1x5K4mgsPWDQvuLq"
                  />
                  <div className={styles.cardGradient}></div>
                  <div className={styles.cardOverlayButton}>
                    <button className={styles.menuButton}>
                      <span className="material-symbols-outlined" style={{fontSize: '20px'}}>more_vert</span>
                    </button>
                  </div>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.cardTextGroup}>
                    <h3 className={styles.cardTitle}>The Last Alchemist</h3>
                    <p className={styles.cardDescription}>Fantasy epic about the rediscovery of magic.</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Card 4: Untitled Draft #4 */}
            <Link href="/novel/untitled-draft-4" style={{display: 'contents'}}>
              <div className={styles.card} style={{opacity: 0.75}}>
                <div className={`${styles.cardImageWrapper} ${styles.bgGradientGray}`}>
                  <div className={styles.cardGradient}></div>
                  <div className={styles.cardOverlayButton}>
                    <button className={styles.menuButton}>
                      <span className="material-symbols-outlined" style={{fontSize: '20px'}}>more_vert</span>
                    </button>
                  </div>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.cardTextGroup}>
                    <h3 className={styles.cardTitle}>Untitled Draft #4</h3>
                    <p className={styles.cardDescription} style={{fontStyle: 'italic'}}>No description added yet...</p>
                  </div>
                </div>
              </div>
            </Link>

          </div>
        </div>
      </main>
    </div>
  );
}
