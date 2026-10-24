// scripts/config/sources.ts — §4.1 ve §5 RSS kaynak tablosu

export type FeedGroup = 'aviation' | 'accidents' | 'piloting' | 'ai';

export interface FeedSource {
  id: string;                 // "avherald"
  name: string;               // "The Aviation Herald"
  url: string;
  group: FeedGroup;           // kategori İPUCU (modeli kısıtlamaz)
  priority: 1 | 2 | 3;        // 1 = en yüksek (token bütçesi kısıtında önce alınır)
  maxItems: number;           // feed başına üst sınır
  filter?: { includeRegex?: string; minPoints?: number }; // HN gibi gürültülü kaynaklar
  enabled: boolean;
}

export const FEEDS: FeedSource[] = [
  {
    id: 'avherald',
    name: 'The Aviation Herald',
    url: 'https://avherald.com/h?subscribe=rss',
    group: 'accidents',
    priority: 1,
    maxItems: 25,
    enabled: false,
  },
  {
    id: 'aeroinside',
    name: 'AeroInside',
    url: 'https://www.aeroinside.com/rss',
    group: 'accidents',
    priority: 1,
    maxItems: 25,
    enabled: false,
  },
  {
    id: 'avherald_gnews',
    name: 'The Aviation Herald',
    url: 'https://news.google.com/rss/search?q=site:avherald.com+when:2d&hl=en-US&gl=US&ceid=US:en',
    group: 'accidents',
    priority: 1,
    maxItems: 20,
    enabled: true,
  },
  {
    id: 'asn_gnews',
    name: 'Aviation Safety Network',
    url: 'https://news.google.com/rss/search?q=site:aviation-safety.net+OR+"aircraft+incident"+OR+"runway+excursion"+when:1d&hl=en-US&gl=US&ceid=US:en',
    group: 'accidents',
    priority: 1,
    maxItems: 20,
    enabled: true,
  },
  {
    id: 'simpleflying',
    name: 'Simple Flying',
    url: 'https://simpleflying.com/feed/',
    group: 'aviation',
    priority: 2,
    maxItems: 25,
    enabled: true,
  },
  {
    id: 'flightglobal',
    name: 'FlightGlobal',
    url: 'https://news.google.com/rss/search?q=site:flightglobal.com+when:2d&hl=en-US&gl=US&ceid=US:en',
    group: 'aviation',
    priority: 2,
    maxItems: 20,
    enabled: true,
  },
  {
    id: 'boeing_gnews',
    name: 'Boeing News (GNews)',
    url: 'https://news.google.com/rss/search?q=Boeing+when:2d&hl=en-US&gl=US&ceid=US:en',
    group: 'aviation',
    priority: 1,
    maxItems: 15,
    enabled: true,
  },
  {
    id: 'airbus_gnews',
    name: 'Airbus News (GNews)',
    url: 'https://news.google.com/rss/search?q=Airbus+when:2d&hl=en-US&gl=US&ceid=US:en',
    group: 'aviation',
    priority: 1,
    maxItems: 15,
    enabled: true,
  },
  {
    id: 'thy_gnews',
    name: 'Türk Hava Yolları / THY (GNews)',
    url: 'https://news.google.com/rss/search?q=(%22Turkish+Airlines%22+OR+%22T%C3%BCrk+Hava+Yollar%C4%B1%22+OR+THY)+when:2d&hl=tr&gl=TR&ceid=TR:tr',
    group: 'aviation',
    priority: 1,
    maxItems: 15,
    enabled: true,
  },
  {
    id: 'techcrunch_ai',
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    group: 'ai',
    priority: 1,
    maxItems: 20,
    enabled: true,
  },
  {
    id: 'hn_ai',
    name: 'Hacker News (AI)',
    url: 'https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT+OR+Claude+OR+Gemini&points=80',
    group: 'ai',
    priority: 2,
    maxItems: 15,
    filter: {
      minPoints: 80,
      includeRegex:
        '\\b(AI|LLMs?|GPT(?:-?\\d[\\w.]*)?|Claude|Gemini|Llama|Mistral|transformers?|agents?|RAG|diffusion|inference|fine-?tun\\w*)\\b',
    },
    enabled: true,
  },
  {
    id: 'openai_blog',
    name: 'OpenAI News',
    url: 'https://news.google.com/rss/search?q=site:openai.com+when:3d&hl=en-US&gl=US&ceid=US:en',
    group: 'ai',
    priority: 1,
    maxItems: 10,
    enabled: true,
  },
  {
    id: 'google_ai_blog',
    name: 'Google AI / DeepMind',
    url: 'https://blog.google/technology/ai/rss/',
    group: 'ai',
    priority: 1,
    maxItems: 10,
    enabled: true,
  },
  {
    id: 'anthropic_news',
    name: 'Anthropic News',
    url: 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml',
    group: 'ai',
    priority: 1,
    maxItems: 10,
    enabled: true,
  },
  {
    id: 'easa_news',
    name: 'EASA Newsroom',
    url: 'https://www.easa.europa.eu/en/newsroom-and-events/news/rss.xml',
    group: 'piloting',
    priority: 2,
    maxItems: 10,
    enabled: true,
  },
  {
    id: 'faa_news',
    name: 'FAA News',
    url: 'https://www.faa.gov/newsroom/rss',
    group: 'piloting',
    priority: 3,
    maxItems: 10,
    enabled: false,
  },
];
