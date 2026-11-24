import { ArrowDown, ArrowUp, Edit3, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toBn } from '../data/defaultData';
import type { RuleItem } from '../types/unity';

interface RulesViewProps {
  rules: RuleItem[];
  isAdmin: boolean;
  onAddRule: (title: string, description: string) => void;
  onUpdateRule: (id: string, title: string, description: string) => void;
  onDeleteRule: (id: string) => void;
  onMoveRule: (index: number, direction: 'up' | 'down') => void;
}

export function RulesView({
  rules,
  isAdmin,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onMoveRule,
}: RulesViewProps) {
  const [query, setQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const filtered = rules.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
  });

  const handleSaveNew = () => {
    if (!newTitle.trim() || !newDesc.trim()) return;
    onAddRule(newTitle.trim(), newDesc.trim());
    setNewTitle('');
    setNewDesc('');
    setShowAddForm(false);
  };

  const startEdit = (rule: RuleItem) => {
    setEditingId(rule.id);
    setEditTitle(rule.title);
    setEditDesc(rule.description);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editTitle.trim() || !editDesc.trim()) return;
    onUpdateRule(editingId, editTitle.trim(), editDesc.trim());
    setEditingId(null);
  };

  return (
    <div className="space-y-5">
      {/* Header Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
              BARAKAH MULTICARE HOSPITAL UNITY · নীতিমালা
            </p>
            <h2 className="font-display mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              রুলস &amp; রেগুলেশন ({toBn(rules.length)}টি নিয়ম)
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              সকল সদস্যের স্বচ্ছতা, শৃঙ্খলা এবং সময়মতো ডিপোজিট নিশ্চিত করতে নিচের নিয়মাবলি প্রযোজ্য।
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-800 active:scale-[0.98] whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>নতুন নিয়ম যোগ করুন</span>
            </button>
          )}
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="নিয়ম খুঁজুন (যেমন: বিকাশ, ড্র, রাত ৮টা)..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-4 pl-10 text-sm text-slate-900 outline-none transition-colors focus:border-teal-600 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-500"
          />
        </div>
      </div>

      {/* Inline Admin Add Rule Form */}
      {isAdmin && showAddForm && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 dark:border-teal-900/60 dark:bg-teal-950/30">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            নতুন নিয়ম যুক্ত করুন
          </h3>
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                নিয়মের শিরোনাম
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="যেমন: জরুরি অবহিতকরণ"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                বিস্তারিত বিবরণ
              </label>
              <textarea
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="নিয়মের পূর্ণ বিবরণ লিখুন..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveNew}
                className="h-11 flex-1 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
              >
                সংরক্ষণ করুন
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="divide-y divide-slate-200/80 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            কোনো নিয়ম পাওয়া যায়নি।
          </div>
        ) : (
          filtered.map((rule) => {
            const realIndex = rules.findIndex((r) => r.id === rule.id);
            const isEditing = editingId === rule.id;

            return (
              <div key={rule.id} className="p-4 sm:p-5">
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <textarea
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="h-10 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white hover:bg-teal-800"
                      >
                        আপডেট করুন
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="h-10 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        বাতিল
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3.5">
                    <span className="font-mono-num mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-xs font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      {toBn(String(realIndex + 1).padStart(2, '0'))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
                        {rule.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {rule.description}
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={realIndex === 0}
                          onClick={() => onMoveRule(realIndex, 'up')}
                          aria-label="উপরে নিন"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={realIndex === rules.length - 1}
                          onClick={() => onMoveRule(realIndex, 'down')}
                          aria-label="নিচে নিন"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(rule)}
                          aria-label="সম্পাদনা করুন"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRule(rule.id)}
                          aria-label="মুছুন"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
