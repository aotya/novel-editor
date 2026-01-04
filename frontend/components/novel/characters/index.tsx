'use client';

import React, { useState, useEffect } from 'react';
import styles from './characters.module.css';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Character = {
  id: string;
  name: string;
  role: string;
  age: string;
  gender: string;
  description: string;
  appearance: string;
  firstPerson: string;
  secondPerson: string;
  speechStyle: string;
  personality: string;
  dialogue: string;
  combat: string;
  magic: string;
  notes: string;
  imageUrl: string;
  isMain?: boolean;
};

type Props = {
  novelId: string;
};

const EMPTY_CHARACTER: Character = {
  id: 'new',
  name: '',
  role: '主人公',
  age: '',
  gender: 'Male',
  description: '',
  appearance: '',
  firstPerson: '',
  secondPerson: '',
  speechStyle: '',
  personality: '',
  dialogue: '',
  combat: '',
  magic: '',
  notes: '',
  imageUrl: ''
};

export default function CharacterEditor({ novelId }: Props) {
  const [activeCharId, setActiveCharId] = useState<string>('new');
  const [isEditing, setIsEditing] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Character>(EMPTY_CHARACTER);

  const supabase = createClient();
  const router = useRouter();

  // Fetch characters
  useEffect(() => {
    const fetchCharacters = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('novel_id', novelId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching characters:', error);
        setLoading(false);
        return;
      }

      if (data) {
        const formattedCharacters: Character[] = data.map(char => ({
          id: char.id,
          name: char.name,
          role: char.role || '主人公',
          age: char.age || '',
          gender: char.gender || 'Male',
          description: char.bio || '', // Map bio to description
          appearance: char.appearance || '',
          firstPerson: char.first_person || '',
          secondPerson: char.second_person || '',
          speechStyle: char.speech_style || '',
          personality: char.personality || '',
          dialogue: char.sample_dialogue || '',
          combat: char.battle_type || '',
          magic: char.magic || '',
          notes: char.other_notes || '',
          imageUrl: char.image_url || '',
          isMain: char.is_main || false
        }));
        
        setCharacters(formattedCharacters);
        
        // Set initial active character
        if (formattedCharacters.length > 0) {
          setActiveCharId(formattedCharacters[0].id);
          setFormData(formattedCharacters[0]);
          setIsEditing(false);
        } else {
          setActiveCharId('new');
          setFormData(EMPTY_CHARACTER);
          setIsEditing(true);
        }
      }
      setLoading(false);
    };

    fetchCharacters();
  }, [novelId, supabase]);

  const activeCharacter = activeCharId === 'new' 
    ? formData 
    : characters.find(c => c.id === activeCharId) || EMPTY_CHARACTER;

  const handleCharacterSelect = (id: string) => {
    if (saving) return;
    
    setActiveCharId(id);
    const selectedChar = characters.find(c => c.id === id);
    if (selectedChar) {
      setFormData(selectedChar);
      setIsEditing(false);
    }
  };

  const handleNewCharacter = () => {
    if (saving) return;
    
    setActiveCharId('new');
    setFormData(EMPTY_CHARACTER);
    setIsEditing(true);
  };

  const handleInputChange = (field: keyof Character, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `characters/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('novel_image')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

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
      alert('Character Name is required');
      return;
    }

    setSaving(true);

    const dbData = {
      novel_id: novelId,
      name: formData.name,
      role: formData.role,
      age: formData.age,
      gender: formData.gender,
      bio: formData.description, // Map description to bio
      appearance: formData.appearance,
      first_person: formData.firstPerson,
      second_person: formData.secondPerson,
      speech_style: formData.speechStyle,
      personality: formData.personality,
      sample_dialogue: formData.dialogue,
      battle_type: formData.combat,
      magic: formData.magic,
      other_notes: formData.notes,
      image_url: formData.imageUrl,
      is_main: formData.isMain || false
    };

    if (activeCharId === 'new') {
      // Insert
      const { data, error } = await supabase
        .from('characters')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error inserting character:', error);
        alert('Failed to save character');
      } else if (data) {
        const newChar: Character = {
          ...formData,
          id: data.id
        };
        setCharacters(prev => [...prev, newChar]);
        setActiveCharId(data.id);
        setIsEditing(false);
      }
    } else {
      // Update
      const { error } = await supabase
        .from('characters')
        .update(dbData)
        .eq('id', activeCharId);

      if (error) {
        console.error('Error updating character:', error);
        alert('Failed to update character');
      } else {
        setCharacters(prev => prev.map(c => c.id === activeCharId ? formData : c));
        setIsEditing(false);
      }
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#a29db8' }}>Loading characters...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href={`/novel/${novelId}`} className={styles.logoIcon}>
            <span className="material-symbols-outlined" style={{ fontSize: '30px' }}>menu_book</span>
          </Link>
          <h2 className={styles.logoText}>Novel Studio</h2>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.navLinks}>
            <Link className={styles.navLink} href="#">Dashboard</Link>
            <Link className={styles.navLinkActive} href="#">Characters</Link>
            <Link className={styles.navLink} href="#">World</Link>
            <Link className={styles.navLink} href="#">Settings</Link>
          </div>
          <div 
            className={styles.avatar} 
            style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDQUhB4VqxhPJggvs0oDd2EPI__t4LaWwvA5gXc9FHyjifW6EXbp62KyLvhPmQG2ZNtkEykVm-d_cy4GrSoWKGzDE6vHWq2A82D5YcbjzwVuDnXBikgJtEsVZL3O80GYf1YTlZKZNnAYGJIIaSbzPVmHNeIHwxbE7_D7DlNYzlr99nyBzKF-0yGgDGzTgMZydsGptST_J97cX-ihFM5aGLQ09swfTQHR46fgySTgbIbJdIYn4F413lRRpOBSA7R6miOKTCRmvWhpt06")'}}
            role="img"
            aria-label="User avatar"
          ></div>
        </div>
      </header>

      <div className={styles.mainWrapper}>
        {/* Sidebar List */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <label className={styles.searchWrapper}>
              <div className={styles.searchInputContainer}>
                <div className={styles.searchIcon}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
                </div>
                <input 
                  className={styles.searchInput} 
                  placeholder="Search characters..." 
                />
              </div>
            </label>
            <button className={styles.newCharacterButton} onClick={handleNewCharacter}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
              <span>New Character</span>
            </button>
          </div>
          
          <div className={styles.characterList}>
            {characters.map((char) => (
              <div 
                key={char.id}
                className={`${styles.characterItem} ${activeCharId === char.id ? styles.characterItemActive : ''}`}
                onClick={() => handleCharacterSelect(char.id)}
              >
                <div 
                  className={`${styles.characterAvatar} ${activeCharId !== char.id ? styles.characterAvatarOpacity : ''}`}
                  style={{
                    backgroundImage: char.imageUrl ? `url("${char.imageUrl}")` : undefined,
                    backgroundColor: !char.imageUrl ? '#353345' : undefined
                  }}
                >
                    {!char.imageUrl && (
                        <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <span className="material-symbols-outlined" style={{fontSize: '20px', color: '#a29db8'}}>person</span>
                        </div>
                    )}
                </div>
                <div className={styles.characterInfo}>
                  <div className={styles.characterNameRow}>
                    <p className={styles.characterName}>{char.name}</p>
                    {char.isMain && (
                      <span className={styles.characterBadge}>Main</span>
                    )}
                  </div>
                  <p className={styles.characterRole}>{char.role}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.sidebarFooter}>
            <div className={styles.sidebarStats}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>info</span>
              <span>{characters.length} Characters Created</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={styles.mainContent}>
          <div className={styles.contentContainer}>
            <div className={styles.contentHeader}>
              <div>
                <h1 className={styles.pageTitle}>
                  {isEditing ? (activeCharId === 'new' ? 'New Character' : 'Edit Character') : formData.name}
                  {isEditing && <span className={styles.draftBadge}>Draft</span>}
                </h1>
                <p className={styles.pageSubtitle}>
                  {isEditing 
                    ? 'Make changes to the character profile.' 
                    : `${formData.role} • ${formData.age || 'Unknown Age'} • ${formData.gender}`}
                </p>
              </div>
              <div className={styles.actionButtons}>
                {!isEditing && characters.length > 0 && (
                  <button 
                    className={styles.iconButton} 
                    title="Edit Character"
                    onClick={() => setIsEditing(true)}
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                )}
                <button className={styles.iconButton} title="History">
                  <span className="material-symbols-outlined">history</span>
                </button>
                <button className={styles.iconButton} title="More Options">
                  <span className="material-symbols-outlined">more_horiz</span>
                </button>
              </div>
            </div>

            {isEditing ? (
              // Edit Mode (Form)
              <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                <div className={styles.photoUpload}>
                  <label className={styles.photoLabel}>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/gif, image/webp, image/svg+xml" 
                      className="hidden" 
                      style={{display: 'none'}} 
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <div 
                      className={styles.photoPreview}
                      style={{
                        backgroundImage: formData.imageUrl 
                          ? `url("${formData.imageUrl}")` 
                          : undefined,
                        backgroundColor: !formData.imageUrl ? '#2b2938' : undefined,
                        opacity: uploadingImage ? 0.5 : 1
                      }}
                    >
                      {uploadingImage ? (
                        <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          <span className="material-symbols-outlined" style={{fontSize: '48px', color: '#a29db8', animation: 'spin 1s linear infinite'}}>refresh</span>
                        </div>
                      ) : !formData.imageUrl && (
                        <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          <span className="material-symbols-outlined" style={{fontSize: '48px', color: '#403c53'}}>person</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.photoOverlay}>
                      <span className="material-symbols-outlined" style={{fontSize: '36px', color: 'white', marginBottom: '8px'}}>add_a_photo</span>
                      <span style={{fontSize: '12px', fontWeight: 'bold', color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                        {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                      </span>
                    </div>
                    <div className={styles.editIconBadge}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', display: 'block' }}>edit</span>
                    </div>
                  </label>
                  <div style={{textAlign: 'center'}}>
                    <p style={{color: 'white', fontSize: '14px', fontWeight: 500}}>Character Portrait</p>
                    <p style={{color: '#a29db8', fontSize: '12px', marginTop: '2px'}}>Recommended size: 400x400px</p>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>キャラクター名</label>
                  <input 
                    className={styles.input} 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>年齢</label>
                  <input 
                    className={styles.input} 
                    type="text" 
                    value={formData.age} 
                    onChange={(e) => handleInputChange('age', e.target.value)}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>性別</label>
                  <div className={styles.selectWrapper}>
                    <select 
                        className={`${styles.input} ${styles.select}`} 
                        value={formData.gender} 
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Non-binary</option>
                      <option>Other</option>
                    </select>
                    <span className={`material-symbols-outlined ${styles.selectIcon}`}>expand_more</span>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>役割</label>
                  <input 
                    className={styles.input} 
                    type="text" 
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    placeholder="例：主人公、ライバル、師匠など"
                  />
                </div>

                <div className={styles.divider}></div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>palette</span>
                    外見
                  </label>
                  <textarea 
                    className={`${styles.input} ${styles.textarea}`} 
                    rows={4} 
                    value={formData.appearance}
                    onChange={(e) => handleInputChange('appearance', e.target.value)}
                  ></textarea>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>record_voice_over</span>
                    第一人称代名詞（わたし・僕・俺・私など）
                  </label>
                  <input 
                    className={styles.input} 
                    type="text" 
                    value={formData.firstPerson}
                    onChange={(e) => handleInputChange('firstPerson', e.target.value)}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>hearing</span>
                    第二人称代名詞（あなた・君・お前など）
                  </label>
                  <input 
                    className={styles.input} 
                    type="text" 
                    value={formData.secondPerson}
                    onChange={(e) => handleInputChange('secondPerson', e.target.value)}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>graphic_eq</span>
                    話し方・口調
                  </label>
                  <input 
                    className={styles.input} 
                    type="text" 
                    value={formData.speechStyle}
                    onChange={(e) => handleInputChange('speechStyle', e.target.value)}
                    placeholder="e.g. Polite, Casual, -daze" 
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>psychology</span>
                    性格
                  </label>
                  <textarea 
                    className={`${styles.input} ${styles.textarea}`} 
                    rows={4} 
                    value={formData.personality}
                    onChange={(e) => handleInputChange('personality', e.target.value)}
                  ></textarea>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chat_bubble</span>
                    サンプル台詞
                  </label>
                  <textarea 
                    className={`${styles.input} ${styles.textarea} ${styles.italic}`} 
                    rows={3} 
                    value={formData.dialogue}
                    onChange={(e) => handleInputChange('dialogue', e.target.value)}
                  ></textarea>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>swords</span>
                    戦闘方法
                  </label>
                  <textarea 
                    className={`${styles.input} ${styles.textarea}`} 
                    rows={4} 
                    value={formData.combat}
                    onChange={(e) => handleInputChange('combat', e.target.value)}
                  ></textarea>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_fix</span>
                    魔法・能力
                  </label>
                  <textarea 
                    className={`${styles.input} ${styles.textarea}`} 
                    rows={4} 
                    value={formData.magic}
                    onChange={(e) => handleInputChange('magic', e.target.value)}
                  ></textarea>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>note</span>
                    その他のメモ
                  </label>
                  <textarea 
                    className={`${styles.input} ${styles.textarea}`} 
                    rows={3} 
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                  ></textarea>
                </div>

                <div className={styles.formActions}>
                  <button 
                    className={styles.cancelButton}
                    type="button"
                    onClick={() => {
                      if (activeCharId === 'new' && characters.length > 0) {
                        setActiveCharId(characters[0].id);
                        setFormData(characters[0]);
                        setIsEditing(false);
                      } else if (characters.length > 0) {
                        setIsEditing(false);
                        const original = characters.find(c => c.id === activeCharId);
                        if (original) setFormData(original);
                      } else {
                          // No characters yet, keep editing
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
              // View Mode (Profile)
              <div className={styles.viewContainer}>
                <div className={styles.viewHeaderInfo}>
                  <div 
                    className={styles.photoPreview}
                    style={{
                      backgroundImage: formData.imageUrl 
                        ? `url("${formData.imageUrl}")` 
                        : undefined,
                      backgroundColor: !formData.imageUrl ? '#2b2938' : undefined,
                      margin: '0 auto 1.5rem auto'
                    }}
                  >
                    {!formData.imageUrl && (
                      <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <span className="material-symbols-outlined" style={{fontSize: '48px', color: '#403c53'}}>person</span>
                      </div>
                    )}
                  </div>
                  
                  <h2 className={styles.viewName}>{formData.name}</h2>
                  <p className={styles.viewRole}>{formData.role} • {formData.age} • {formData.gender}</p>
                </div>

                <div className={styles.divider} style={{marginBottom: '2rem'}}></div>

                <div className={styles.viewSection}>
                  <div className={styles.viewLabel}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>palette</span>
                    外見
                  </div>
                  <p className={styles.viewValue}>{formData.appearance}</p>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem'}}>
                  <div>
                    <div className={styles.viewLabel}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>record_voice_over</span>
                      第一人称代名詞（わたし・僕・俺・私など）
                    </div>
                    <p className={styles.viewValue}>{formData.firstPerson}</p>
                  </div>
                  <div>
                    <div className={styles.viewLabel}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>hearing</span>
                      第二人称代名詞（あなた・君・お前など）
                    </div>
                    <p className={styles.viewValue}>{formData.secondPerson}</p>
                  </div>
                  <div>
                    <div className={styles.viewLabel}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>graphic_eq</span>
                      話し方・口調
                    </div>
                    <p className={styles.viewValue}>{formData.speechStyle}</p>
                  </div>
                </div>

                <div className={styles.viewSection}>
                  <div className={styles.viewLabel}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>psychology</span>
                    性格
                  </div>
                  <p className={styles.viewValue}>{formData.personality}</p>
                </div>

                <div className={styles.viewSection}>
                  <div className={styles.viewLabel}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chat_bubble</span>
                    サンプル台詞
                  </div>
                  <p className={`${styles.viewValue} ${styles.italic}`}>
                    {formData.dialogue}
                  </p>
                </div>

                <div className={styles.viewSection}>
                  <div className={styles.viewLabel}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>swords</span>
                    戦闘方法
                  </div>
                  <p className={styles.viewValue}>{formData.combat}</p>
                </div>

                <div className={styles.viewSection}>
                  <div className={styles.viewLabel}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_fix</span>
                    魔法・能力
                  </div>
                  <p className={styles.viewValue}>{formData.magic}</p>
                </div>

                <div className={styles.viewSection}>
                  <div className={styles.viewLabel}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>note</span>
                    その他のメモ
                  </div>
                  <p className={styles.viewValue}>{formData.notes}</p>
                </div>
              </div>
            )}
          </div>

          {!isEditing && characters.length > 0 && (
            <button 
              className={styles.fab} 
              onClick={() => setIsEditing(true)}
              title="Edit Character"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>edit</span>
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
