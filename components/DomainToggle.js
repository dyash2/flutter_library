/**
 * DomainToggle.js
 * ─────────────────────────────────────────────────────────────
 * A pill-style toggle in the navbar to switch between
 * Flutter and CyberSecurity domains.
 * ─────────────────────────────────────────────────────────────
 */

import { useDomain, DOMAINS } from '../context/DomainContext';

export default function DomainToggle() {
  const { domainKey, switchDomain } = useDomain();

  return (
    <div className="domain-toggle" title="Switch domain">
      {Object.values(DOMAINS).map((d) => {
        const isActive = d.key === domainKey;
        return (
          <button
            key={d.key}
            onClick={() => switchDomain(d.key)}
            className={`domain-toggle-pill ${
              isActive
                ? d.key === 'flutter'
                  ? 'active-flutter'
                  : 'active-cyber'
                : 'inactive'
            }`}
          >
            <span className="mr-1">{d.icon}</span>
            {d.label}
          </button>
        );
      })}
    </div>
  );
}
