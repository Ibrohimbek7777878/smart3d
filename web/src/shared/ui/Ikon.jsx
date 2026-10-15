import React from 'react';
import {
  Camera, Rotate3d, DoorOpen, Crosshair, Sparkles, Mic, WandSparkles, Trash2, Copy, RotateCw, RotateCcw, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, X, Check, TriangleAlert, FileSpreadsheet, Printer, FolderOpen, Settings, Cloud, CloudCheck, CloudOff,
  Glasses, Search, Pencil, Globe, Eye, EyeOff, ChefHat, Bed, Plus, Minus, Square, ArrowUpRight, Menu
} from 'lucide-react';

/* TZ-19 §4 (egasi qarori): emoji o'rniga SVG ikonlar — lucide-react 1.49.0 (ISC), faqat ishlatilganlari build'ga kiradi.
 * Bitta joy: qaysi ma'no qaysi ikon — shu ro'yxatda (uslub bir xil bo'lishi uchun). Rang — matn rangi (currentColor). */
function LShakl(p) {   // L-shakl xona (lucide'da yo'q) — lucide uslubida: 24×24, chiziq 2
  const { size = 24, strokeWidth = 2, ...rest } = p;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M4 4h7v9h9v7H4z" />
    </svg>
  );
}

function Uchburchak(p) {   // ochiladigan ro'yxat belgisi (dizayndagi ▾ o'lchamida) — to'ldirilgan
  const { size = 8, strokeWidth, ...rest } = p;   // eslint-disable-line no-unused-vars
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 8 8" fill="currentColor" {...rest}>
      <path d="M.6 2.2h6.8L4 6.4z" />
    </svg>
  );
}

export const IK = {
  rasm: Camera, aylanish: Rotate3d, eshik: DoorOpen, markaz: Crosshair, ai: Sparkles, mikrofon: Mic, qurish: WandSparkles,
  ochirish: Trash2, nusxa: Copy, burish: RotateCw, qayta: RotateCcw, chap: ChevronLeft, ong: ChevronRight, past: ChevronDown, tepa: ChevronUp,
  yopish: X, tayyor: Check, ogohlantirish: TriangleAlert, excel: FileSpreadsheet, chop: Printer, papka: FolderOpen, sozlash: Settings,
  bulut: Cloud, saqlandi: CloudCheck, internetYoq: CloudOff, vr: Glasses, qidiruv: Search, tahrir: Pencil, til: Globe,
  korish: Eye, yashirish: EyeOff, oshxona: ChefHat, karavot: Bed, qosh: Plus, ayir: Minus, tortburchak: Square, lShakl: LShakl,
  havola: ArrowUpRight, menyu: Menu, ochiladi: Uchburchak
};

/** <Ikon n="rasm" /> — matn yonida (o'ngida 6px oraliq); gap={0} — yolg'iz yoki flex ichida */
export default function Ikon({ n, size = 16, gap = 6, style, ...p }) {
  const I = IK[n];
  if (!I) return null;
  return <I size={size} strokeWidth={2} aria-hidden="true" focusable="false"
    style={{ flex: '0 0 auto', verticalAlign: '-0.18em', ...(gap ? { marginRight: gap + 'px' } : null), ...style }} {...p} />;
}
