// scripts/prompts/briefing.user.ts — §6.4 Stage B user prompt şablonu ve renderUserPrompt()

export const BRIEFING_USER_TEMPLATE = `BUGÜN (TRT): {{RUN_DATE_TR}}
ZAMAN PENCERESİ (UTC): {{WINDOW_FROM_UTC}} → {{WINDOW_TO_UTC}}

LİMİTLER (üst sınır, doldurma zorunlu DEĞİL):
- commercial_aviation: en fazla {{MAX_COMMERCIAL}}
- accidents_and_incidents: en fazla {{MAX_ACCIDENTS}}
- piloting_and_ops: en fazla {{MAX_PILOTING}}
- ai_developments: en fazla {{MAX_AI}}

=== DAHA ÖNCE RAPORLANANLAR (tekrar yazma, yalnızca yeni gelişme varsa) ===
{{PREVIOUS_HEADLINES}}

=== RSS HABERLERİ ===
{{RSS_BLOCK}}

=== ARAŞTIRMA NOTLARI (Google Search) ===
{{GROUNDING_BLOCK}}

Yukarıdaki verilerden, system talimatlarına ve şemaya tam uyan günlük brifing JSON'unu üret.`;

export interface BriefingUserPromptVars {
  RUN_DATE_TR: string;
  WINDOW_FROM_UTC: string;
  WINDOW_TO_UTC: string;
  MAX_COMMERCIAL: number | string;
  MAX_ACCIDENTS: number | string;
  MAX_PILOTING: number | string;
  MAX_AI: number | string;
  PREVIOUS_HEADLINES: string;
  RSS_BLOCK: string;
  GROUNDING_BLOCK: string;
}

export function renderUserPrompt(vars: BriefingUserPromptVars): string {
  const requiredKeys: (keyof BriefingUserPromptVars)[] = [
    'RUN_DATE_TR',
    'WINDOW_FROM_UTC',
    'WINDOW_TO_UTC',
    'MAX_COMMERCIAL',
    'MAX_ACCIDENTS',
    'MAX_PILOTING',
    'MAX_AI',
    'PREVIOUS_HEADLINES',
    'RSS_BLOCK',
    'GROUNDING_BLOCK',
  ];

  for (const key of requiredKeys) {
    const val = vars[key];
    if (val === undefined || val === null || String(val).trim() === '') {
      throw new Error(`renderUserPrompt: '${key}' değeri eksik veya boş.`);
    }
  }

  let result = BRIEFING_USER_TEMPLATE;
  for (const key of requiredKeys) {
    result = result.replaceAll(`{{${key}}}`, String(vars[key]));
  }

  const unreplaced = /\{\{[A-Z0-9_]+\}\}/.exec(result);
  if (unreplaced) {
    throw new Error(`Eksik user prompt placeholder: ${unreplaced[0]}`);
  }

  return result;
}
