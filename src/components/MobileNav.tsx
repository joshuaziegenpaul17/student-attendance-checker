'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Menu, Home, BookOpenCheck, GraduationCap, Grid3X3, Settings, HelpCircle } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface MobileNavProps {
  items: NavItem[];
  activeId: string;
  title: string;
  onHome?: () => void;
}

export default function MobileNav({ items, activeId, title, onHome }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleItemClick = useCallback((item: NavItem) => {
    item.onClick();
    setIsOpen(false);
  }, []);

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-[#1A1A1A]">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            {onHome && (
              <button onClick={onHome} className="text-[13px] text-[#F87171] hover:text-[#FFF] border border-[#2A2A2C] px-2.5 py-1 rounded-full transition-smooth font-medium">
                Exit
              </button>
            )}
            <span className="text-[15px] text-[#FFFFFF] tracking-tight font-medium">{title}</span>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#111] border border-[#2A2A2C] text-[#B0B0B0] hover:text-[#FFF] transition-smooth"
            aria-label="Open navigation menu"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out menu */}
      <nav
        className={`fixed top-0 right-0 h-full w-[280px] max-w-[85vw] bg-[#0A0A0C] border-l border-[#1A1A1A] z-[95] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Menu header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[#1A1A1A]">
          <span className="text-[15px] text-[#FFFFFF] font-medium">Menu</span>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#111] text-[#B0B0B0] hover:text-[#FFF] transition-smooth"
            aria-label="Close navigation menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav items */}
        <div className="py-3">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-smooth ${
                activeId === item.id
                  ? 'bg-[#1A1A1A] text-[#FFFFFF]'
                  : 'text-[#949494] hover:bg-[#111] hover:text-[#FFFFFF]'
              }`}
            >
              <span className={activeId === item.id ? 'text-[#FFF]' : 'text-[#555]'}>{item.icon}</span>
              <span className="text-[14px] font-medium">{item.label}</span>
            </button>
          ))}
          {onHome && (
            <button
              onClick={() => {
                setIsOpen(false);
                onHome();
              }}
              className="w-full flex items-center gap-3 px-5 py-3 text-left transition-smooth text-[#F87171] hover:bg-[#2A0A0A] hover:text-[#FFAAAA] border-t border-[#1A1A1A]/40 mt-2"
            >
              <span className="text-[#F87171]"><Home size={18} /></span>
              <span className="text-[14px] font-medium">Exit to Home</span>
            </button>
          )}
        </div>

        {/* Menu footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#1A1A1A]">
          <p className="text-[11px] text-[#444] text-center">Attendance Checker v2.0</p>
        </div>
      </nav>

      {/* Bottom tab bar — keep for quick access */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-[#1A1A1A] z-50 bottom-nav">
        <div className="flex items-center justify-around h-16 px-1">
          {items.slice(0, 5).map(item => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-smooth min-w-0 ${
                activeId === item.id ? 'text-[#FFF]' : 'text-[#555]'
              }`}
              aria-label={item.label}
              aria-current={activeId === item.id ? 'page' : undefined}
            >
              <span>{item.icon}</span>
              <span className="text-[9px] font-semibold truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
