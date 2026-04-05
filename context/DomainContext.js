/**
 * DomainContext.js
 * ─────────────────────────────────────────────────────────────
 * Provides the active domain ('flutter' | 'cybersecurity')
 * throughout the app. Persists to localStorage so the user's
 * last domain survives page refreshes.
 *
 * Also applies/removes the 'theme-cyber' class on <html>
 * so CSS variables switch instantly.
 * ─────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'active-domain';

export const DOMAINS = {
  flutter: {
    key:         'flutter',
    label:       'Flutter',
    icon:        '📘',
    accent:      '#027DFD',
    accentLight: '#54C5F8',
    themeClass:  '',                     // default theme — no extra class
    appName:     'Flutter',
    shortName:   'FlutterLib',
    description: 'Personal Flutter Q&A — works offline',
    addLabel:    'Add Flutter Question',
    emptyTitle:  'Your Flutter library is empty',
    emptyMsg:    "Start adding Flutter interview questions you've encountered!",
    formSubtitle:'Add to your Flutter knowledge base',
    placeholder: {
      question: 'e.g. What is the difference between StatelessWidget and StatefulWidget?',
      answer:   'Write your Flutter answer here. You can use **bold**, `code`, and ```code blocks```',
      tags:     'e.g. state, widgets, lifecycle',
      category: 'e.g. State Management',
    },
    // Questions in Supabase without a `domain` field belong to Flutter
    // (backward-compatible with the existing database)
    filter: (q) => !q.domain || q.domain === 'flutter',
    newFields: () => ({ domain: 'flutter' }),
  },

  cybersecurity: {
    key:         'cybersecurity',
    label:       'CyberSecurity',
    icon:        '🔐',
    accent:      '#E8873A',
    accentLight: '#F5A623',
    themeClass:  'theme-cyber',
    appName:     'CyberSecurity',
    shortName:   'CyberLib',
    description: 'Personal CyberSecurity Q&A — works offline',
    addLabel:    'Add Cyber Question',
    emptyTitle:  'Your CyberSecurity library is empty',
    emptyMsg:    "Start adding CyberSecurity interview questions you've encountered!",
    formSubtitle:'Add to your CyberSecurity knowledge base',
    placeholder: {
      question: 'e.g. What is the difference between symmetric and asymmetric encryption?',
      answer:   'Write your CyberSecurity answer here. You can use **bold**, `code`, and ```code blocks```',
      tags:     'e.g. encryption, network, OWASP',
      category: 'e.g. Network Security',
    },
    filter: (q) => q.domain === 'cybersecurity',
    newFields: () => ({ domain: 'cybersecurity' }),
  },
};

// ── Context ────────────────────────────────────────────────

const DomainContext = createContext(null);

export function DomainProvider({ children }) {
  const [domainKey, setDomainKey] = useState('flutter');

  // On mount: read persisted preference + apply theme class
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || 'flutter';
    applyDomain(saved);
  }, []);

  const applyDomain = useCallback((key) => {
    const domain = DOMAINS[key] || DOMAINS.flutter;

    // Apply / remove theme class on <html>
    document.documentElement.classList.remove('theme-cyber');
    if (domain.themeClass) {
      document.documentElement.classList.add(domain.themeClass);
    }

    localStorage.setItem(STORAGE_KEY, key);
    setDomainKey(key);
  }, []);

  const switchDomain = useCallback((key) => {
    applyDomain(key);
  }, [applyDomain]);

  const domain = DOMAINS[domainKey] || DOMAINS.flutter;

  return (
    <DomainContext.Provider value={{ domain, domainKey, switchDomain, DOMAINS }}>
      {children}
    </DomainContext.Provider>
  );
}

export function useDomain() {
  const ctx = useContext(DomainContext);
  if (!ctx) throw new Error('useDomain must be used inside DomainProvider');
  return ctx;
}
