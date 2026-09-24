import React from 'react';

/**
 * Custom line-art landmark icons for international film traditions:
 * 1: Hollywood (Camera & Spotlight)
 * 2: French (Eiffel Tower)
 * 3: Japanese (Torii Gate)
 * 4: British (Big Ben Tower)
 * 5: German (Brandenburg Gate)
 * 6: Italian (Colosseum)
 * 7: Russian (Onion Dome)
 * 8: Korean (Gyeongbokgung Hanok Palace)
 * 9: Indian (Taj Mahal Dome)
 * 10: Chinese (Tiered Pagoda)
 * 11: Spanish (Alhambra Arch & Spire)
 * 12: Scandinavian (Nordic Fjord & Polaris Star)
 * 13: Brazilian (Sugarloaf & Redeemer)
 * 14: Mexican (Stepped Mayan Pyramid)
 */
export default function OriginLandmarkIcon({ id, name, size = 20, color = 'currentColor' }) {
  const norm = (typeof name === 'string' ? name.toLowerCase() : '') + (id ? `_${id}` : '');

  // 1. Hollywood
  if (norm.includes('hollywood') || id === 1) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {/* Film camera & star */}
        <path d="M4 8h10v10H4z" />
        <path d="M14 11l6-4v10l-6-4" />
        <circle cx="7" cy="5" r="2" />
        <circle cx="11" cy="5" r="2" />
      </svg>
    );
  }

  // 2. French Cinema (Eiffel Tower)
  if (norm.includes('french') || id === 2) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v3" />
        <path d="M10 5h4" />
        <path d="M11 5L8 16" />
        <path d="M13 5l3 11" />
        <path d="M7.5 13h9" />
        <path d="M8 16l-4 6" />
        <path d="M16 16l4 6" />
        <path d="M6 22h12" />
        <path d="M10 22c0-2 4-2 4 0" />
      </svg>
    );
  }

  // 3. Japanese Cinema (Torii Gate)
  if (norm.includes('japanese') || id === 3) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5c6-2 12-2 18 0" />
        <path d="M4 8h16" />
        <path d="M7 5v16" />
        <path d="M17 5v16" />
        <path d="M10 8h4" />
      </svg>
    );
  }

  // 4. British Cinema (Big Ben Tower)
  if (norm.includes('british') || id === 4) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l-3 4h6z" />
        <path d="M9 6h6v16H9z" />
        <circle cx="12" cy="11" r="1.5" />
        <path d="M9 16h6" />
        <path d="M7 22h10" />
      </svg>
    );
  }

  // 5. German Cinema (Brandenburg Gate)
  if (norm.includes('german') || id === 5) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M5 6v14" />
        <path d="M9 6v14" />
        <path d="M12 6v14" />
        <path d="M15 6v14" />
        <path d="M19 6v14" />
        <path d="M2 20h20" />
        <path d="M8 3h8v3H8z" />
      </svg>
    );
  }

  // 6. Italian Cinema (Colosseum)
  if (norm.includes('italian') || id === 6) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10c0-4 4-6 9-6s9 2 9 6v10H3V10z" />
        <path d="M6 10v4" />
        <path d="M10 10v4" />
        <path d="M14 10v4" />
        <path d="M18 10v4" />
        <path d="M6 17v3" />
        <path d="M10 17v3" />
        <path d="M14 17v3" />
        <path d="M18 17v3" />
        <path d="M2 20h20" />
      </svg>
    );
  }

  // 7. Russian Cinema (Onion Dome)
  if (norm.includes('russian') || id === 7) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v2" />
        <path d="M12 4c-3 3-4 5-1 8 0 1-1 3-3 4v4h8v-4c-2-1-3-3-3-4 3-3 2-5-1-8z" />
        <path d="M6 22h12" />
        <path d="M9 16h6" />
      </svg>
    );
  }

  // 8. Korean Cinema (Hanok Palace Curved Eaves)
  if (norm.includes('korean') || id === 8) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 8c6-3 14-3 20 0" />
        <path d="M5 8v12" />
        <path d="M19 8v12" />
        <path d="M9 12h6" />
        <path d="M10 20v-5c0-1 1-2 2-2s2 1 2 2v5" />
        <path d="M3 20h18" />
      </svg>
    );
  }

  // 9. Indian Cinema (Taj Mahal Dome)
  if (norm.includes('indian') || id === 9) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v2" />
        <path d="M12 5c-3 2-5 5-2 9h4c3-4 1-7-2-9z" />
        <path d="M6 14h12v7H6z" />
        <path d="M10 21v-4c0-1 1-2 2-2s2 1 2 2v4" />
        <path d="M3 10v11" />
        <path d="M21 10v11" />
        <path d="M2 21h20" />
      </svg>
    );
  }

  // 10. Chinese Cinema (Tiered Pagoda)
  if (norm.includes('chinese') || id === 10) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v2" />
        <path d="M6 6c3-1 9-1 12 0" />
        <path d="M8 6v4" />
        <path d="M16 6v4" />
        <path d="M4 11c4-1 12-1 16 0" />
        <path d="M7 11v5" />
        <path d="M17 11v5" />
        <path d="M2 17c5-1 15-1 20 0" />
        <path d="M6 17v4" />
        <path d="M18 17v4" />
        <path d="M3 21h18" />
      </svg>
    );
  }

  // 11. Spanish Cinema (Sagrada Spire / Alhambra Arch)
  if (norm.includes('spanish') || id === 11) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 21V9l3-5 3 5v12" />
        <path d="M12 21V9l3-5 3 5v12" />
        <path d="M9 14h6" />
        <path d="M3 21h18" />
      </svg>
    );
  }

  // 12. Scandinavian Cinema (Nordic Fjord & Star)
  if (norm.includes('scandinavian') || id === 12) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20l6-9 4 5 4-7 4 11H3z" />
        <path d="M18 4v4m-2-2h4" />
      </svg>
    );
  }

  // 13. Brazilian Cinema (Sugarloaf & Christ)
  if (norm.includes('brazilian') || id === 13) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4v16" />
        <path d="M8 8h8" />
        <path d="M4 20c2-6 6-10 8-10s6 4 8 10H4z" />
      </svg>
    );
  }

  // 14. Mexican Cinema (Stepped Mayan Pyramid)
  if (norm.includes('mexican') || id === 14) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 6h4v3h-4z" />
        <path d="M8 9h8v3H8z" />
        <path d="M6 12h12v4H6z" />
        <path d="M4 16h16v4H4z" />
        <path d="M2 20h20" />
        <path d="M12 9v11" />
      </svg>
    );
  }

  // Default Cinema Clapper
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18" />
      <path d="M7 5l2 4" />
      <path d="M13 5l2 4" />
    </svg>
  );
}
