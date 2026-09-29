import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Languages,
  WifiOff,
  CheckCircle,
  RefreshCw,
  Play,
  FileText,
  HelpCircle,
  Award,
  Layers,
} from 'lucide-react';
import { api } from '../api/client';

interface LmsViewProps {
  isOffline: boolean;
  offlineSyncCount: number;
  onAddOfflineItem: (item: any) => void;
  onSyncOffline: () => void;
}

export const LmsView: React.FC<LmsViewProps> = ({
  isOffline,
  offlineSyncCount,
  onAddOfflineItem,
  onSyncOffline,
}) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi' | 'te'>('en');
  const [translation, setTranslation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const data = await api.lms.listCourses();
      setCourses(data || []);
      if (data && data.length > 0) {
        loadCourseDetail(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load LMS courses', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseDetail = async (id: string) => {
    try {
      const detail = await api.lms.getCourse(id);
      setSelectedCourse(detail);
      const firstLesson = detail?.modules?.[0]?.lessons?.[0];
      if (firstLesson) {
        loadLesson(firstLesson);
      }
    } catch (err) {
      console.error('Failed to load course details', err);
    }
  };

  const loadLesson = async (lesson: any) => {
    setSelectedLesson(lesson);
    if (selectedLanguage !== 'en') {
      try {
        const trans = await api.lms.getTranslation(lesson.id, selectedLanguage);
        setTranslation(trans);
      } catch {
        setTranslation(null);
      }
    } else {
      setTranslation(null);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedLesson) {
      loadLesson(selectedLesson);
    }
  }, [selectedLanguage]);

  const handleCompleteLesson = async () => {
    if (!selectedLesson) return;

    if (isOffline) {
      onAddOfflineItem({
        lessonId: selectedLesson.id,
        lessonTitle: selectedLesson.title,
        timeSpentSeconds: 600,
        completedAt: new Date().toISOString(),
      });
      setSyncStatus(`Lesson marked completed locally. Saved to offline sync queue (${offlineSyncCount + 1} pending).`);
    } else {
      try {
        await api.lms.syncOffline([
          {
            lessonId: selectedLesson.id,
            timeSpentSeconds: 600,
            completedAt: new Date().toISOString(),
          },
        ]);
        setSyncStatus('Progress synchronized with NCCT National LMS Registry!');
      } catch (err: any) {
        alert(`Failed to save progress: ${err.message}`);
      }
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-emerald">Multilingual LMS</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• Offline-First PWA</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', color: '#ffffff', marginTop: '0.25rem' }}>
            Rural Interactive Learning & Offline Content Engine
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Learn in your native tongue (English, Hindi, Telugu, Tamil, Marathi) with offline synchronization for low-connectivity regions.
          </p>
        </div>

        {/* Language Switcher Bar */}
        <div className="glass-panel" style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Languages size={16} color="var(--primary-400)" style={{ marginLeft: '0.4rem' }} />
          <button
            onClick={() => setSelectedLanguage('en')}
            className={`btn btn-sm ${selectedLanguage === 'en' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.25rem 0.65rem' }}
          >
            English
          </button>
          <button
            onClick={() => setSelectedLanguage('hi')}
            className={`btn btn-sm ${selectedLanguage === 'hi' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.25rem 0.65rem' }}
          >
            हिंदी (Hindi)
          </button>
          <button
            onClick={() => setSelectedLanguage('te')}
            className={`btn btn-sm ${selectedLanguage === 'te' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.25rem 0.65rem' }}
          >
            తెలుగు (Telugu)
          </button>
        </div>
      </div>

      {/* Offline Status Banner */}
      {isOffline && (
        <div
          className="animate-fade-in"
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: 'var(--accent-gold-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <WifiOff size={18} />
            <div>
              <div style={{ fontWeight: 700 }}>Offline Mode Active (Rural PWA Simulation)</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Downloaded lessons are accessible offline via IndexedDB. Completed lessons will queue for sync.
              </div>
            </div>
          </div>
          {offlineSyncCount > 0 && (
            <button onClick={onSyncOffline} className="btn btn-gold btn-sm">
              <RefreshCw size={14} />
              <span>Sync {offlineSyncCount} Items Now</span>
            </button>
          )}
        </div>
      )}

      {syncStatus && (
        <div
          className="animate-fade-in"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle size={16} />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Main Course Reader Split View */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
        {/* Left Modules / Lessons Navigation */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ fontSize: '1.1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Layers size={18} color="#06b6d4" />
            <span>Course Syllabus</span>
          </h4>

          {selectedCourse?.modules?.map((m: any, mIdx: number) => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Module {mIdx + 1}: {m.title}
              </div>

              {m.lessons?.map((l: any) => {
                const isActive = selectedLesson?.id === l.id;

                return (
                  <div
                    key={l.id}
                    onClick={() => loadLesson(l)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: isActive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.88rem',
                      color: isActive ? '#34d399' : 'var(--text-main)',
                    }}
                  >
                    <FileText size={15} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.title}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          {(!selectedCourse?.modules || selectedCourse.modules.length === 0) && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '1rem 0' }}>
              Syllabus loading or modules being prepared...
            </div>
          )}
        </div>

        {/* Right Lesson Content Reader */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {selectedLesson ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-cyan">
                      {selectedLanguage === 'en' ? 'English' : selectedLanguage === 'hi' ? 'हिंदी (Hindi)' : 'తెలుగు (Telugu)'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Interactive Content</span>
                  </div>
                  <h3 style={{ fontSize: '1.6rem', color: '#ffffff', marginTop: '0.4rem' }}>
                    {translation?.title || selectedLesson.title}
                  </h3>
                </div>

                <button onClick={handleCompleteLesson} className="btn btn-primary btn-sm">
                  <CheckCircle size={14} />
                  <span>Mark Completed</span>
                </button>
              </div>

              {/* Lesson Body */}
              <div style={{ lineHeight: '1.8', color: 'var(--text-main)', fontSize: '0.98rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p>
                  {selectedLanguage === 'hi'
                    ? 'सहकारी समितियों (PACS) के कम्प्यूटरीकरण के तहत डिजिटल बहीखाता, UPI क्यूआर कोड भुगतान और वित्तीय रिपोर्टिंग का व्यावहारिक प्रशिक्षण।'
                    : selectedLanguage === 'te'
                    ? 'ప్రాథమిక వ్యవసాయ సహకార సంఘాల (PACS) డిజిటలైజేషన్ మరియు UPI చెల్లింపుల నిర్వహణపై సమగ్ర శిక్షణ.'
                    : 'Fundamental operational concepts for Primary Agricultural Credit Societies (PACS) computerization, electronic ledger balance management, and rural UPI digital payments integration.'}
                </p>

                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.88rem',
                    color: '#a7f3d0',
                  }}
                >
                  <div style={{ color: 'var(--text-dim)', marginBottom: '0.35rem' }}>// Core Learning Objective</div>
                  {selectedLanguage === 'hi'
                    ? '1. PACS खातों का डिजिटलीकरण\n2. दैनिक नकद शेष सत्यापन\n3. DBT किसान सब्सिडी हस्तांतरण'
                    : selectedLanguage === 'te'
                    ? '1. PACS లెక్కల డిజిటలైజేషన్\n2. రోజువారీ నగదు నిల్వల తనిఖీ\n3. రైతులకు ప్రత్యక్ష సబ్సిడీ బదిలీ'
                    : '1. PACS Daily Ledger Computerization\n2. Cash-in-Hand Balancing\n3. Direct Benefit Transfer (DBT) Reconciliation'}
                </div>

                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(6, 182, 212, 0.1)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    color: '#22d3ee',
                    fontSize: '0.88rem',
                  }}
                >
                  💡 <b>Pro-tip for Rural Trainees:</b> This lesson is cached locally on your device. You can review this module even without active mobile internet reception.
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
              Select a lesson from the course syllabus to begin learning.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
