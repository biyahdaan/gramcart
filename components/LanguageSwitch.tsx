
import React from 'react';
import { Language } from '../types';

interface Props {
  current: Language;
  onChange: (lang: Language) => void;
}

export const LanguageSwitch: React.FC<Props> = ({ current, onChange }) => {
  return (
    <div className="flex bg-gray-100 p-1 rounded-lg">
      <button 
        onClick={() => onChange(Language.EN)}
        className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${current === Language.EN ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
      >
        English
      </button>
      <button 
        onClick={() => onChange(Language.HI)}
        className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${current === Language.HI ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
      >
        हिन्दी
      </button>
    </div>
  );
};
