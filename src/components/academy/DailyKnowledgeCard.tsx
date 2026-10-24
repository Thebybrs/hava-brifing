// src/components/academy/DailyKnowledgeCard.tsx — EFB Pilot Akademi Günün Havacılık Bilgisi Kartı

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  Lightbulb,
  Plane,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { DataField } from '@/components/ui/DataField';
import { Panel } from '@/components/ui/Panel';
import {
  getKnowledgeCardByIndex,
  getTodayKnowledgeCardIndex,
  getTotalKnowledgeCardsCount,
} from '@/lib/cadet';

export function DailyKnowledgeCard() {
  const todayIdx = getTodayKnowledgeCardIndex();
  const [currentIndex, setCurrentIndex] = useState<number>(todayIdx);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);

  const total = getTotalKnowledgeCardsCount();
  const card = getKnowledgeCardByIndex(currentIndex);
  const isToday = currentIndex === todayIdx;

  const handlePrev = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = () => {
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const handleResetToday = () => {
    setShowAnswer(false);
    setCurrentIndex(todayIdx);
  };

  return (
    <Panel accent={card.badgeColor} className="p-4 space-y-3">
      {/* Üst Bar: Günün Bilgisi Başlığı + Kart Gezinti Kontrolleri */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-efb-cyan shrink-0" aria-hidden="true" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-efb-white">
            Pilot Akademi // Günün Havacılık Bilgisi
          </span>
          {isToday && (
            <span className="px-1.5 py-0.2 rounded bg-efb-cyan/20 border border-efb-cyan/40 text-[9px] font-mono font-bold text-efb-cyan uppercase">
              Bugün
            </span>
          )}
        </div>

        {/* Gezinme Kontrolleri (<, >, Bugün, Sayaç) */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-efb-muted text-[11px]">
            {currentIndex + 1} / {total}
          </span>
          <div className="flex items-center rounded border border-efb-line bg-efb-bg/80 p-0.5">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Önceki Bilgi"
              className="p-1 rounded text-efb-muted hover:text-efb-white hover:bg-efb-panel transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={handleResetToday}
                title="Bugünün Kartına Dön"
                className="px-1.5 py-0.5 text-[10px] text-efb-cyan hover:underline font-bold"
              >
                <RotateCcw className="w-3 h-3 inline mr-0.5" aria-hidden="true" />
                Bugün
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              aria-label="Sonraki Bilgi"
              className="p-1 rounded text-efb-muted hover:text-efb-white hover:bg-efb-panel transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Kart Rozeti + Başlık */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold uppercase tracking-wider ${
              card.badgeColor === 'cyan'
                ? 'bg-efb-cyan/15 text-efb-cyan border-efb-cyan/40'
                : card.badgeColor === 'amber'
                  ? 'bg-efb-amber/15 text-efb-amber border-efb-amber/40'
                  : card.badgeColor === 'green'
                    ? 'bg-efb-green/15 text-efb-green border-efb-green/40'
                    : 'bg-efb-magenta/15 text-efb-magenta border-efb-magenta/40'
            }`}
          >
            {card.badgeText}
          </span>
          <span className="text-xs font-mono text-efb-muted">{card.subtitle}</span>
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-efb-white leading-snug">
          {card.title}
        </h3>
      </div>

      {/* ================= 1. TÜR: UÇAK TANIMA KARTI (AIRCRAFT SPEC) ================= */}
      {card.aircraftSpec && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <DataField label="MOTOR MODELİ" value={card.aircraftSpec.engineModel} tone="cyan" />
            <DataField label="KOLTUK DÜZENİ" value={card.aircraftSpec.seatingCapacity} />
            <DataField label="MAKS KALKIŞ (MTOW)" value={card.aircraftSpec.maxTakeoffWeightKg} tone="amber" />
            <DataField
              label="MENZİL / HIZ"
              value={`${card.aircraftSpec.maxRangeNm} · ${card.aircraftSpec.typicalCruiseSpeed}`}
              tone="green"
            />
          </div>

          <div className="bg-efb-bg/60 border border-efb-line rounded p-2.5 space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-efb-muted flex items-center gap-1.5">
              <Plane className="w-3 h-3 text-efb-cyan" aria-hidden="true" />
              <span>THY FİLOSUNDAKİ GÖREVİ</span>
            </div>
            <p className="text-xs text-efb-text leading-relaxed">{card.aircraftSpec.thyFleetRole}</p>
          </div>

          <div className="bg-efb-cyan/10 border border-efb-cyan/30 rounded p-2.5 space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-efb-cyan font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-efb-cyan" aria-hidden="true" />
              <span>MÜLAKAT TÜYOSU & TEKNİK ÖZELLİK</span>
            </div>
            <p className="text-xs text-efb-white leading-relaxed">{card.aircraftSpec.interviewTip}</p>
          </div>
        </div>
      )}

      {/* ================= 2. TÜR: MÜLAKAT TERİM KARTI (AVIATION TERM) ================= */}
      {card.aviationTerm && (
        <div className="space-y-2.5">
          <div className="bg-efb-bg/70 border border-efb-line rounded p-2.5 space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-efb-muted flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 text-efb-green" aria-hidden="true" />
              <span>TANIM</span>
            </div>
            <p className="text-xs text-efb-text leading-relaxed">{card.aviationTerm.shortDefinition}</p>
          </div>

          <div className="bg-efb-green/10 border border-efb-green/35 rounded p-2.5 space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-efb-green font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>KAPTAN PİLOTA VERİLECEK MÜLAKAT CEVABI</span>
            </div>
            <p className="text-xs text-efb-white leading-relaxed font-medium">
              &quot;{card.aviationTerm.interviewAnswer}&quot;
            </p>
          </div>

          <div className="px-2.5 py-1.5 rounded bg-efb-amber/10 border border-efb-amber/30 text-xs flex items-start gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-efb-amber mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-[11px] text-efb-muted leading-relaxed">
              <strong className="text-efb-amber font-semibold">Sık Yapılan Hata: </strong>
              {card.aviationTerm.commonMistake}
            </p>
          </div>
        </div>
      )}

      {/* ================= 3. TÜR: TEKNİK MÜLAKAT SORUSU (TECHNICAL QA) ================= */}
      {card.technicalQa && (
        <div className="space-y-3">
          <div className="bg-efb-magenta/5 border border-efb-magenta/30 rounded p-3 space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-efb-magenta font-bold flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
              <span>MÜLAKAT TEKNİK SORUSU ({card.technicalQa.category})</span>
            </div>
            <p className="text-sm font-medium text-efb-white leading-relaxed">
              {card.technicalQa.question}
            </p>
            <div className="text-[11px] text-efb-muted font-mono italic">
              İpucu: {card.technicalQa.hint}
            </div>
          </div>

          {/* Cevabı Gör / Gizle Butonu */}
          <div>
            <button
              type="button"
              onClick={() => setShowAnswer((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-efb-panel2 hover:bg-efb-line border border-efb-line font-mono text-xs text-efb-cyan font-semibold transition-colors"
            >
              {showAnswer ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Cevabı Gizle</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Cevabı Gör</span>
                </>
              )}
            </button>

            {showAnswer && (
              <div className="mt-2.5 p-3 rounded bg-efb-bg/80 border border-efb-magenta/40 text-xs text-efb-text leading-relaxed space-y-1.5 animate-fade-in">
                <div className="font-mono text-[10px] uppercase tracking-wider text-efb-magenta font-bold">
                  🎯 PROFESYONEL TEKNİK AÇIKLAMA
                </div>
                <p className="text-xs text-efb-white leading-relaxed">{card.technicalQa.detailedAnswer}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
