import React, { useState, useEffect, useMemo } from 'react';
import {
  Stethoscope,
  Sparkles,
  GraduationCap,
  Award,
  ChevronDown,
  Search,
  Check,
} from 'lucide-react';
import {
  ExamTrack,
  CourseItem,
  MBBS_BDS_COURSES,
  AYUSH_COURSES,
  PG_MD_COURSES,
  PG_MS_COURSES,
  PG_DIPLOMA_COURSES,
  PG_DNB_COURSES,
  PG_MDS_COURSES,
  PG_DEGREE_CATEGORIES,
  findCourseByCode,
} from '../../lib/courses';

interface FieldCourseSelectorProps {
  field: ExamTrack;
  selectedCourse: string;
  onChange: (course: string, meta?: { degree?: string; specialty?: string }) => void;
  dark?: boolean;
  className?: string;
  compact?: boolean;
  label?: string;
}

export function FieldCourseSelector({
  field,
  selectedCourse,
  onChange,
  dark = false,
  className = '',
  compact = false,
  label = 'Select Course / Speciality',
}: FieldCourseSelectorProps) {
  // Internal PG degree category tab ('ALL', 'MD', 'MS', 'Diploma', 'DNB', 'MDS')
  const [pgDegree, setPgDegree] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-detect and sync pgDegree if selectedCourse changes from outside
  useEffect(() => {
    if (field === 'NEET_PG') {
      const matched = findCourseByCode(selectedCourse);
      if (matched?.degree) {
        setPgDegree(matched.degree);
      } else if (!selectedCourse || selectedCourse === 'All' || selectedCourse === 'All PG') {
        // Keep current degree tab or default to ALL
      }
    }
  }, [field, selectedCourse]);

  // When field switches, reset degree and search
  useEffect(() => {
    setSearchQuery('');
    if (field !== 'NEET_PG') {
      setPgDegree('ALL');
    }
  }, [field]);

  // Specific course list for NEET PG based on the active degree tab
  const pgDegreeCourses = useMemo(() => {
    switch (pgDegree) {
      case 'MD':
        return PG_MD_COURSES;
      case 'MS':
        return PG_MS_COURSES;
      case 'Diploma':
        return PG_DIPLOMA_COURSES;
      case 'DNB':
        return PG_DNB_COURSES;
      case 'MDS':
        return PG_MDS_COURSES;
      default:
        return [...PG_MD_COURSES, ...PG_MS_COURSES, ...PG_DIPLOMA_COURSES];
    }
  }, [pgDegree]);

  // Filtered courses based on search query
  const filteredPgCourses = useMemo(() => {
    if (!searchQuery.trim()) return pgDegreeCourses;
    const q = searchQuery.toLowerCase().trim();
    return pgDegreeCourses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [pgDegreeCourses, searchQuery]);

  // Theme styling helpers
  const mutedText = dark ? 'text-white/60' : 'text-slate-500';
  const labelText = dark ? 'text-white/70' : 'text-slate-600';
  const inputBg = dark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';
  const activeBtn = 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-md shadow-orange-500/20 font-bold';
  const inactiveBtn = dark
    ? 'bg-white/[0.04] text-white/70 border-white/10 hover:border-orange-500/40 hover:text-white'
    : 'bg-white text-slate-700 border-slate-200 hover:border-orange-500/40 hover:bg-orange-50/50';

  const selectedItem = findCourseByCode(selectedCourse);

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold uppercase tracking-wide ${labelText}`}>
            {label}
          </span>
          {selectedCourse && selectedCourse !== 'All' && (
            <span className="text-[11px] font-semibold text-orange-400 flex items-center gap-1">
              <Check className="w-3 h-3 text-orange-400" />
              {selectedItem?.shortName || selectedCourse}
            </span>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          1. MBBS / BDS FIELD SELECTION
      ────────────────────────────────────────────────────────── */}
      {field === 'MBBS_BDS' && (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onChange('All')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
              selectedCourse === 'All' || !selectedCourse ? activeBtn : inactiveBtn
            }`}
          >
            <span>All Courses</span>
            <span className="text-[9px] opacity-75 font-normal">MBBS + BDS</span>
          </button>

          {MBBS_BDS_COURSES.map((c) => {
            const isSelected = selectedCourse === c.code || selectedCourse === c.name;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange(c.code, { degree: c.degree })}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                  isSelected ? activeBtn : inactiveBtn
                }`}
              >
                <span>{c.code === 'MBBS' ? '🏥 MBBS' : '🦷 BDS'}</span>
                <span className="text-[9px] opacity-75 font-normal">
                  {c.code === 'MBBS' ? 'Medicine & Surgery' : 'Dental Surgery'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          2. AYUSH FIELD SELECTION
      ────────────────────────────────────────────────────────── */}
      {field === 'AYUSH' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onChange('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                selectedCourse === 'All' || !selectedCourse ? activeBtn : inactiveBtn
              }`}
            >
              🌿 All AYUSH
            </button>

            {AYUSH_COURSES.map((c) => {
              const isSelected = selectedCourse === c.code || selectedCourse === c.name;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChange(c.code, { degree: c.degree })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    isSelected ? activeBtn : inactiveBtn
                  }`}
                >
                  {c.shortName}
                </button>
              );
            })}
          </div>

          {selectedItem && selectedItem.field === 'AYUSH' && (
            <p className={`text-[11px] leading-relaxed ${mutedText} pt-0.5`}>
              ℹ️ {selectedItem.name} — {selectedItem.description}
            </p>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          3. NEET PG FIELD SELECTION (MD / MS / Diploma / DNB / MDS)
      ────────────────────────────────────────────────────────── */}
      {field === 'NEET_PG' && (
        <div className="space-y-3">
          {/* Degree Tabs */}
          <div>
            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              {PG_DEGREE_CATEGORIES.map((cat) => {
                const isActive = pgDegree === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setPgDegree(cat.id);
                      if (cat.id === 'ALL') {
                        onChange('All');
                      } else {
                        // Default to the degree name or let user pick specialty
                        onChange(cat.id, { degree: cat.id });
                      }
                    }}
                    className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-sm'
                        : `${mutedText} hover:text-orange-500`
                    }`}
                  >
                    {cat.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specialty Dropdown & Search Picker */}
          {pgDegree !== 'ALL' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider text-orange-400`}>
                  {pgDegree === 'MD' && '🩺 Choose MD Speciality'}
                  {pgDegree === 'MS' && '🔪 Choose MS Speciality'}
                  {pgDegree === 'Diploma' && '📜 Choose PG Diploma Course'}
                  {pgDegree === 'DNB' && '🏥 Choose DNB Speciality'}
                  {pgDegree === 'MDS' && '🦷 Choose MDS Speciality'}
                </span>
                <span className={`text-[10px] font-semibold ${mutedText}`}>
                  {filteredPgCourses.length} options
                </span>
              </div>

              {/* Quick search input if more than 6 courses */}
              {pgDegreeCourses.length > 6 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-400/70" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${pgDegree} specialities (e.g. Medicine, Surgery, Radio...)`}
                    className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-orange-500 ${inputBg}`}
                  />
                </div>
              )}

              {/* Course Select Dropdown & Pills */}
              <div className="relative">
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    const val = e.target.value;
                    const meta = findCourseByCode(val);
                    onChange(val, { degree: meta?.degree || pgDegree, specialty: val });
                  }}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-orange-500/40 appearance-none pr-8 cursor-pointer ${inputBg}`}
                >
                  <option value={pgDegree}>
                    All {pgDegree} Specialities ({pgDegreeCourses.length} branches)
                  </option>
                  {filteredPgCourses.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.name} {c.category ? `• ${c.category}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400 pointer-events-none" />
              </div>

              {/* Popular Speciality Quick Pills for High Demand Branches */}
              {!compact && (
                <div className="space-y-1 pt-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                    Popular {pgDegree} Branches:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {pgDegreeCourses.slice(0, 5).map((c) => {
                      const isSel = selectedCourse === c.code;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onChange(c.code, { degree: c.degree, specialty: c.code })}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                            isSel
                              ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                              : dark
                              ? 'bg-white/5 text-white/70 border-white/10 hover:border-orange-500/40 hover:text-white'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-orange-500/40'
                          }`}
                        >
                          {c.shortName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Course Description / Badge */}
              {selectedItem && (
                <div
                  className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                    dark
                      ? 'bg-orange-500/10 border-orange-500/20 text-orange-200'
                      : 'bg-orange-50 border-orange-200 text-orange-950'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-orange-500">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {selectedItem.name}
                    </span>
                    {selectedItem.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 font-bold uppercase">
                        {selectedItem.category}
                      </span>
                    )}
                  </div>
                  {selectedItem.description && (
                    <p className={`text-[11px] leading-relaxed opacity-90`}>
                      {selectedItem.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FieldCourseSelector;
