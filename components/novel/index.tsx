import React from 'react';
import Link from 'next/link';
import styles from './novel.module.css';

type NovelData = {
  id: string;
  title: string;
  synopsis: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type NovelProps = {
  novel: NovelData;
  stats: {
    chapters: number;
    characters: number;
  };
};

export default function Novel({ novel, stats }: NovelProps) {
  return (
    <div className={styles.pageWrapper}>
      {/* Sidebar - Desktop Only */}
      <nav className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brand}>
            <h1 className={styles.brandTitle}>
              <span className="material-symbols-outlined" style={{color: 'var(--primary)'}}>edit_note</span>
              WriterPro
            </h1>
            <p className={styles.version}>v2.1</p>
          </div>
          <div className={styles.navMenu}>
            <Link href="/" className={styles.navItem}>
              <span className="material-symbols-outlined">dashboard</span>
              <p className={styles.navText}>Dashboard</p>
            </Link>
            <a href="#" className={`${styles.navItem} ${styles.navItemActive}`}>
              <span className="material-symbols-outlined">library_books</span>
              <p className={styles.navText}>My Novels</p>
            </a>
            <a href="#" className={styles.navItem}>
              <span className="material-symbols-outlined">settings</span>
              <p className={styles.navText}>Settings</p>
            </a>
            <a href="#" className={styles.navItem}>
              <span className="material-symbols-outlined">file_download</span>
              <p className={styles.navText}>Export</p>
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Top Header */}
        <header className={styles.topBar}>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <button className={styles.mobileMenuButton}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className={styles.breadcrumbs}>
              <Link href="/" className={styles.breadcrumbLink}>
                <span className="material-symbols-outlined" style={{fontSize: '18px'}}>home</span>
                Home
              </Link>
              <span className={styles.breadcrumbSeparator}>/</span>
              <Link href="/" className={styles.breadcrumbLink}>My Novels</Link>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span className={styles.breadcrumbCurrent}>{novel.title}</span>
            </div>
          </div>
          
          <div className={styles.topBarActions}>
            <div className={styles.avatar} style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuABa5BdUzss_zAwdWFWSv7rEiHfT26mVjC_CmG2U8YlTDggjjpL2PQ9NKEc03opsMCX2e8_4FJ4cOWJycucFxZye56uTbTE3o8ZRmf_3CgWpexSOr7XFAVyuTVhvr1rJfA0nPt7HyNQOqy0z9uzO2YaRgbLUlzhU6N-jI2PUQmlVLkN_wzWC0KUXf_ZfEFA2M6tOre_NhiSKdlbCWDhENCS131f1qgFL9O3FwFJUvzx8sxMBNmddAXwZ7QK5utfx0NoKqx6GIK4Ajzb")'}}></div>
          </div>
        </header>

        {/* Content Body */}
        <main className={styles.content}>
          {/* Hero Card */}
          <div className={styles.heroCard}>
            <div className={styles.heroContent}>
              <div className={styles.bookInfo}>
                <div 
                  className={styles.bookCover} 
                  style={{
                    backgroundImage: novel.image_url ? `url("${novel.image_url}")` : undefined,
                    backgroundColor: !novel.image_url ? '#e0e7ff' : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {!novel.image_url && (
                    <span className="material-symbols-outlined" style={{fontSize: '48px', color: '#6366f1'}}>menu_book</span>
                  )}
                </div>
                <div className={styles.bookDetails}>
                  <h2 className={styles.bookTitle}>{novel.title}</h2>
                  <div className={styles.tags}>
                    {/* Placeholder tags - could be dynamic later */}
                    <span className={styles.tag}>Novel</span>
                    <span>•</span>
                    <span style={{textTransform: 'capitalize'}}>{novel.status}</span>
                  </div>
                  <p className={styles.description}>
                    {novel.synopsis || "No synopsis available. Click 'Edit Details' to add one."}
                  </p>
                </div>
              </div>
              <button className={styles.editButton}>
                <span className="material-symbols-outlined" style={{fontSize: '20px'}}>edit</span>
                Edit Details
              </button>
            </div>
          </div>

          {/* Grid Links */}
          <div className={styles.grid}>
            {/* Episodes */}
            <Link href={`/novel/${novel.id}/edit`} style={{display: 'contents'}}>
              <div className={styles.card}>
                <div>
                  <div className={`${styles.cardIconWrapper} ${styles.iconBlue}`}>
                    <span className="material-symbols-outlined" style={{fontSize: '30px'}}>menu_book</span>
                  </div>
                  <h3 className={styles.cardTitle}>Episodes</h3>
                  <p className={styles.cardSubtitle}>Manage {stats.chapters} chapters and scenes</p>
                </div>
                <div className={styles.cardFooter}>
                  <span className={`material-symbols-outlined ${styles.arrowIcon}`}>arrow_forward</span>
                </div>
              </div>
            </Link>

            {/* Characters */}
            <Link href={`/novel/${novel.id}/characters`} className={styles.card}>
              <div>
                <div className={`${styles.cardIconWrapper} ${styles.iconPurple}`}>
                  <span className="material-symbols-outlined" style={{fontSize: '30px'}}>groups</span>
                </div>
                <h3 className={styles.cardTitle}>Characters</h3>
                <p className={styles.cardSubtitle}>{stats.characters} active profiles & bios</p>
              </div>
              <div className={styles.cardFooter}>
                <span className={`material-symbols-outlined ${styles.arrowIcon}`}>arrow_forward</span>
              </div>
            </Link>

            {/* Relationships */}
            <a href="#" className={styles.card}>
              <div>
                <div className={`${styles.cardIconWrapper} ${styles.iconEmerald}`}>
                  <span className="material-symbols-outlined" style={{fontSize: '30px'}}>hub</span>
                </div>
                <h3 className={styles.cardTitle}>Relationships</h3>
                <p className={styles.cardSubtitle}>Map connections & arcs</p>
              </div>
              <div className={styles.cardFooter}>
                <span className={`material-symbols-outlined ${styles.arrowIcon}`}>arrow_forward</span>
              </div>
            </a>

            {/* Plot Outline */}
            <a href="#" className={styles.card}>
              <div>
                <div className={`${styles.cardIconWrapper} ${styles.iconAmber}`}>
                  <span className="material-symbols-outlined" style={{fontSize: '30px'}}>timeline</span>
                </div>
                <h3 className={styles.cardTitle}>Plot Outline</h3>
                <p className={styles.cardSubtitle}>Structure the main timeline</p>
              </div>
              <div className={styles.cardFooter}>
                <span className={`material-symbols-outlined ${styles.arrowIcon}`}>arrow_forward</span>
              </div>
            </a>
          </div>

        </main>
      </div>
    </div>
  );
}
