'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Page, StudentProfile, Subject, OverallAttendance, MonthlyAttendance, CGPAData, AttendanceSheet,
} from '@/types/attendance';
import {
  getSheets, getCurrentSheetId, getCurrentSheet, setCurrentSheetId,
  saveSheet, deleteSheet, createNewSheet, openSheet, exitCurrentSheet,
  migrateLegacyData, getTarget, saveTarget, clearAllData, exportData, importData,
  saveSheets,
} from '@/lib/attendance/storage';
import { calculateOverallAttendance } from '@/lib/attendance/calculations';
import dynamic from 'next/dynamic';

const SetupFlow = dynamic(() => import('@/components/setup/SetupFlow'), { ssr: false });
const Dashboard = dynamic(() => import('@/components/screens/Dashboard'), { ssr: false });
const SubjectsScreen = dynamic(() => import('@/components/screens/Subjects'), { ssr: false });
const CumulativeAttendance = dynamic(() => import('@/components/screens/CumulativeAttendance'), { ssr: false });
const WhatIfScreen = dynamic(() => import('@/components/screens/WhatIf'), { ssr: false });
const CGPAScreen = dynamic(() => import('@/components/screens/CGPA'), { ssr: false });
const SettingsScreen = dynamic(() => import('@/components/screens/Settings'), { ssr: false });
const MySheetsScreen = dynamic(() => import('@/components/screens/MySheets'), { ssr: false });
const SubjectForm = dynamic(() => import('@/components/setup/SubjectForm'), { ssr: false });
const SubjectDetails = dynamic(() => import('@/components/attendance/SubjectDetails'), { ssr: false });
import { LayoutDashboard, BookOpen, Calendar, TrendingUp, Settings, Grid3X3, BookOpenCheck, GraduationCap, ArrowRight } from 'lucide-react';
import AtmosphericBackground from '@/components/AtmosphericBackground';
import MobileNav from '@/components/MobileNav';

type AppModule = 'home' | 'attendance' | 'cgpa';

interface NotificationToastProps {
  notification: { type: 'success' | 'error'; message: string } | null;
}

function NotificationToast({ notification }: NotificationToastProps) {
  if (!notification) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in pointer-events-none">
      <div className={`px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg border max-w-[90vw] text-center ${
        notification.type === 'success' ? 'bg-[#0A2A1A] text-[#4ADE80] border-[#22543D]' : 'bg-[#2A0A0A] text-[#F87171] border-[#7F1D1D]'
      }`}>{notification.message}</div>
    </div>
  );
}

export default function Home() {
  // Module state
  const [activeModule, setActiveModule] = useState<AppModule>('home');
  const [sheets, setSheets] = useState<AttendanceSheet[]>([]);
  const [currentSheet, setCurrentSheet] = useState<AttendanceSheet | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isMounted, setIsMounted] = useState(false);
  const [target, setTarget] = useState(80);

  // V2 UI Session states
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialSheetBackup, setInitialSheetBackup] = useState<AttendanceSheet | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showScreenshotExitConfirm, setShowScreenshotExitConfirm] = useState(false);
  const [setupPhase, setSetupPhase] = useState<'landing' | 'form' | 'screenshot'>('landing');

  // Modal states
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [viewingSubject, setViewingSubject] = useState<Subject | null>(null);
  const [showNewSheetConfirm, setShowNewSheetConfirm] = useState(false);

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Hydration + migration
  useEffect(() => {
    migrateLegacyData();
    let allSheets = getSheets();
    const targetVal = getTarget();
    
    // Clean up cgpaData from any existing sample/demo sheets in localStorage
    // to clear the bug for existing users who previously loaded demo data
    let modified = false;
    allSheets = allSheets.map(s => {
      if (s.id.startsWith('sheet_sample_') && s.cgpaData.semesters.length > 0) {
        modified = true;
        return { ...s, cgpaData: { semesters: [] } };
      }
      return s;
    });
    if (modified) {
      saveSheets(allSheets);
    }
    
    // Always start at home module on mount / refresh
    exitCurrentSheet();
    
    // Defer state updates to avoid synchronous cascading renders warning
    Promise.resolve().then(() => {
      setSheets(allSheets);
      setCurrentSheet(null);
      setInitialSheetBackup(null);
      setHasUnsavedChanges(false);
      setTarget(targetVal);
      setIsMounted(true);
      setActiveModule('home');
      setSetupPhase('landing');
      setCurrentPage('dashboard');
    });
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const notify = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  }, []);

  const refreshSheets = useCallback(() => {
    const all = getSheets();
    setSheets(all);
    const curId = getCurrentSheetId();
    if (curId) setCurrentSheet(all.find(s => s.id === curId) || null);
  }, []);

  const updateSheet = useCallback((updater: (s: AttendanceSheet) => AttendanceSheet) => {
    setCurrentSheet(prev => {
      if (!prev) return prev;
      const updated = updater(prev);
      saveSheet(updated);
      refreshSheets();
      setHasUnsavedChanges(true); // Mark changes as unsaved
      return updated;
    });
  }, [refreshSheets]);

  const overallStats: OverallAttendance = currentSheet
    ? calculateOverallAttendance(currentSheet.subjects)
    : { percentage: 0, totalPresent: 0, totalConduct: 0, totalAbsent: 0, totalCL: 0, status: 'ON_TRACK' };

  // ===== Setup =====
  const handleSetupComplete = (profile: StudentProfile, sheetName?: string, initialSubjects?: Subject[], initialMonthly?: MonthlyAttendance[]) => {
    const sheet = createNewSheet(sheetName);
    sheet.profile = profile;
    if (initialSubjects) sheet.subjects = initialSubjects;
    if (initialMonthly) sheet.monthly = initialMonthly;
    saveSheet(sheet);
    setCurrentSheetId(sheet.id);
    refreshSheets();
    
    // Track backup & session
    setCurrentSheet(sheet);
    setInitialSheetBackup(JSON.parse(JSON.stringify(sheet)));
    setHasUnsavedChanges(false);
    
    setCurrentPage('dashboard');
    setActiveModule('attendance');
  };

  const handleLoadDemo = () => {
    import('@/lib/attendance/mockData').then(({ createMockSheet }) => {
      const sheet = createMockSheet();
      saveSheet(sheet);
      setCurrentSheetId(sheet.id);
      refreshSheets();
      
      // Track backup & session
      setCurrentSheet(sheet);
      setInitialSheetBackup(JSON.parse(JSON.stringify(sheet)));
      setHasUnsavedChanges(false);
      
      setCurrentPage('dashboard');
      setActiveModule('attendance');
    });
  };

  // ===== Sheet Management =====
  const handleOpenSheet = (id: string) => {
    const sheet = openSheet(id);
    refreshSheets();
    if (sheet) {
      setCurrentSheet(sheet);
      setInitialSheetBackup(JSON.parse(JSON.stringify(sheet)));
      setHasUnsavedChanges(false);
    }
    setCurrentPage('dashboard');
    setActiveModule('attendance');
  };

  const triggerExit = useCallback(() => {
    if (activeModule === 'cgpa') {
      setActiveModule('home');
    } else if (activeModule === 'attendance') {
      if (currentSheet) {
        if (hasUnsavedChanges) {
          setShowExitConfirm(true);
        } else {
          exitCurrentSheet();
          setCurrentSheet(null);
          setInitialSheetBackup(null);
          setHasUnsavedChanges(false);
          setActiveModule('home');
        }
      } else {
        if (setupPhase === 'screenshot') {
          setShowScreenshotExitConfirm(true);
        } else {
          setSetupPhase('landing');
          setActiveModule('home');
          setCurrentPage('dashboard');
        }
      }
    }
  }, [activeModule, currentSheet, hasUnsavedChanges, setupPhase]);

  const handleExitSheet = () => {
    triggerExit();
  };

  const handleDeleteSheet = (id: string) => {
    deleteSheet(id);
    refreshSheets();
    if (!getCurrentSheetId()) {
      setCurrentSheet(null);
      setInitialSheetBackup(null);
      setHasUnsavedChanges(false);
    }
    notify('success', 'Sheet deleted');
  };

  const handleNewSheetConfirm = () => {
    setShowNewSheetConfirm(false);
    exitCurrentSheet();
    setCurrentSheet(null);
    setInitialSheetBackup(null);
    setHasUnsavedChanges(false);
    setSetupPhase('landing');
    refreshSheets();
  };

  // ===== Subject CRUD =====
  const handleAddSubject = (subject: Subject) => { updateSheet(s => ({ ...s, subjects: [...s.subjects, subject] })); setIsAddingSubject(false); notify('success', 'Subject added'); };
  const handleUpdateSubject = (subject: Subject) => { updateSheet(s => ({ ...s, subjects: s.subjects.map(sub => sub.id === subject.id ? subject : sub) })); setEditingSubject(null); if (viewingSubject?.id === subject.id) setViewingSubject(subject); notify('success', 'Subject updated'); };
  const handleDeleteSubject = (id: string) => { updateSheet(s => ({ ...s, subjects: s.subjects.filter(sub => sub.id !== id) })); setEditingSubject(null); setViewingSubject(null); notify('success', 'Subject removed'); };

  // ===== Monthly / CGPA =====
  const handleMonthlyChange = (m: MonthlyAttendance[]) => { updateSheet(s => ({ ...s, monthly: m })); notify('success', 'Monthly updated'); };
  const handleCGPAChange = (d: CGPAData) => { updateSheet(s => ({ ...s, cgpaData: d })); };

  // ===== Settings =====
  const handleProfileUpdate = (p: StudentProfile) => { updateSheet(s => ({ ...s, profile: p })); notify('success', 'Profile updated'); };
  const handleTargetChange = (t: number) => { setTarget(t); saveTarget(t); };
  const handleExport = () => { try { exportData(); notify('success', 'Backup downloaded'); } catch { notify('error', 'Export failed'); } };
  const handleImport = (content: string) => { const r = importData(content); if (r.success) { refreshSheets(); notify('success', `Imported ${r.sheetsImported || 0} sheet(s)`); return true; } notify('error', r.error || 'Import failed'); return false; };
  const handleClearAll = () => { clearAllData(); setSheets([]); setCurrentSheet(null); setActiveModule('home'); notify('success', 'All data cleared'); };

  // ===== Notification toast =====

  // ===== LOADING =====
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000] relative">
        <AtmosphericBackground />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-8 h-8 border-[3px] border-[#333] border-t-[#FFF] rounded-full animate-spin" />
          <span className="text-[14px] text-[#666] font-medium">Loading…</span>
        </div>
      </div>
    );
  }

  // ===== HOME SCREEN — Hero + Module Choice =====
  if (activeModule === 'home') {
    const hasSheets = sheets.length > 0;

    return (
      <div className="min-h-screen bg-[#000000] relative flex flex-col">
        <AtmosphericBackground />
        <NotificationToast notification={notification} />

        {/* Skip link for accessibility */}
        <a href="#main-content" className="skip-link">Skip to main content</a>

        {/* Hero — full viewport */}
        <main id="main-content" className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 sm:px-6 text-center">
          <h1 className="font-[family-name:var(--font-newsreader)] text-4xl sm:text-5xl md:text-7xl font-light text-[#FFFFFF] mb-4 animate-slide-up stagger-1">
            Attendance Checker
          </h1>
          <p className="text-[15px] sm:text-[16px] md:text-[18px] text-[#B0B0B0] mb-2 animate-slide-up stagger-2">
            Know where you stand. Plan your semester.
          </p>
          <p className="text-[13px] sm:text-[14px] text-[#666] mb-8 sm:mb-10 max-w-md animate-slide-up stagger-3">
            A personal student tool for tracking attendance, academic performance and GPA/CGPA.
          </p>

          {/* Module choices */}
          <div className="w-full max-w-md sm:max-w-lg space-y-3 mb-8 animate-slide-up stagger-4">
            <button onClick={() => setActiveModule('attendance')}
              className="btn-press w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-[rgba(18,18,22,0.85)] backdrop-blur-md border border-[#2A2A2C] hover:border-[#444] rounded-2xl transition-smooth text-left group">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#1A1A1A] border border-[#2A2A2C] flex items-center justify-center shrink-0">
                <BookOpenCheck size={18} className="text-[#B0B0B0]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[16px] sm:text-[17px] text-[#FFFFFF] font-medium">Attendance</div>
                <div className="text-[12px] sm:text-[13px] text-[#666] mt-0.5">Track subjects, monthly data & 80% prediction</div>
              </div>
              <ArrowRight size={16} className="text-[#444] group-hover:text-[#999] transition-smooth shrink-0" />
            </button>

            <button onClick={() => setActiveModule('cgpa')}
              className="btn-press w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-[rgba(18,18,22,0.85)] backdrop-blur-md border border-[#2A2A2C] hover:border-[#444] rounded-2xl transition-smooth text-left group">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#1A1A1A] border border-[#2A2A2C] flex items-center justify-center shrink-0">
                <GraduationCap size={18} className="text-[#B0B0B0]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[16px] sm:text-[17px] text-[#FFFFFF] font-medium">GPA / CGPA</div>
                <div className="text-[12px] sm:text-[13px] text-[#666] mt-0.5">Calculate grades, GPA & academic classification</div>
              </div>
              <ArrowRight size={16} className="text-[#444] group-hover:text-[#999] transition-smooth shrink-0" />
            </button>
          </div>

          {/* Secondary actions */}
          <div className="flex items-center gap-3 animate-slide-up stagger-5">
            {hasSheets && (
              <button onClick={() => { setActiveModule('attendance'); setTimeout(() => setCurrentPage('sheets'), 0); }}
                className="btn-press px-5 py-2.5 bg-[#18181A] border border-[#2A2A2C] hover:border-[#444] rounded-full text-[13px] text-[#949494] transition-smooth">
                View My Sheets
              </button>
            )}
          </div>

          <p className="text-[11px] sm:text-[12px] text-[#444] mt-8 animate-slide-up stagger-6">
            All data stays in your browser. Nothing is sent anywhere.
          </p>
        </main>

        {/* My Sheets modal (inside home module) */}
        {currentPage === 'sheets' && hasSheets && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
              <MySheetsScreen
                sheets={sheets}
                currentSheetId={getCurrentSheetId()}
                onOpenSheet={(id) => { handleOpenSheet(id); setCurrentPage('dashboard'); }}
                onNewSheet={() => { setCurrentPage('dashboard'); }}
                onDeleteSheet={handleDeleteSheet}
              />
              <button onClick={() => setCurrentPage('dashboard')} className="btn-press w-full mt-4 py-3 bg-[#18181A] border border-[#2A2A2C] rounded-full text-[14px] text-[#949494] hover:text-[#FFF] transition-smooth">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== ATTENDANCE MODULE =====
  if (activeModule === 'attendance') {
    // No current sheet → Setup or My Sheets
    if (!currentSheet) {
      const hasSheets = sheets.length > 0;

      if (currentPage === 'sheets') {
        return (
          <div className="min-h-screen bg-[#000000] relative">
            <AtmosphericBackground />
            <div className="bg-black/80 backdrop-blur-xl border-b border-[#1A1A1A] relative z-10">
              <div className="flex items-center h-14 px-4 justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={triggerExit} className="text-[14px] text-[#949494] hover:text-[#FFF] transition-smooth font-medium flex items-center gap-1">
                    ← Home
                  </button>
                  <span className="text-[14px] text-[#333]">|</span>
                  <span className="text-[15px] text-[#FFF] tracking-tight font-medium">Attendance</span>
                </div>
                <button onClick={triggerExit} className="text-[13px] text-[#F87171] hover:text-[#FFF] border border-[#2A2A2C] px-3 py-1.5 rounded-full transition-smooth font-medium">Exit</button>
              </div>
            </div>
            <main className="app-container py-4 md:py-6 pb-8 relative z-10">
              <MySheetsScreen
                sheets={sheets}
                currentSheetId={getCurrentSheetId()}
                onOpenSheet={handleOpenSheet}
                onNewSheet={() => setCurrentPage('dashboard')}
                onDeleteSheet={handleDeleteSheet}
              />
            </main>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[#000000] relative">
          <AtmosphericBackground />
          <NotificationToast notification={notification} />
          <div className="bg-black/80 backdrop-blur-xl border-b border-[#1A1A1A] relative z-10">
            <div className="flex items-center h-14 px-4 justify-between">
              <div className="flex items-center gap-3">
                <button onClick={triggerExit} className="text-[14px] text-[#949494] hover:text-[#FFF] transition-smooth font-medium flex items-center gap-1">
                  ← Home
                </button>
                <span className="text-[14px] text-[#333]">|</span>
                <span className="text-[15px] text-[#FFF] tracking-tight font-medium">Attendance</span>
              </div>
              <div className="flex items-center gap-3">
                {hasSheets && (
                  <button onClick={() => setCurrentPage('sheets')} className="text-[13px] text-[#666] hover:text-[#FFF] transition-smooth mr-1">My Sheets</button>
                )}
                <button onClick={triggerExit} className="text-[13px] text-[#F87171] hover:text-[#FFF] border border-[#2A2A2C] px-3 py-1.5 rounded-full transition-smooth font-medium">Exit</button>
              </div>
            </div>
          </div>
          <div className="relative z-10">
            <SetupFlow
              onComplete={handleSetupComplete}
              onLoadDemo={handleLoadDemo}
              onShowSheets={() => setCurrentPage('sheets')}
              hasExistingSheets={hasSheets}
              phase={setupPhase}
              setPhase={setSetupPhase}
              onExit={triggerExit}
            />
          </div>
        </div>
      );
    }

    // Attendance — has current sheet → Dashboard with tabs
    const sheetLabel = currentSheet.name;
    const attendanceNavItems = [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      { id: 'subjects', label: 'Subjects', icon: <BookOpen size={18} /> },
      { id: 'cumulative', label: 'Monthly', icon: <Calendar size={18} /> },
      { id: 'whatif', label: 'What-If', icon: <TrendingUp size={18} /> },
      { id: 'sheets', label: 'Sheets', icon: <Grid3X3 size={18} /> },
      { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
    ];

    const attendanceNavClickHandlers: Record<string, () => void> = {
      dashboard: () => setCurrentPage('dashboard'),
      subjects: () => setCurrentPage('subjects'),
      cumulative: () => setCurrentPage('cumulative'),
      whatif: () => setCurrentPage('whatif'),
      sheets: () => setCurrentPage('sheets'),
      settings: () => setCurrentPage('settings'),
    };

    const renderAttendance = () => {
      switch (currentPage) {
        case 'sheets':
          return <MySheetsScreen sheets={sheets} currentSheetId={currentSheet.id} onOpenSheet={handleOpenSheet} onNewSheet={() => { exitCurrentSheet(); setCurrentSheet(null); setCurrentPage('dashboard'); }} onDeleteSheet={handleDeleteSheet} />;
        case 'dashboard':
          return <Dashboard profile={currentSheet.profile} stats={overallStats} subjects={currentSheet.subjects} monthly={currentSheet.monthly} target={target} onViewSubject={setViewingSubject} onNavigate={setCurrentPage} onNewSheet={() => setShowNewSheetConfirm(true)} onExitSheet={handleExitSheet} sheetName={sheetLabel} />;
        case 'subjects':
          return <SubjectsScreen subjects={currentSheet.subjects} target={target} onAddClick={() => setIsAddingSubject(true)} onSubjectClick={setViewingSubject} onEditSubject={sub => setEditingSubject(sub)} onDeleteSubject={handleDeleteSubject} />;
        case 'cumulative':
          return <CumulativeAttendance monthly={currentSheet.monthly} subjects={currentSheet.subjects} onMonthlyChange={handleMonthlyChange} />;
        case 'whatif':
          return <WhatIfScreen stats={overallStats} target={target} />;
        case 'settings':
          return <SettingsScreen profile={currentSheet.profile} target={target} onProfileUpdate={handleProfileUpdate} onTargetChange={handleTargetChange} onExport={handleExport} onImport={handleImport} onReset={handleClearAll} onClearAll={handleClearAll} />;
        default:
          return null;
      }
    };

    return (
      <div className="min-h-screen flex flex-col bg-[#000000] relative">
        <NotificationToast notification={notification} />
        <AtmosphericBackground />

        {/* Desktop header — hidden on mobile */}
        <header className="hidden md:block sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-[#1A1A1A]">
          <div className="app-container flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button onClick={triggerExit} className="text-[14px] text-[#949494] hover:text-[#FFF] transition-smooth font-medium flex items-center gap-1">
                ← Home
              </button>
              <span className="text-[14px] text-[#333]">|</span>
              <span className="text-[15px] text-[#FFFFFF] tracking-tight font-medium">Attendance</span>
              <span className="text-[11px] text-[#666] font-medium bg-[#111] px-2 py-0.5 rounded-full max-w-[180px] truncate">{sheetLabel}</span>
              <button onClick={triggerExit} className="text-[13px] text-[#F87171] hover:text-[#FFF] border border-[#2A2A2C] px-3 py-1.5 rounded-full transition-smooth font-medium ml-1">Exit</button>
              {hasUnsavedChanges && (
                <span className="text-[10px] text-[#FBBF24] bg-[#78350F]/20 border border-[#78350F]/30 px-2.5 py-0.5 rounded-full font-medium">Unsaved Changes</span>
              )}
            </div>
            <nav className="flex items-center gap-1" role="navigation" aria-label="Attendance navigation">
              {hasUnsavedChanges && (
                <button
                  onClick={() => {
                    if (currentSheet) {
                      saveSheet(currentSheet);
                      setInitialSheetBackup(JSON.parse(JSON.stringify(currentSheet)));
                      setHasUnsavedChanges(false);
                      notify('success', 'Changes saved');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-[#FFF] text-[#000] hover:bg-[#E5E5E5] text-[13px] font-semibold transition-smooth mr-2"
                >
                  Save
                </button>
              )}
              {attendanceNavItems.map(item => (
                <button key={item.id} onClick={() => setCurrentPage(item.id as Page)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium transition-smooth ${
                    currentPage === item.id ? 'bg-[#222] text-[#FFF]' : 'text-[#666] hover:text-[#B0B0B0]'
                  }`}
                  aria-current={currentPage === item.id ? 'page' : undefined}
                >{item.icon} {item.label}</button>
              ))}
            </nav>
          </div>
        </header>

        {/* Mobile nav — hamburger + bottom tabs */}
        <div className="md:hidden">
          <MobileNav
            items={attendanceNavItems.map(item => ({
              ...item,
              onClick: attendanceNavClickHandlers[item.id],
            }))}
            activeId={currentPage}
            title={`${sheetLabel}`}
            onHome={triggerExit}
          />
        </div>

        <main className="flex-1 pb-20 md:pb-6 relative z-10">
          <div key={currentPage} className="app-container py-4 md:py-6 page-enter">{renderAttendance()}</div>
        </main>

        {/* Subject form modal — full screen on mobile, centered on desktop */}
        {(isAddingSubject || editingSubject) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <SubjectForm key={editingSubject?.id || 'new'} subject={editingSubject || undefined} onSave={sub => editingSubject ? handleUpdateSubject(sub) : handleAddSubject(sub)} onCancel={() => { setIsAddingSubject(false); setEditingSubject(null); }} onDelete={editingSubject ? () => handleDeleteSubject(editingSubject.id) : undefined} />
          </div>
        )}

        {/* Subject details modal — full screen on mobile */}
        {viewingSubject && (
          <SubjectDetails subject={viewingSubject} target={target} onClose={() => setViewingSubject(null)} onEdit={sub => { setViewingSubject(null); setEditingSubject(sub); }} />
        )}

        {/* New sheet confirmation */}
        {showNewSheetConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-[#111] border border-[#2A2A2C] rounded-2xl w-full max-w-sm p-6">
              <h3 className="font-[family-name:var(--font-newsreader)] text-xl text-[#FFF] mb-2">Start a new attendance sheet?</h3>
              <p className="text-[14px] text-[#949494] mb-6">Your current sheet will be saved before you start a new one.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowNewSheetConfirm(false)} className="flex-1 bg-[#18181A] hover:bg-[#222] text-[#B0B0B0] font-semibold py-2.5 rounded-full text-[14px] transition-smooth">Cancel</button>
                <button onClick={handleNewSheetConfirm} className="flex-1 bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000] font-semibold py-2.5 rounded-full text-[14px] transition-smooth">Save & Start New</button>
              </div>
            </div>
          </div>
        )}

        {/* Unsaved changes exit confirmation */}
        {showExitConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-[#111] border border-[#2A2A2C] rounded-2xl w-full max-w-sm p-6">
              <h3 className="font-[family-name:var(--font-newsreader)] text-xl text-[#FFF] mb-2">Leave this sheet?</h3>
              <p className="text-[14px] text-[#949494] mb-6">You have unsaved changes in this attendance sheet.</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => {
                  if (currentSheet) {
                    saveSheet(currentSheet);
                  }
                  setHasUnsavedChanges(false);
                  setShowExitConfirm(false);
                  exitCurrentSheet();
                  setCurrentSheet(null);
                  setInitialSheetBackup(null);
                  setActiveModule('home');
                  refreshSheets();
                }} className="w-full bg-[#FFFFFF] hover:bg-[#E5E5E5] text-[#000] font-semibold py-2.5 rounded-full text-[14px] transition-smooth">
                  Save & Exit
                </button>
                <button onClick={() => {
                  if (initialSheetBackup) {
                    saveSheet(initialSheetBackup);
                  }
                  setHasUnsavedChanges(false);
                  setShowExitConfirm(false);
                  exitCurrentSheet();
                  setCurrentSheet(null);
                  setInitialSheetBackup(null);
                  setActiveModule('home');
                  refreshSheets();
                }} className="w-full bg-[#18181A] hover:bg-[#222] text-[#F87171] border border-[#7F1D1D]/25 font-semibold py-2.5 rounded-full text-[14px] transition-smooth">
                  Exit Without Saving
                </button>
                <button onClick={() => setShowExitConfirm(false)} className="w-full bg-[#18181A] hover:bg-[#222] text-[#B0B0B0] font-semibold py-2.5 rounded-full text-[14px] transition-smooth">
                  Stay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Screenshot import exit confirmation */}
        {showScreenshotExitConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-[#111] border border-[#2A2A2C] rounded-2xl w-full max-w-sm p-6">
              <h3 className="font-[family-name:var(--font-newsreader)] text-xl text-[#FFF] mb-2">Leave screenshot import?</h3>
              <p className="text-[14px] text-[#949494] mb-6">Your temporary upload and OCR progress will be discarded.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowScreenshotExitConfirm(false)} className="flex-1 bg-[#18181A] hover:bg-[#222] text-[#B0B0B0] font-semibold py-2.5 rounded-full text-[14px] transition-smooth">Continue</button>
                <button onClick={() => {
                  setShowScreenshotExitConfirm(false);
                  setSetupPhase('landing');
                  setActiveModule('home');
                }} className="flex-1 bg-[#F87171] hover:bg-[#EF4444] text-[#000] font-semibold py-2.5 rounded-full text-[14px] transition-smooth">Exit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== CGPA MODULE — Independent, no attendance required =====
  if (activeModule === 'cgpa') {
    const cgpaSheet = currentSheet || sheets.find(s => s.cgpaData.semesters.length > 0) || null;

    const handleCGPASheetUpdate = (d: CGPAData) => {
      if (cgpaSheet) {
        const updated = { ...cgpaSheet, cgpaData: d, updatedAt: new Date().toISOString() };
        saveSheet(updated);
        refreshSheets();
        setCurrentSheet(updated);
      } else {
        const sheet = createNewSheet('GPA Data');
        sheet.profile = { college: 'Loyola College, Chennai' };
        sheet.cgpaData = d;
        saveSheet(sheet);
        setCurrentSheetId(sheet.id);
        refreshSheets();
      }
    };

    return (
      <div className="min-h-screen bg-[#000000] relative">
        <AtmosphericBackground />
        <NotificationToast notification={notification} />

        {/* CGPA header — same for mobile and desktop */}
        <div className="bg-black/80 backdrop-blur-xl border-b border-[#1A1A1A] relative z-10">
          <div className="flex items-center h-14 px-4 justify-between">
            <div className="flex items-center gap-3">
              <button onClick={triggerExit} className="text-[14px] text-[#949494] hover:text-[#FFF] transition-smooth font-medium flex items-center gap-1">
                ← Home
              </button>
              <span className="text-[14px] text-[#333]">|</span>
              <span className="text-[15px] text-[#FFF] tracking-tight font-medium">GPA / CGPA</span>
            </div>
            <button onClick={triggerExit} className="text-[13px] text-[#F87171] hover:text-[#FFF] border border-[#2A2A2C] px-3 py-1.5 rounded-full transition-smooth font-medium">Exit</button>
          </div>
        </div>

        <main className="pb-8 relative z-10">
          <div className="app-container py-4 md:py-6 page-enter">
            <CGPAScreen
              cgpaData={cgpaSheet?.cgpaData || { semesters: [] }}
              onCGPAChange={handleCGPASheetUpdate}
            />
          </div>
        </main>
      </div>
    );
  }

  return null;
}
