import { useMemo, useState } from 'react';
import { FiCheckCircle, FiExternalLink, FiKey, FiSearch } from 'react-icons/fi';
import {
  APP_SHORTCUT_COMBOS,
  APP_TALLY_SHORTCUTS,
  TALLY_SHORTCUT_SECTIONS,
  TALLY_SHORTCUT_SOURCE,
} from '../../../data/tallyShortcuts';

const splitShortcuts = (shortcut) => shortcut.split(' / ').map((item) => item.trim());

function ShortcutKeys({ shortcut }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {splitShortcuts(shortcut).map((key) => (
        <kbd key={key} className="rounded border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[11px] font-semibold text-gray-700">
          {key}
        </kbd>
      ))}
    </div>
  );
}

function isSupported(shortcut) {
  return splitShortcuts(shortcut).some((key) => APP_SHORTCUT_COMBOS.has(key));
}

export default function TallyShortcuts() {
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState('all');

  const filteredSections = useMemo(() => {
    const term = query.trim().toLowerCase();
    return TALLY_SHORTCUT_SECTIONS
      .filter((section) => activeSection === 'all' || section.id === activeSection)
      .map((section) => ({
        ...section,
        shortcuts: section.shortcuts.filter((shortcut) => {
          if (!term) return true;
          return [
            section.label,
            shortcut.action,
            shortcut.shortcut,
            shortcut.location,
            shortcut.erp9,
          ].join(' ').toLowerCase().includes(term);
        }),
      }))
      .filter((section) => section.shortcuts.length > 0);
  }, [activeSection, query]);

  const totalCount = TALLY_SHORTCUT_SECTIONS.reduce((sum, section) => sum + section.shortcuts.length, 0);
  const visibleCount = filteredSections.reduce((sum, section) => sum + section.shortcuts.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#003087]">
            <FiKey size={20} />
            <h2 className="text-xl font-bold text-gray-900">Tally Shortcut Keys</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {totalCount} TallyPrime shortcuts, verified from TallyHelp on {TALLY_SHORTCUT_SOURCE.lastUpdated}.
          </p>
        </div>
        <a
          href={TALLY_SHORTCUT_SOURCE.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          Official Source <FiExternalLink size={13} />
        </a>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid gap-4 border-b border-gray-100 p-4 lg:grid-cols-[1fr_280px]">
          <div className="flex flex-wrap gap-2">
            {[{ id: 'all', label: 'All' }, ...TALLY_SHORTCUT_SECTIONS].map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                  activeSection === section.id
                    ? 'border-[#003087] bg-[#003087] text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <FiSearch size={15} className="text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search shortcut"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </label>
        </div>

        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Active in this website</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {APP_TALLY_SHORTCUTS.map((shortcut) => (
              <div key={`${shortcut.combo}-${shortcut.action}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <span className="truncate text-xs font-medium text-gray-600">{shortcut.action}</span>
                <kbd className="shrink-0 rounded border border-blue-100 bg-blue-50 px-2 py-1 font-mono text-[11px] font-bold text-[#003087]">
                  {shortcut.combo}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 text-xs text-gray-400">
          Showing {visibleCount} shortcut{visibleCount === 1 ? '' : 's'}
        </div>

        <div className="divide-y divide-gray-100">
          {filteredSections.map((section) => (
            <section key={section.id}>
              <div className="bg-gray-50 px-4 py-3">
                <h3 className="text-sm font-bold text-gray-900">{section.label}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Action', 'Shortcut Key', 'Available At', 'Tally.ERP 9', 'Website'].map((header) => (
                        <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {section.shortcuts.map((shortcut) => {
                      const supported = isSupported(shortcut.shortcut);
                      return (
                        <tr key={`${section.id}-${shortcut.action}-${shortcut.shortcut}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{shortcut.action}</td>
                          <td className="px-4 py-3"><ShortcutKeys shortcut={shortcut.shortcut} /></td>
                          <td className="px-4 py-3 text-gray-500">{shortcut.location}</td>
                          <td className="px-4 py-3 text-gray-500">{shortcut.erp9}</td>
                          <td className="px-4 py-3">
                            {supported ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700">
                                <FiCheckCircle size={12} /> Active
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-500">
                                Reference
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          {filteredSections.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-gray-400">No shortcut found</div>
          )}
        </div>
      </div>
    </div>
  );
}
