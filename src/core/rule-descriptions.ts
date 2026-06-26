import { Lang } from './i18n';

/**
 * Portuguese descriptions of Harper rules, keyed by the rule's PascalCase name
 * (the `organizedLints` key, also the `getLintDescriptions` key). Curated and
 * community-extensible: rules without an entry fall back to Harper's live
 * English message. Add entries over time to grow coverage.
 */
export const RULE_DESCRIPTIONS_PT: Record<string, string> = {
  SpellCheck: 'Procura e corrige palavras escritas incorretamente.',
  RepeatedWords: 'Detecta palavras repetidas em sequência.',
  AnA: 'Verifica o uso incorreto dos artigos indefinidos "a"/"an" em inglês.',
  AnAnother: 'Corrige construções como "an another" / "a another".',
  ToTwoToo: 'Corrige a confusão entre os homófonos "to" e "too".',
  PronounVerbAgreement: 'Garante a concordância entre o pronome e o verbo.',
  PronounInflectionBe: 'Concordância do verbo "be" com o sujeito (he/she/it → is; they → are).',
  IAmAgreement: 'Corrige "I are" para "I am".',
  CapitalizePersonalPronouns: 'Pronomes pessoais em inglês, como "I", devem ser maiúsculos.',
  SentenceCapitalization: 'A primeira palavra de uma frase deve começar com letra maiúscula.',
  ItsContraction: "Use a contração \"it’s\" (de \"it is\"/\"it has\") em vez do possessivo \"its\".",
  ItsPossessive: "Use o possessivo \"its\" (sem apóstrofo) para indicar posse; \"it’s\" significa \"it is/has\".",
  Misspell: 'Garante que "misspell" seja escrito como uma única palavra.',
  SpelledNumbers: 'A maioria dos guias de estilo recomenda escrever por extenso números menores que dez.',
  OxfordComma: 'Verifica a vírgula de Oxford antes de "and"/"or"/"nor" em listas de três ou mais itens.',
  WasComprisedOf: 'Reescreve a expressão "was comprised of" para uma forma mais aceita.',
};

/**
 * The explanation to show for a suggestion. In pt-br, prefer a translated rule
 * description when we have one; otherwise (and always in en) use Harper's live
 * message. Translating the dynamic message itself is out of scope (AI/future).
 */
export function ruleExplanation(lang: Lang, ruleId: string, liveMessage: string): string {
  if (lang === 'pt-br' && ruleId && RULE_DESCRIPTIONS_PT[ruleId]) {
    return RULE_DESCRIPTIONS_PT[ruleId];
  }
  return liveMessage;
}
