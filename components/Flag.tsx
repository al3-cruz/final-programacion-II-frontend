import React from 'react';

export const TEAM_ISO_CODES: Record<string, string> = {
  'México': 'mx',
  'Sudáfrica': 'za',
  'Corea del sur': 'kr',
  'Chequia': 'cz',
  'Canadá': 'ca',
  'Bosnia': 'ba',
  'BiH': 'ba',
  'Catar': 'qa',
  'Suiza': 'ch',
  'Brasil': 'br',
  'Marruecos': 'ma',
  'Haití': 'ht',
  'Escocia': 'gb-sct',
  'Estados Unidos': 'us',
  'Paraguay': 'py',
  'Australia': 'au',
  'Turquía': 'tr',
  'Alemania': 'de',
  'Curazao': 'cw',
  'Costa de Marfil': 'ci',
  'Ecuador': 'ec',
  'Países Bajos': 'nl',
  'Japón': 'jp',
  'Suecia': 'se',
  'Túnez': 'tn',
  'Bélgica': 'be',
  'Egipto': 'eg',
  'Irán': 'ir',
  'Nueva Zelanda': 'nz',
  'España': 'es',
  'Cabo Verde': 'cv',
  'Arabia Saudí': 'sa',
  'Uruguay': 'uy',
  'Francia': 'fr',
  'Senegal': 'sn',
  'Irak': 'iq',
  'Noruega': 'no',
  'Argentina': 'ar',
  'Argelia': 'dz',
  'Austria': 'at',
  'Jordania': 'jo',
  'Portugal': 'pt',
  'RD Congo': 'cd',
  'Uzbekistán': 'uz',
  'Colombia': 'co',
  'Inglaterra': 'gb-eng',
  'Croacia': 'hr',
  'Ghana': 'gh',
  'Panamá': 'pa',
};

// Fallback emojis in case the image fails
export const TEAM_EMOJIS: Record<string, string> = {
  'México': '🇲🇽',
  'Sudáfrica': '🇿🇦',
  'Corea del sur': '🇰🇷',
  'Chequia': '🇨🇿',
  'Canadá': '🇨🇦',
  'Bosnia': '🇧🇦',
  'BiH': '🇧🇦',
  'Catar': '🇶🇦',
  'Suiza': '🇨🇭',
  'Brasil': '🇧🇷',
  'Marruecos': '🇲🇦',
  'Haití': '🇭🇹',
  'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Estados Unidos': '🇺🇸',
  'Paraguay': '🇵🇾',
  'Australia': '🇦🇺',
  'Turquía': '🇹🇷',
  'Alemania': '🇩🇪',
  'Curazao': '🇨🇼',
  'Costa de Marfil': '🇨🇮',
  'Ecuador': '🇪🇨',
  'Países Bajos': '🇳🇱',
  'Japón': '🇯🇵',
  'Suecia': '🇸🇪',
  'Túnez': '🇹🇳',
  'Bélgica': '🇧🇪',
  'Egipto': '🇪🇬',
  'Irán': '🇮🇷',
  'Nueva Zelanda': '🇳🇿',
  'España': '🇪🇸',
  'Cabo Verde': '🇨🇻',
  'Arabia Saudí': '🇸🇦',
  'Uruguay': '🇺🇾',
  'Francia': '🇫🇷',
  'Senegal': '🇸🇳',
  'Irak': '🇮🇶',
  'Noruega': '🇳🇴',
  'Argentina': '🇦🇷',
  'Argelia': '🇩🇿',
  'Austria': '🇦🇹',
  'Jordania': '🇯🇴',
  'Portugal': '🇵🇹',
  'RD Congo': '🇨🇩',
  'Uzbekistán': '🇺🇿',
  'Colombia': '🇨🇴',
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Croacia': '🇭🇷',
  'Ghana': '🇬🇭',
  'Panamá': '🇵🇦',
};

interface FlagProps {
  teamName: string;
  className?: string;
  variant?: 'circle' | 'rect';
}

export const Flag: React.FC<FlagProps> = ({ teamName, className = '', variant = 'circle' }) => {
  if (!teamName) return <span className="inline-block">🏳️</span>;

  // Clean the team name to search in our mapping
  const cleanedName = teamName.trim();
  const iso = TEAM_ISO_CODES[cleanedName];

  if (iso) {
    const sizeClasses = variant === 'circle' ? 'w-5 h-5 rounded-full' : 'w-6 h-4 rounded-xs';
    return (
      <img
        src={`https://flagcdn.com/w40/${iso}.png`}
        srcSet={`https://flagcdn.com/w80/${iso}.png 2x`}
        alt={teamName}
        className={`inline-block object-cover shadow-xs border border-slate-200/50 dark:border-slate-700/50 ${sizeClasses} ${className}`}
        referrerPolicy="no-referrer"
        onError={(e) => {
          // If the image fails to load, fall back to the emoji flag
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const fallbackSpan = document.createElement('span');
            fallbackSpan.className = `inline-block text-base ${className}`;
            fallbackSpan.innerText = TEAM_EMOJIS[cleanedName] || '🏳️';
            parent.appendChild(fallbackSpan);
          }
        }}
      />
    );
  }

  // Fallback for placeholder teams (e.g., "Ganador 16avos 1" or "2J" etc.)
  return (
    <span className={`inline-block text-base leading-none select-none ${className}`}>
      {TEAM_EMOJIS[cleanedName] || '🏳️'}
    </span>
  );
};
