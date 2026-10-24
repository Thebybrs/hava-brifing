// src/data/cadet-knowledge.ts — THY Pilot Adaylığı & DLR/Kurul Mülakatı Eğitim Bilgi Bankası

export type KnowledgeType = 'aircraft_spec' | 'aviation_term' | 'technical_qa';

export interface AircraftSpecDetails {
  aircraftModel: string;
  manufacturer: 'Airbus' | 'Boeing';
  engineModel: string;
  engineThrust: string;
  seatingCapacity: string;
  maxTakeoffWeightKg: string;
  typicalCruiseSpeed: string;
  maxRangeNm: string;
  wingspanMeters: string;
  thyFleetRole: string;
  interviewTip: string;
}

export interface AviationTermDetails {
  term: string;
  shortDefinition: string;
  interviewAnswer: string; // Kaptan pilota söylenecek 2-3 cümlelik hap cevap
  commonMistake: string;
}

export interface TechnicalQaDetails {
  question: string;
  hint: string;
  detailedAnswer: string;
  category: 'Aerodinamik' | 'Uçak Sistemleri' | 'Meteoroloji' | 'Uçuş Prensipleri';
}

export interface CadetKnowledgeCard {
  id: string;
  type: KnowledgeType;
  title: string;
  subtitle: string;
  badgeText: string;
  badgeColor: 'cyan' | 'magenta' | 'amber' | 'green';
  aircraftSpec?: AircraftSpecDetails;
  aviationTerm?: AviationTermDetails;
  technicalQa?: TechnicalQaDetails;
}

export const CADET_KNOWLEDGE_CARDS: CadetKnowledgeCard[] = [
  // =================== 1. THY FİLO UÇAKLARI ===================
  {
    id: 'spec_a350_900',
    type: 'aircraft_spec',
    title: 'Airbus A350-900',
    subtitle: 'THY Geniş Gövde Uzun Menzil Amiral Gemisi',
    badgeText: 'THY FİLO // AIRBUS',
    badgeColor: 'cyan',
    aircraftSpec: {
      aircraftModel: 'Airbus A350-900 XWB',
      manufacturer: 'Airbus',
      engineModel: 'Rolls-Royce Trent XWB-84 (Çift Kademeli Yüksek Bypass Turbofan)',
      engineThrust: '84.200 lbf (375 kN) motor başına',
      seatingCapacity: '329 Koltuk (32 Business / 297 Economy)',
      maxTakeoffWeightKg: '280.000 kg (280 ton MTOW)',
      typicalCruiseSpeed: 'Mach 0.85 (~903 km/s)',
      maxRangeNm: '8.100 nm (15.000 km)',
      wingspanMeters: '64,75 metre',
      thyFleetRole: 'İstanbul çıkışlı New York, Los Angeles, Tokyo, Singapur ve Melbourne gibi ultra uzun menzilli kıtalararası hatlarda kullanılır.',
      interviewTip: 'Gövdesinin %53’ü karbon fiber takviyeli polimer (CFRP) kompozittir; bu sayede kabin irtifası 6.000 ft seviyesinde tutularak yolcu yorgunluğu azaltılır.',
    },
  },
  {
    id: 'spec_b787_9',
    type: 'aircraft_spec',
    title: 'Boeing 787-9 Dreamliner',
    subtitle: 'THY Yüksek Verimli Uzun Menzil Filosu',
    badgeText: 'THY FİLO // BOEING',
    badgeColor: 'amber',
    aircraftSpec: {
      aircraftModel: 'Boeing 787-9 Dreamliner',
      manufacturer: 'Boeing',
      engineModel: 'General Electric GEnx-1B (Chevrons arka nozul susturuculu)',
      engineThrust: '76.100 lbf (338 kN) motor başına',
      seatingCapacity: '300 Koltuk (30 Business / 270 Economy)',
      maxTakeoffWeightKg: '254.000 kg (254 ton MTOW)',
      typicalCruiseSpeed: 'Mach 0.85',
      maxRangeNm: '7.565 nm (14.010 km)',
      wingspanMeters: '60,17 metre',
      thyFleetRole: 'Kuzey Amerika, Uzak Doğu ve Afrika hatlarında nokta-nokta yüksek verimli uzun menzil uçuşlarda kullanılır.',
      interviewTip: 'Geleneksel pnömatik motor hava beslemesi (bleed air) yerine tamamen elektrikli mimari kullanır; klima ve buz önleme elektrik jeneratörleriyle beslenir.',
    },
  },
  {
    id: 'spec_a321neo',
    type: 'aircraft_spec',
    title: 'Airbus A321neo ACF',
    subtitle: 'THY Dar Gövde Omurgası (Cabin Flex)',
    badgeText: 'THY FİLO // AIRBUS',
    badgeColor: 'cyan',
    aircraftSpec: {
      aircraftModel: 'Airbus A321-271NX (Airbus Cabin Flex)',
      manufacturer: 'Airbus',
      engineModel: 'Pratt & Whitney PW1133G-JM (Geared Turbofan) veya CFM LEAP-1A',
      engineThrust: '33.000 lbf (147 kN)',
      seatingCapacity: '182 - 190 Koltuk (Business + Economy düzeni)',
      maxTakeoffWeightKg: '97.000 kg (97 ton MTOW)',
      typicalCruiseSpeed: 'Mach 0.78',
      maxRangeNm: '4.000 nm (7.400 km)',
      wingspanMeters: '35,80 metre (Sharklet kanat uçları ile)',
      thyFleetRole: 'Avrupa, Orta Doğu, Orta Asya ve yoğun iç hat seferlerinin ana omurgasını oluşturur.',
      interviewTip: 'ACF (Airbus Cabin Flex) gövde konfigürasyonunda kanat önündeki R2/L2 kapıları kaldırılarak acil çıkışlar kanat üstüne taşınmış ve koltuk kapasitesi optimize edilmiştir.',
    },
  },
  {
    id: 'spec_b737_max8',
    type: 'aircraft_spec',
    title: 'Boeing 737 MAX 8',
    subtitle: 'Yeni Nesil Çift Motorlu Dar Gövde Filosu',
    badgeText: 'THY FİLO // BOEING',
    badgeColor: 'amber',
    aircraftSpec: {
      aircraftModel: 'Boeing 737-8 MAX',
      manufacturer: 'Boeing',
      engineModel: 'CFM International LEAP-1B',
      engineThrust: '29.300 lbf (130 kN)',
      seatingCapacity: '151 Koltuk (16 Business / 135 Economy)',
      maxTakeoffWeightKg: '82.190 kg (82,2 ton MTOW)',
      typicalCruiseSpeed: 'Mach 0.79',
      maxRangeNm: '3.550 nm (6.570 km)',
      wingspanMeters: '35,92 metre (İleri teknoloji çift kıvrımlı Split Scimitar kanatçık)',
      thyFleetRole: 'Kısa ve orta menzilli iç ve dış hatlarda yüksek yakıt tasarrufu sağlar.',
      interviewTip: 'Gelişmiş CFM LEAP-1B motorları daha büyük fan çapına sahiptir; bu nedenle motor pylonları kanadın biraz daha yukarısına ve önüne monte edilmiştir.',
    },
  },
  {
    id: 'spec_b777_300er',
    type: 'aircraft_spec',
    title: 'Boeing 777-300ER',
    subtitle: 'Dünyanın En Güçlü Çift Motorlu Ticari Uçağı',
    badgeText: 'THY FİLO // BOEING',
    badgeColor: 'amber',
    aircraftSpec: {
      aircraftModel: 'Boeing 777-300ER',
      manufacturer: 'Boeing',
      engineModel: 'General Electric GE90-115B (Havacılık tarihinin en büyük fan çaplı motorlarından)',
      engineThrust: '115.300 lbf (513 kN) — Tek motor itiş gücü rekoru',
      seatingCapacity: '349 - 400 Koltuk (Geniş kabin)',
      maxTakeoffWeightKg: '351.534 kg (351,5 ton MTOW)',
      typicalCruiseSpeed: 'Mach 0.84',
      maxRangeNm: '7.370 nm (13.650 km)',
      wingspanMeters: '64,80 metre (Raked wingtips - eğimli kanat uçları)',
      thyFleetRole: 'Yüksek kapasiteli transatlantik ve Asya seferlerinde hem yoğun yolcu hem de yüksek kargo geliri sağlar.',
      interviewTip: 'GE90 motorunun fan çapı (3,25 metre), bir Boeing 737 gövde genişliğiyle neredeyse aynıdır.',
    },
  },

  // =================== 2. MÜLAKAT TERİMLERİ (TERMS) ===================
  {
    id: 'term_qnh_qfe_qne',
    type: 'aviation_term',
    title: 'QNH vs QFE vs QNE',
    subtitle: 'Altimetre Basınç Referansları',
    badgeText: 'MÜLAKAT TERİMİ // ALTIMETRI',
    badgeColor: 'green',
    aviationTerm: {
      term: 'QNH / QFE / QNE',
      shortDefinition: 'Havacılıkta irtifa ölçümünde altimetre subscale penceresine bağlanan üç temel atmosferik basınç referansıdır.',
      interviewAnswer: 'QNH, deniz seviyesine indirgenmiş yerel basınçtır ve bağlandığında altimetre pist rakımını (Elevation) gösterir. QFE, meydan seviyesindeki basınçtır ve bağlandığında pistte altimetre 0 ft gösterir. QNE ise standart basınç olan 1013.25 hPa (29.92 inHg) değeridir; Geçiş İrtifası (Transition Altitude) üzerinde uçuş seviyelerini (Flight Level) standartlaştırmak için bağlanır.',
      commonMistake: 'Geçiş irtifasının üzerinde yerel QNH’te kalmak veya iniş hattında standart 1013 değerini yerel QNH ile değiştirmeyi unutmak.',
    },
  },
  {
    id: 'term_v_speeds',
    type: 'aviation_term',
    title: 'V1 - VR - V2 - VREF Hızları',
    subtitle: 'Kalkış ve İniş Kritik Hız Tanımları',
    badgeText: 'MÜLAKAT TERİMİ // PERFORMANS',
    badgeColor: 'green',
    aviationTerm: {
      term: 'V1, VR, V2 ve VREF Hızları',
      shortDefinition: 'Uçağın kalkış ve iniş emniyetini garanti altına alan sertifikalı hız eşikleridir.',
      interviewAnswer: 'V1 (Kalkış Karar Hızı): Bu hızdan önce kritik bir arıza olursa kalkış pist içinde güvenle iptal edilir (RTO); V1 sonrasında motor dursa dahi kalkışa devam edilmek zorundadır. VR (Rotasyon Hızı): Lövyenin çekilerek uçağın burnunun kaldırıldığı hızdır. V2 (Kalkış Tırmanış Emniyet Hızı): Tek motor arızasında dahi pist sonundaki engelleri aşmak için 35 ft irtifada ulaşılması gereken tırmanma hızıdır. VREF: İniş ağırlığına göre flap konfigürasyonundaki referans yaklaşma hızıdır (genellikle 1.23 x VSO).',
      commonMistake: 'V1 hızından sonra herhangi bir uyarı veya motor kaybında panikleyip frene basarak pist dışına çıkmak (runway excursion).',
    },
  },
  {
    id: 'term_tcas_ra',
    type: 'aviation_term',
    title: 'TCAS RA (Resolution Advisory)',
    subtitle: 'Havadaki Çarpışma Önleme Sistemi Çözüm Emri',
    badgeText: 'MÜLAKAT TERİMİ // SİSTEMLER',
    badgeColor: 'green',
    aviationTerm: {
      term: 'TCAS II Resolution Advisory (RA)',
      shortDefinition: 'İki uçağın çarpışma rotasına girmesi durumunda kokpite dikey kaçınma manevrası emreden sistemdir.',
      interviewAnswer: 'Kokpitte bir TCAS RA emri (ör. "Climb, Climb" veya "Descend, Descend") alındığında, pilotlar ATC (Hava Trafik Kontrol) talimatlarını DERHAL bir kenara bırakarak saniyeler içinde TCAS dikey hız emrini uygulamak ZORUNDADIR. Çünkü TCAS diğer uçağın TCAS sistemiyle transponder üzerinden koordineli çalışarak zıt manevra verir (biri tırmanırken diğeri alçalır). Manevra başlar başlamaz ATC’ye "TCAS RA" çağrısı yapılır.',
      commonMistake: 'Überlingen kazasında olduğu gibi TCAS tırman derken kontrolörün alçal talimatına uyarak kontrolöre öncelik vermek.',
    },
  },
  {
    id: 'term_transponder_codes',
    type: 'aviation_term',
    title: 'Acil Durum Transponder Kodları',
    subtitle: 'Squawk 7500 - 7600 - 7700',
    badgeText: 'MÜLAKAT TERİMİ // ATC',
    badgeColor: 'green',
    aviationTerm: {
      term: 'Acil Durum Squawk Kodları (7500, 7600, 7700)',
      shortDefinition: 'Telsiz konuşması yapamadan veya uluslararası acil durum bildirmek için radar ekranına gönderilen 4 haneli kodlardır.',
      interviewAnswer: '7500: Kanun Dışı Müdahale / Uçak Kaçırma (Hijacking). 7600: Telsiz / Haberleşme Kaybı (Radio Failure / NORDO). 7700: Genel Acil Durum (General Emergency / Mayday). Akılda tutma yöntemi: 75 taken alive, 76 technical glitch, 77 going to heaven.',
      commonMistake: 'Telsiz arızasında (7600) panik yapıp rastgele rota değiştirmek; standart prosedür son onaylanan uçuş planı ve irtifaya sadık kalmaktır.',
    },
  },
  {
    id: 'term_etops',
    type: 'aviation_term',
    title: 'ETOPS (Extended-range Twin-engine Ops)',
    subtitle: 'Çift Motorlu Uçaklarla Uzun Menzil Uçuş Kuralı',
    badgeText: 'MÜLAKAT TERİMİ // REGÜLASYON',
    badgeColor: 'green',
    aviationTerm: {
      term: 'ETOPS / EDTO',
      shortDefinition: 'Çift motorlu yolcu uçaklarının acil durumda tek motorla inebileceği yedek meydana olan uçuş süresi kısıtlamasıdır.',
      interviewAnswer: 'Normalde çift motorlu bir uçak en yakın meydana en fazla 60 dakika mesafede uçabilir. ETOPS sertifikası (ör. ETOPS 180 veya A350 için 370 dakika), uçağın tek motoru dursa dahi yedek meydana belirlenen süre kadar güvenle uçabileceğini motor güvenilirliği, yangın söndürme tüpleri ve yedekli hidrolik/elektrik sistemleriyle kanıtlayan operasyonel izindir.',
      commonMistake: 'ETOPS’un sadece okyanus aşırı uçuşlar için olduğunu sanmak; çöller ve kutup rotaları gibi yedek meydanı az olan kara parçalarında da ETOPS geçerlidir.',
    },
  },
  {
    id: 'term_stabilized_approach',
    type: 'aviation_term',
    title: 'Stabilize Yaklaşma Kriterleri',
    subtitle: '1000 ft AAL Kapısı ve Pas Geçme Zorunluluğu',
    badgeText: 'MÜLAKAT TERİMİ // SOP & CRM',
    badgeColor: 'green',
    aviationTerm: {
      term: 'Stabilized Approach Gate (IMC/VMC)',
      shortDefinition: 'Uçağın inişe son yaklaşmada güvenli hız, süzülüş hattı, konfigürasyon ve motor gücünde olmasını zorunlu kılan emniyet kuralıdır.',
      interviewAnswer: 'IMC (Aletli hava) koşullarında 1.000 ft AAL, VMC (Açık hava) koşullarında en geç 500 ft AAL irtifada uçak doğru iniş rotasında (Localizer), doğru süzülüş hattında (Glide Path), iniş konfigürasyonunda (İniş takımları aşağıda, iniş flapları açık), hedef hızda (VREF to VREF+15 kt) ve motorlar rölanti üzerinde stabilize itkide olmalıdır. Bu kapıda tek bir kriter bile karşılanmıyorsa tereddütsüz PAS GEÇİLİR (Go-Around).',
      commonMistake: 'Mülakatta "biraz hızlıydım ama pist uzundu, toparlayıp indirdim" demek doğrudan elenme sebebidir; doğru cevap her zaman "stabil değilse go-around"dur.',
    },
  },

  // =================== 3. TEKNİK MÜLAKAT SORULARI ===================
  {
    id: 'qa_swept_wing',
    type: 'technical_qa',
    title: 'Neden Ok Açılı (Swept-back) Kanat Kullanılır?',
    subtitle: 'Yüksek Hızlı Uçuş Aerodinamiği',
    badgeText: 'MÜLAKAT SORUSU // AERODİNAMİK',
    badgeColor: 'magenta',
    technicalQa: {
      category: 'Aerodinamik',
      question: 'Yolcu uçaklarında (A320, B737 vb.) kanatlar neden gövdeye dik değil de geriye doğru ok açılı (swept-back) tasarlanır?',
      hint: 'Kritik Mach sayısı (Mcrit) ve kanat profiline çarpan hava akışının vektörel bileşenlerini düşünün.',
      detailedAnswer: 'Ok açılı kanat, kanada çarpan hava akışını iki vektöre ayırır: Kanat korduna dik (hızı düşüren) bileşen ve kanat boyunca açıklık yönündeki (spanwise) bileşen. Yalnızca dik bileşen basınç dağılımı ve şok dalgası oluşturduğu için, kanat profili uçağın gerçek hızından daha yavaş bir akış hissedermiş gibi davranır. Bu sayede Kritik Mach sayısı (Mcrit) yükseltilir, ses hızına yakın yüksek seyir hızlarında (Mach 0.78 - 0.85) dalga direnci (wave drag) geciktirilerek ciddi yakıt tasarrufu sağlanır.',
    },
  },
  {
    id: 'qa_tas_vs_ias',
    type: 'technical_qa',
    title: 'Yüksek İrtifada Neden TAS, IAS’tan Büyüktür?',
    subtitle: 'Hava Yoğunluğu ve Hız Göstergeleri',
    badgeText: 'MÜLAKAT SORUSU // PİLOTAJ',
    badgeColor: 'magenta',
    technicalQa: {
      category: 'Uçuş Prensipleri',
      question: '35.000 ft (FL350) irtifada gösterge hızınız (IAS) 250 knot iken gerçek hava hızınız (TAS) neden yaklaşık 450 knot civarındadır?',
      hint: 'Pitot tüpünün ölçtüğü dinamik basınç formülü: q = 1/2 * rho * V^2.',
      detailedAnswer: 'Gösterge sürati (IAS), pitot tüpünün içine giren havanın dinamik basıncını (1/2 * ρ * V²) ölçer. İrtifa arttıkça havanın yoğunluğu (ρ - rho) hızla düşer. Yüksek irtifada pitot tüpünün aynı dinamik basıncı algılayabilmesi için uçağın havanın içinden fiziksel olarak çok daha hızlı (yüksek Gerçek Hava Hızı - TAS) geçmesi gerekir. Yaklaşık bir pratik kural olarak; her 1.000 ft irtifa artışında TAS, IAS değerinin yaklaşık %2 üzerine çıkar.',
    },
  },
  {
    id: 'qa_mach_tuck',
    type: 'technical_qa',
    title: 'Mach Tuck Olayı Nedir ve Nasıl Önlenir?',
    subtitle: 'Transonik Uçuş Dinamiği',
    badgeText: 'MÜLAKAT SORUSU // AERODİNAMİK',
    badgeColor: 'magenta',
    technicalQa: {
      category: 'Uçuş Prensipleri',
      question: 'Uçak transonik hızlara (Kritik Mach üstü) ulaştığında uçağın burnunun istemsizce aşağıya dalma eğilimine girmesine ne ad verilir ve modern uçaklarda bu durum nasıl telafi edilir?',
      hint: 'Şok dalgasının kanat üzerindeki hareketi ve basınç merkezinin (CP) geriye kayması.',
      detailedAnswer: 'Bu olaya "Mach Tuck" denir. Uçak transonik hıza ulaştığında kanat üst yüzeyinde süpersonik akış ve şok dalgası oluşur. Hız arttıkça bu şok dalgası ve Basınç Merkezi (Center of Pressure) kanat üzerinde geriye doğru kayar. Basınç merkezinin geriye kayması uçağı burun aşağı (pitch down) momentine sokar; ayrıca kanat arkasındaki aşağı yönlü hava akımı (downwash) azaldığı için yatay stabilize daha az bastırma kuvveti üretir. Modern jetlerde bu durum otomatik Mach Trim sistemiyle (hız arttıkça yatay stabilizeyi burun yukarı ayarlayarak) pilot müdahalesine gerek kalmadan önlenir.',
    },
  },
  {
    id: 'qa_reverse_thrust',
    type: 'technical_qa',
    title: 'Ters İtme (Reverse Thrust) Neden İnişte Hemen Açılmalıdır?',
    subtitle: 'İniş Mesafesi ve Fren Emniyeti',
    badgeText: 'MÜLAKAT SORUSU // SİSTEMLER',
    badgeColor: 'magenta',
    technicalQa: {
      category: 'Uçak Sistemleri',
      question: 'Teker koyuşun (Touchdown) hemen ardından ters itme (Thrust Reverser) neden hiç gecikmeden maksimuma açılır, hız düştükçe neden rölantiye (Idle) alınır?',
      hint: 'Kinetik enerji formülü: E = 1/2 * m * V^2.',
      detailedAnswer: 'Uçağın sahip olduğu kinetik enerji hızın karesiyle (V²) orantılıdır. Yüksek hızlarda aerodinamik frenleme ve ters itmenin durdurma etkinliği, tekerlek frenlerinden kat kat fazladır. Yüksek hızda ters itme tekerlek frenlerini ve lastikleri aşırı ısınmadan korur. Uçak yaklaşık 60-70 knot seviyesine yavaşladığında ise ters itme rölantiye alınır; çünkü düşük hızda motorun kendi egzoz gazını veya yerdeki yabancı maddeleri (FOD) tekrar hava alığına emme (ingestion) riski doğar.',
    },
  },
];
