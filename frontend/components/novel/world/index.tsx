'use client';

import React, { useState, useEffect } from 'react';
import styles from './world.module.css';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import LogoComponent from '@/components/common/logo';

const CATEGORIES = ['国家', '組織', '制度', '宗教', '地域', 'その他'] as const;

type WorldElement = {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
};

type Props = {
  novelId: string;
};

const EMPTY_ELEMENT: WorldElement = {
  id: 'new',
  name: '',
  category: '国家',
  description: '',
  imageUrl: '',
};

export default function WorldElementEditor({ novelId }: Props) {
  const [activeElementId, setActiveElementId] = useState<string>('new');
  const [isEditing, setIsEditing] = useState(false);
  const [elements, setElements] = useState<WorldElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [formData, setFormData] = useState<WorldElement>(EMPTY_ELEMENT);

  const supabase = createClient();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchElements = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('world_elements')
        .select('*')
        .eq('novel_id', novelId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching world elements:', error);
        setLoading(false);
        return;
      }

      if (data) {
        const formatted: WorldElement[] = data.map(el => ({
          id: el.id,
          name: el.name,
          category: el.category || '国家',
          description: el.description || '',
          imageUrl: el.image_url || '',
        }));

        setElements(formatted);

        if (formatted.length > 0) {
          setActiveElementId(formatted[0].id);
          setFormData(formatted[0]);
          setIsEditing(false);
        } else {
          setActiveElementId('new');
          setFormData(EMPTY_ELEMENT);
          setIsEditing(true);
        }
      }
      setLoading(false);
    };

    fetchElements();
  }, [novelId, supabase]);

  const handleElementSelect = (id: string) => {
    if (saving) return;
    setActiveElementId(id);
    const selected = elements.find(e => e.id === id);
    if (selected) {
      setFormData(selected);
      setIsEditing(false);
    }
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleNewElement = () => {
    if (saving) return;
    setActiveElementId('new');
    setFormData(EMPTY_ELEMENT);
    setIsEditing(true);
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleInputChange = (field: keyof WorldElement, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `world_elements/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('novel_image')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('novel_image')
        .getPublicUrl(filePath);

      handleInputChange('imageUrl', data.publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert('名前は必須です');
      return;
    }

    setSaving(true);

    const dbData = {
      novel_id: novelId,
      name: formData.name,
      category: formData.category,
      description: formData.description,
      image_url: formData.imageUrl,
    };

    if (activeElementId === 'new') {
      const { data, error } = await supabase
        .from('world_elements')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting world element:', error);
        alert('Failed to save');
      } else if (data) {
        const newEl: WorldElement = { ...formData, id: data.id };
        setElements(prev => [...prev, newEl]);
        setActiveElementId(data.id);
        setIsEditing(false);
      }
    } else {
      const { error } = await supabase
        .from('world_elements')
        .update(dbData)
        .eq('id', activeElementId);

      if (error) {
        console.error('Error updating world element:', error);
        alert('Failed to save');
      } else {
        setElements(prev => prev.map(e => e.id === activeElementId ? formData : e));
        setIsEditing(false);
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (activeElementId === 'new') return;
    if (!window.confirm('この要素を削除してもよろしいですか？')) return;

    const { error } = await supabase
      .from('world_elements')
      .delete()
      .eq('id', activeElementId);

    if (error) {
      console.error('Error deleting world element:', error);
      alert('Failed to delete');
      return;
    }

    const remaining = elements.filter(e => e.id !== activeElementId);
    setElements(remaining);

    if (remaining.length > 0) {
      setActiveElementId(remaining[0].id);
      setFormData(remaining[0]);
      setIsEditing(false);
    } else {
      setActiveElementId('new');
      setFormData(EMPTY_ELEMENT);
      setIsEditing(true);
    }
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#a29db8' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.logoText}>
            <LogoComponent width={200} height={55} />
          </h2>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.navLinks}>
            <Link className={styles.navLink} href="#">Dashboard</Link>
          </div>
        </div>
      </header>

      <div className={styles.mainWrapper}>
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.mobileOpen : ''}`}>
          <div className={styles.sidebarHeader}>
            <button className={styles.newElementButton} onClick={handleNewElement}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
              <span>新しい要素</span>
            </button>
          </div>

          <div className={styles.elementList}>
            {elements.map((el) => (
              <div
                key={el.id}
                className={`${styles.elementItem} ${activeElementId === el.id ? styles.elementItemActive : ''}`}
                onClick={() => handleElementSelect(el.id)}
              >
                <div
                  className={styles.elementIcon}
                  style={{
                    backgroundImage: el.imageUrl ? `url("${el.imageUrl}")` : undefined,
                    backgroundColor: !el.imageUrl ? '#353345' : undefined,
                  }}
                >
                  {!el.imageUrl && (
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#a29db8' }}>public</span>
                  )}
                </div>
                <div className={styles.elementInfo}>
                  <p className={styles.elementName}>{el.name}</p>
                  <p className={styles.elementCategory}>{el.category}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.sidebarFooter}>
            <div className={styles.sidebarStats}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>info</span>
              <span>{elements.length} 件の要素</span>
            </div>
          </div>
        </aside>

        <main className={styles.mainContent}>
          <div className={styles.contentContainer}>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.pageTitle}>
                  {isEditing ? (activeElementId === 'new' ? '新しい要素' : '要素を編集') : formData.name}
                  {isEditing && <span className={styles.draftBadge}>Draft</span>}
                </h1>
                <p className={styles.pageSubtitle}>
                  {isEditing
                    ? '世界の要素（国家・組織・制度など）を記述してください。'
                    : formData.category}
                </p>
              </div>
              <div className={styles.actionButtons}>
                {!isEditing && elements.length > 0 && (
                  <>
                    <button
                      className={styles.iconButton}
                      title="Edit"
                      onClick={() => setIsEditing(true)}
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      className={styles.iconButton}
                      title="Delete"
                      onClick={handleDelete}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                <div className={styles.photoUpload}>
                  <label className={styles.photoLabel}>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/gif, image/webp, image/svg+xml"
                      style={{ display: 'none' }}
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <div
                      className={styles.photoPreview}
                      style={{
                        backgroundImage: formData.imageUrl ? `url("${formData.imageUrl}")` : undefined,
                        backgroundColor: !formData.imageUrl ? '#2b2938' : undefined,
                        opacity: uploadingImage ? 0.5 : 1,
                      }}
                    >
                      {uploadingImage ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#a29db8' }}>refresh</span>
                        </div>
                      ) : !formData.imageUrl && (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#403c53' }}>public</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.photoOverlay}>
                      <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'white', marginBottom: '8px' }}>add_a_photo</span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {uploadingImage ? 'Uploading...' : 'Upload Image'}
                      </span>
                    </div>
                    <div className={styles.editIconBadge}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', display: 'block' }}>edit</span>
                    </div>
                  </label>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>アイコン画像</p>
                    <p style={{ color: '#a29db8', fontSize: '12px', marginTop: '2px' }}>Recommended size: 400x400px</p>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>名前</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="例：エルディア帝国、賢者の塔など"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>カテゴリ</label>
                  <div className={styles.selectWrapper}>
                    <select
                      className={`${styles.input} ${styles.select}`}
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <span className={`material-symbols-outlined ${styles.selectIcon}`}>expand_more</span>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span>
                    説明
                  </label>
                  <textarea
                    className={`${styles.input} ${styles.textarea}`}
                    rows={8}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="地理、歴史、政治体制、文化、特徴など..."
                  />
                </div>

                <div className={styles.formActions}>
                  <button
                    className={styles.cancelButton}
                    type="button"
                    onClick={() => {
                      if (activeElementId === 'new' && elements.length > 0) {
                        setActiveElementId(elements[0].id);
                        setFormData(elements[0]);
                        setIsEditing(false);
                      } else if (elements.length > 0) {
                        setIsEditing(false);
                        const original = elements.find(e => e.id === activeElementId);
                        if (original) setFormData(original);
                      }
                    }}
                    disabled={saving}
                  >
                    キャンセル
                  </button>
                  <button
                    className={styles.saveButton}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.viewContainer}>
                <div className={styles.viewHeaderInfo}>
                  <div
                    className={styles.photoPreview}
                    style={{
                      backgroundImage: formData.imageUrl ? `url("${formData.imageUrl}")` : undefined,
                      backgroundColor: !formData.imageUrl ? '#2b2938' : undefined,
                      margin: '0 auto 1.5rem auto',
                    }}
                  >
                    {!formData.imageUrl && (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#403c53' }}>public</span>
                      </div>
                    )}
                  </div>
                  <h2 className={styles.viewName}>{formData.name}</h2>
                  <p className={styles.viewCategory}>{formData.category}</p>
                </div>

                <div className={styles.divider} style={{ marginBottom: '2rem' }} />

                <div className={styles.viewSection}>
                  <div className={styles.viewLabel}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span>
                    説明
                  </div>
                  <p className={styles.viewValue}>{formData.description}</p>
                </div>
              </div>
            )}
          </div>

          {!isEditing && elements.length > 0 && (
            <button
              className={styles.fab}
              onClick={() => setIsEditing(true)}
              title="Edit"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>edit</span>
            </button>
          )}
        </main>
      </div>

      <div
        className={`${styles.mobileOverlay} ${isSidebarOpen ? styles.show : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <footer className={styles.mobileFooter}>
        <div className={styles.mobileFooterContent}>
          <button
            className={styles.mobileFooterButton}
            onClick={() => setIsSidebarOpen(true)}
          >
            <span className="material-symbols-outlined">public</span>
            <span>要素一覧</span>
          </button>
          <button
            className={`${styles.mobileFooterButton} ${styles.mobileFooterButtonPrimary}`}
            onClick={handleNewElement}
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span>新しい要素</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
