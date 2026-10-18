/* Smart3D engine/bazis/teshik.js — TZ-20: Bazis loyihasidagi furnitura/mahkamlagichdan PRISADKA TESHIKLARI SONI (faqat narx uchun).
 *
 * Bazis .b3d dagi teshik amallari (THole) o'qilmaydi, shuning uchun teshik soni furnitura obyektlaridan chiqariladi:
 * har bir yaproq furnitura (modelCode 3001) nomi bo'yicha turga ajratiladi va tur uchun koeffitsiyent qo'llanadi.
 * Koeffitsiyentlar: jismoniy qoida (petlya — 1 kosa, ruchka — 2 vint teshigi, polka ushlagich — 1 ko'r teshik, shkant — 2 uchi)
 * yoki sexning KDT fayllari bilan 23 ta buyurtmada o'lchangan MEDIANA (konfirmat, belgi) — qarang tests/verify_bazis_teshik.mjs.
 * Bular joylashuvsiz (x, y yo'q) narx yozuvlari: stanok eksportchilari (GibLab, KDT, BPJ, CNC) ularni o'tkazib yuboradi (part yo'q).
 *
 * kind kodlari — materials.json hole_kinds: drill, dowel, hinge, cam; YANGI: mark (belgi — narxsiz, "narx yo'q"). */

/** tur → { kind, dia, depth, nom } — kind narx kodi, dia/depth — odatiy (ma'lumot uchun). */
export const TESHIK_TURI = {
  konfirmat_yuza: { kind: 'drill', dia: 7, depth: 16.5, nom: "Konfirmat — yuzadan o'tuvchi teshik" },
  konfirmat_qirra: { kind: 'drill', dia: 4.5, depth: 35, nom: 'Konfirmat — qirradan (vint uchun)' },
  petlya: { kind: 'hinge', dia: 35, depth: 13, nom: 'Petlya kosasi' },
  polka: { kind: 'drill', dia: 5, depth: 9, nom: 'Polka ushlagich (ko\'r teshik)' },
  ruchka: { kind: 'drill', dia: 5, depth: 16.5, nom: "Ruchka vinti (o'tuvchi)" },
  shkant: { kind: 'dowel', dia: 8, depth: 12, nom: 'Shkant teshigi' },
  eksentrik: { kind: 'cam', dia: 15, depth: 13, nom: 'Eksentrik (minifiks) korpusi' },
  belgi: { kind: 'mark', dia: 3, depth: 2.5, nom: 'Belgi (metka) — burama nuqtasi' }
};

/** Koeffitsiyentlar (bir furnitura dona uchun teshik soni). */
export const KOEF = {
  petlya: 1,
  polka: 1,
  ruchka: 2,
  konfirmat_yuza: 0.81,     // KDT bilan 23 buyurtma medianasi (Bazis'dagi "Евро" ning bir qismi boshqa usulda ulanadi)
  konfirmat_qirra: 0.70,
  shkant: 2,                // shkantning ikki uchi — ikki detalda
  eksentrik: 1,
  belgi_metka: 1,           // "metka samarezga" — 1 belgi
  belgi_petlya: 3.2,        // petlya kosasi va plankasi vintlari belgisi (KDT bilan 23 buyurtmada eng kichik xato)
  belgi_ruchka: 1.5,
  shkant_eksentrikli: 1     // "IKSENTRIK SHKANTLI" (1005) — eksentrik shkanti, 1 ta shkant teshigi
};

/**
 * TZ-36 K1: ERP PRISADKA HISOBI (narx uchun) — jismoniy teshik sonidan farq qiladi. Dalil: 12 ta haqiqiy ERP buyurtmasi (3770, 3808,
 * 3936, 3877, 3888, 4034, 4250, 3812, 3832, 3860, 3926, 3978), Bazis fayli bilan solishtirildi:
 *  - «ПРИСАДКА ЕВРО» miqdori = Bazis «Евро 51мм Алкан» mahkamlagich soni (12/12 buyurtmada aynan); yuza va qirra teshigi bitta ЕВРО
 *    juftligi — qirra alohida sanalmaydi (cutlist.js: ЕВРО juftligi). Shuning uchun konfirmat_yuza narx soni = mahkamlagich soni (1,0).
 *  - «ПРИСАДКА МЕТКА»: ERP jismoniy belgidan kam yozadi (ERP/biz mediana 0,37; oralig'i 0…0,92) — 0,4.
 *  - ruchka: ERP 1 ta/dona, teshik 2 ta — cutlist.js narx uchun /2 qiladi (bu yerda emas).
 * Jismoniy son (qty) o'zgarmaydi: KDT stanok fayllari bilan tekshirilgan (tests/verify_bazis_teshik.mjs). */
export const ERP_HISOB = { konfirmat_yuza: 1, belgi: 0.4 };

/** Furnitura nomi → tur (yoki null). Tartib muhim. */
export function teshikTuri(nom) {
  const l = String(nom || '').toLowerCase();
  if (/metka|метка/.test(l)) return 'metka';
  if (/петл|petl/.test(l)) return 'petlya';
  if (/ручк|ruchk/.test(l)) return 'ruchka';
  if (/полкодерж|polkoder|polkader/.test(l)) return 'polka';
  if (/minifix|минификс|эксцентрик|iksentrik|стяжк/.test(l)) return 'eksentrik';
  if (/шкант|shkant/.test(l)) return 'shkant';
  if (/^евро|евровинт|yevro|^evro/.test(l)) return 'konfirmat';
  return null;
}

/**
 * Bazis obyektlari (daraxt.js yoki parseBazisB3D natijasi) → narx uchun teshik yozuvlari.
 * @param {Array} objects
 * @returns {Array<{tur:string, kind:string, qty:number, dia:number, depth:number, nom:string}>}
 */
export function bazisTeshiklar(objects) {
  const n = { metka: 0, petlya: 0, ruchka: 0, polka: 0, eksentrik: 0, shkant: 0, konfirmat: 0, shkantEks: 0 };
  for (const o of objects || []) {
    if (!o || !o.name) continue;
    const nom = String(o.name).replace(/\s+/g, ' ').trim();
    if (o.modelCode === 1005 && /iksentrik\s+shkantli/i.test(nom)) { n.shkantEks++; continue; }
    if (o.modelCode !== 3001) continue;                        // faqat yaproq furnitura (1005 — guruh, ikki marta sanalmasin)
    const t = teshikTuri(nom);
    if (t) n[t]++;
  }
  const q = {
    konfirmat_yuza: n.konfirmat * KOEF.konfirmat_yuza,
    konfirmat_qirra: n.konfirmat * KOEF.konfirmat_qirra,
    petlya: n.petlya * KOEF.petlya,
    polka: n.polka * KOEF.polka,
    ruchka: n.ruchka * KOEF.ruchka,
    shkant: n.shkant * KOEF.shkant + n.shkantEks * KOEF.shkant_eksentrikli,
    eksentrik: n.eksentrik * KOEF.eksentrik,
    belgi: n.metka * KOEF.belgi_metka + n.petlya * KOEF.belgi_petlya + n.ruchka * KOEF.belgi_ruchka
  };
  const out = [];
  for (const [tur, v] of Object.entries(q)) {
    const qty = Math.round(v);
    if (qty > 0) {
      const it = { tur, kind: TESHIK_TURI[tur].kind, qty, dia: TESHIK_TURI[tur].dia, depth: TESHIK_TURI[tur].depth, nom: TESHIK_TURI[tur].nom };
      /* narxQty — ERP prisadka hisobi (ERP_HISOB): konfirmat_yuza — mahkamlagich soni, belgi — 0,4 */
      if (ERP_HISOB[tur] != null) it.narxQty = Math.round(tur === 'konfirmat_yuza' ? n.konfirmat * ERP_HISOB[tur] : v * ERP_HISOB[tur]);
      out.push(it);
    }
  }
  return out;
}
