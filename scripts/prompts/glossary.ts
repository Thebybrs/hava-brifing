// scripts/prompts/glossary.ts — §6.2 korunacak terimler

export const KEEP_ENGLISH_AVIATION = [
  // Meteoroloji / NOTAM
  'METAR', 'TAF', 'SIGMET', 'AIRMET', 'NOTAM', 'ATIS', 'CAVOK', 'windshear', 'microburst', 'crosswind',
  // Performans / prosedür
  'FL (Flight Level, örn. FL350)', 'V1', 'VR', 'V2', 'VREF', 'TOGA', 'derate', 'flex temp', 'rejected takeoff (RTO)',
  'go-around', 'missed approach', 'stabilised approach', 'unstable approach', 'flare', 'tail strike', 'runway excursion',
  'runway incursion', 'CFIT', 'LOC-I', 'TCAS RA/TA', 'GPWS/EGPWS', 'windshear alert',
  'ILS', 'LOC', 'GS', 'RNAV', 'RNP', 'RNP AR', 'VOR', 'NDB', 'SID', 'STAR', 'ETOPS/EDTO', 'RVSM', 'MEL', 'CDL', 'AD (Airworthiness Directive)', 'SB', 'SIB',
  // Sistemler (A320/B737 vb.)
  'ECAM', 'EICAS', 'PFD', 'ND', 'FMA', 'FMGC', 'FMS', 'FCU', 'MCP', 'autopilot (AP)', 'autothrust (A/THR)', 'autothrottle',
  'fly-by-wire (FBW)', 'normal/alternate/direct law', 'FADEC', 'APU', 'IDG', 'PTU', 'hydraulic (green/blue/yellow)',
  'bleed', 'packs', 'pitot', 'AoA', 'ADIRU', 'MCAS', 'slats/flaps', 'spoilers', 'speedbrake', 'trim', 'elevator', 'CVR', 'FDR', 'QAR',
  // Mürettebat / organizasyon
  'PIC', 'SIC', 'PF', 'PM', 'PNF', 'CRM', 'TEM', 'SOP', 'QRH', 'FCOM', 'FCTM', 'checklist', 'briefing', 'callout',
  'Captain', 'First Officer (FO)', 'MPL', 'ATPL', 'CPL', 'PPL', 'type rating', 'OPC', 'LPC', 'LOFT', 'EBT', 'CBTA', 'FSTD', 'FFS',
  // Otoriteler
  'EASA', 'FAA', 'SHGM', 'ICAO', 'NTSB', 'BEA', 'AAIB', 'UEAK', 'TSB', 'IATA', 'EUROCONTROL', 'ATC', 'ACC', 'APP', 'TWR',
];

export const KEEP_ENGLISH_AI = [
  'LLM', 'transformer', 'MoE (Mixture of Experts)', 'attention', 'context window', 'token', 'embedding', 'RAG', 'fine-tuning',
  'RLHF', 'RLAIF', 'DPO', 'distillation', 'quantization', 'inference', 'latency', 'throughput', 'agent', 'tool use / function calling',
  'MCP (Model Context Protocol)', 'multimodal', 'reasoning model', 'chain-of-thought', 'benchmark adları (SWE-bench, MMLU, GPQA, ARC-AGI...)',
  'open-weights', 'GPU/TPU/NPU', 'CUDA', 'API', 'SDK', 'prompt', 'system prompt', 'guardrails', 'hallucination', 'eval',
  // Model/ürün/şirket adları ASLA çevrilmez ve yazımı değiştirilmez:
  'GPT', 'o-serisi', 'Claude', 'Gemini', 'Llama', 'Mistral', 'DeepSeek', 'Qwen', 'Grok', 'Copilot', 'Cursor', 'Antigravity',
];
