import React from 'react';
import Link from 'next/link';
import styles from './novel.module.css';

export default function Novel() {
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
              <a href="#" className={styles.breadcrumbLink}>My Novels</a>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span className={styles.breadcrumbCurrent}>The Last Alchemist</span>
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
                  style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBWGkW8sOouOaEx3xIOWOka6zktO6brZRle__NNWqn7bqJjPtF8FY0tWX9cSK8-3Kb-jfBlZsavdFgn8hrF8_VysM04PESIDmqvTUpETYntug95rqSDTh0I3ifNJJMW-TlnKiLY1hzMG--mQMr1Q-BTp7_Ae438k5cUSi5aYy2OTGj2XDT7gwkUkTKmkYKtKM7LHzUyEfbn4XJUrSW9bswV24Q1oQZ2lGuJ_pMpUre9mm5OFNNfSSYu1YlzghIJfwpr6KYWelu5397o")'}}
                ></div>
                <div className={styles.bookDetails}>
                  <h2 className={styles.bookTitle}>The Last Alchemist</h2>
                  <div className={styles.tags}>
                    <span className={styles.tag}>Fantasy</span>
                    <span>•</span>
                    <span>Young Adult</span>
                    <span>•</span>
                    <span>Draft 1</span>
                  </div>
                  <p className={styles.description}>In a world where magic has faded to myth, a young apprentice discovers the last remaining transmutation circle hidden beneath the royal archives.</p>
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
            <Link href="/novel/the-last-starship/edit" style={{display: 'contents'}}>
              <div className={styles.card}>
                <div>
                  <div className={`${styles.cardIconWrapper} ${styles.iconBlue}`}>
                    <span className="material-symbols-outlined" style={{fontSize: '30px'}}>menu_book</span>
                  </div>
                  <h3 className={styles.cardTitle}>Episodes</h3>
                  <p className={styles.cardSubtitle}>Manage 12 chapters and scenes</p>
                </div>
                <div className={styles.cardFooter}>
                  <span className={`material-symbols-outlined ${styles.arrowIcon}`}>arrow_forward</span>
                </div>
              </div>
            </Link>

            {/* Characters */}
            <a href="#" className={styles.card}>
              <div>
                <div className={`${styles.cardIconWrapper} ${styles.iconPurple}`}>
                  <span className="material-symbols-outlined" style={{fontSize: '30px'}}>groups</span>
                </div>
                <h3 className={styles.cardTitle}>Characters</h3>
                <p className={styles.cardSubtitle}>8 active profiles & bios</p>
              </div>
              <div className={styles.cardFooter}>
                <span className={`material-symbols-outlined ${styles.arrowIcon}`}>arrow_forward</span>
              </div>
            </a>

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
