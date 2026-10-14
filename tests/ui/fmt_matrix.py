import sys,json
t=sys.stdin.read(); s=t[t.find('{'):t.rfind('}')+1]
try: d=json.loads(s)
except Exception: print(t[:3000]); raise SystemExit
for k,v in d.items():
    print(f"{k:15} dpr={v['dpr']} vp={v['vw']}x{v['vh']} hScroll={v['hScroll']!s:5} fits={v['canvasFits']!s:5} css={v['canvasCss']:9} box={v['sceneBox']:9} buf={v['bufOk']!s:5} tabs={v['tabsOk']!s:5} ctl={v['ctlOk']!s:5} small={v['smallTargets']:2} errs={len(v['errs'])}")
    if v['errs']: print('   ERR', v['errs'][:300])
