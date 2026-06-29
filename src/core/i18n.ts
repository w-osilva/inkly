export type Lang = 'en' | 'pt-br';

type Dict = Record<string, string>;

const en: Dict = {
  'popup.globalEnable': 'Enable inkly everywhere',
  'popup.siteEnable': 'Enable on {host}',
  'popup.noSite': 'No site detected for this tab.',
  'popup.loading': 'Loading…',
  'popup.categories': 'Categories',
  'popup.dictionary': 'Dictionary',
  'popup.noWords': 'No words yet. Add words from a suggestion card.',
  'popup.remove': 'Remove',
  'popup.language': 'Language',
  'lang.auto': 'Auto',
  'lang.en': 'English',
  'lang.pt-br': 'Português',
  'card.addToDictionary': 'Add “{word}” to dictionary',
  'card.dismiss': 'Dismiss',
  'card.removeReplacement': 'Remove',
  'category.Agreement': 'Agreement',
  'category.BoundaryError': 'Boundary error',
  'category.Capitalization': 'Capitalization',
  'category.Eggcorn': 'Word mix-up',
  'category.Enhancement': 'Enhancement',
  'category.Formatting': 'Formatting',
  'category.Grammar': 'Grammar',
  'category.Malapropism': 'Malapropism',
  'category.Miscellaneous': 'Miscellaneous',
  'category.Nonstandard': 'Nonstandard',
  'category.Punctuation': 'Punctuation',
  'category.Readability': 'Readability',
  'category.Redundancy': 'Redundancy',
  'category.Regionalism': 'Regionalism',
  'category.Repetition': 'Repetition',
  'category.Spelling': 'Spelling',
  'category.Style': 'Style',
  'category.Typo': 'Typo',
  'category.Usage': 'Usage',
  'category.WordChoice': 'Word choice',
  'popup.defaultTone': 'Default rewrite tone',
  'popup.aiSettings': 'AI settings…',
  'tone.neutral': 'Neutral',
  'tone.formal': 'Formal',
  'tone.casual': 'Casual',
  'tone.confident': 'Confident',
  'tone.friendly': 'Friendly',
  'tone.professional': 'Professional',
  'tone.technical': 'Technical',
  'tone.concise': 'Concise',
  'options.aiHeading': 'AI (bring your own key)',
  'options.aiHint': 'Works with any OpenAI-compatible API (OpenAI, Groq, OpenRouter, Ollama…).',
  'options.endpoint': 'API endpoint',
  'options.apiKey': 'API key',
  'options.model': 'Model',
  'options.save': 'Save',
  'options.saved': 'Saved ✓',
  'options.configured': 'AI is configured.',
  'options.notConfigured': 'Not configured — add your key to enable AI features.',
  'options.provider': 'Provider',
  'options.getKey': 'Get a key →',
  'options.theme': 'Appearance',
  'theme.auto': 'System',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
};

const ptBr: Dict = {
  'popup.globalEnable': 'Ativar o inkly em todos os sites',
  'popup.siteEnable': 'Ativar em {host}',
  'popup.noSite': 'Nenhum site detectado nesta aba.',
  'popup.loading': 'Carregando…',
  'popup.categories': 'Categorias',
  'popup.dictionary': 'Dicionário',
  'popup.noWords': 'Nenhuma palavra ainda. Adicione palavras pelo card de sugestão.',
  'popup.remove': 'Remover',
  'popup.language': 'Idioma',
  'lang.auto': 'Automático',
  'lang.en': 'English',
  'lang.pt-br': 'Português',
  'card.addToDictionary': 'Adicionar “{word}” ao dicionário',
  'card.dismiss': 'Dispensar',
  'card.removeReplacement': 'Remover',
  'category.Agreement': 'Concordância',
  'category.BoundaryError': 'Limite de frase',
  'category.Capitalization': 'Maiúsculas',
  'category.Eggcorn': 'Troca de palavra parecida',
  'category.Enhancement': 'Aprimoramento',
  'category.Formatting': 'Formatação',
  'category.Grammar': 'Gramática',
  'category.Malapropism': 'Malapropismo',
  'category.Miscellaneous': 'Diversos',
  'category.Nonstandard': 'Fora do padrão',
  'category.Punctuation': 'Pontuação',
  'category.Readability': 'Legibilidade',
  'category.Redundancy': 'Redundância',
  'category.Regionalism': 'Regionalismo',
  'category.Repetition': 'Repetição',
  'category.Spelling': 'Ortografia',
  'category.Style': 'Estilo',
  'category.Typo': 'Erro de digitação',
  'category.Usage': 'Uso',
  'category.WordChoice': 'Escolha de palavra',
  'popup.defaultTone': 'Tom padrão da reescrita',
  'popup.aiSettings': 'Configurações de IA…',
  'tone.neutral': 'Neutro',
  'tone.formal': 'Formal',
  'tone.casual': 'Casual',
  'tone.confident': 'Confiante',
  'tone.friendly': 'Amigável',
  'tone.professional': 'Profissional',
  'tone.technical': 'Técnico',
  'tone.concise': 'Conciso',
  'options.aiHeading': 'IA (use sua própria chave)',
  'options.aiHint': 'Funciona com qualquer API compatível com OpenAI (OpenAI, Groq, OpenRouter, Ollama…).',
  'options.endpoint': 'Endpoint da API',
  'options.apiKey': 'Chave da API',
  'options.model': 'Modelo',
  'options.save': 'Salvar',
  'options.saved': 'Salvo ✓',
  'options.configured': 'IA configurada.',
  'options.notConfigured': 'Não configurada — adicione sua chave para habilitar os recursos de IA.',
  'options.provider': 'Provedor',
  'options.getKey': 'Obter uma chave →',
  'options.theme': 'Aparência',
  'theme.auto': 'Sistema',
  'theme.light': 'Claro',
  'theme.dark': 'Escuro',
};

export const MESSAGES: Record<Lang, Dict> = { en, 'pt-br': ptBr };

/** Translate a key; falls back to English, then to the key itself. Interpolates {vars}. */
export function t(lang: Lang, key: string, vars?: Record<string, string>): string {
  const msg = MESSAGES[lang]?.[key] ?? MESSAGES.en[key] ?? key;
  if (!vars) return msg;
  return msg.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}

/** Human label for a Harper category; falls back to the raw category name. */
export function categoryLabel(lang: Lang, category: string): string {
  const key = `category.${category}`;
  const msg = MESSAGES[lang]?.[key] ?? MESSAGES.en[key];
  return msg ?? category;
}

/** Map a BCP-47 locale to a supported UI language. */
export function detectLang(locale: string): Lang {
  return locale.toLowerCase().startsWith('pt') ? 'pt-br' : 'en';
}
