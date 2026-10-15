import { useSlice, get, set } from '../../../store/index.js';
import { project } from '../../../store/project.js';
import { useViewer } from '../../../shared/design3d/useViewer.js';
import { s3Viewer, s3Mats, s3Build, s3Apply } from '../../../shared/design3d/engine.js';
import { ichkiSpec } from '../../../services/ichki.js';

/* TZ-19: "Ichini ko'rish" (Q6) — dizayn ko'rinishi; panellar — assembler.js, son — kesim ro'yxati. Faqat MebelCity modullari. */
function specOf(id) {
  const p = project.pl(id), frag = p && project.H && project.H.catalog[p.frg];
  if (!frag) return null;
  const cl = project.res && project.res.cutlists.find(c => c.placementId === id);
  return ichkiSpec(frag, p.w, p.d, p.h, cl);
}

/* ochilganda: avval yig'ilgan, 0.6 s dan keyin o'zi sochiladi (dizayn); keyin — "Sochish" surgichi bilan */
function insViewer(spec) {
  return (T, h, o) => {
    const v = s3Viewer(T, h, o); v.columns = true; v.colTop = 80; v.colBot = 90;
    v.pC = new T.Plane(new T.Vector3(0, -1, 0), 0); v.pP = new T.Plane(new T.Vector3(0, 1, 0), 0); v.M = s3Mats(T, [v.pC], [v.pP]);
    const b = s3Build(T, v, spec, false); v.dist *= 1.3;
    const a = { color: 1, explode: 0, hw: 0, count: 1 }, t0 = performance.now();
    v.onTick = (dt) => {
      const st = get().ins, age = (performance.now() - t0) / 1000;
      let ex = st.ex / 100; if (st.auto) ex = Math.min(1, Math.max(0, (age - .6) / 1.4));
      const k = 1 - Math.exp(-dt * 5);
      a.explode += (ex - a.explode) * k; a.color += (st.color - a.color) * k; a.hw += ((age > 1.4 ? 1 : 0) - a.hw) * k; s3Apply(v, b, a);
      if (st.auto && age > 2.2) set('ins', { auto: false, ex: 100 });
    };
    return v;
  };
}

export function useIchiniKorish() {
  const ins = useSlice('ins');
  useSlice('project');
  const spec = ins.id ? specOf(ins.id) : null, p = project.pl(ins.id);
  const [insHost, insOv] = useViewer(!!spec, spec ? insViewer(spec) : null, [ins.id]);
  return {
    insOpen: !!spec, insHost, insOv,
    closeInside: () => set('ins', { id: null }),
    ins: spec && p ? { name: p.name || (project.fr(p) || {}).name, code: p.frg, size: p.w + '×' + p.d + '×' + p.h + ' mm', hasNote: false, note: '',
      detal: spec.stats.detal, zap: spec.stats.zap, list: spec.list, hw: spec.hwList, ex: ins.ex,
      cB: ins.color ? 'var(--acc)' : 'transparent', cT: ins.color ? 'var(--ink)' : 'var(--mut)', pB: ins.color ? 'transparent' : 'var(--sfc)', pT: ins.color ? 'var(--mut)' : 'var(--txt)' } : { list: [], hw: [] },
    onInsEx: ev => set('ins', { auto: false, ex: +ev.target.value }),
    insColor: () => set('ins', { color: 1 }), insPlain: () => set('ins', { color: 0 })
  };
}
