import sys; sys.path.insert(0,'.')
from contrast import cr, themes
T=themes('grove_v2.html')
text=[('ink','bg'),('ink2','bg'),('muted','bg'),('ink','raised'),('ink2','raised'),('accentText','bg'),('accentText','soft'),('ink2','soft'),('ink','soft'),
 ('onForest','forest'),('onForest2','forest'),('sap','forest'),('onPill','pill'),('onBtn','btn'),('clay','bg'),('tip','bg'),
 ('correct','correctBg'),('ink','correctBg'),('wrong','wrongBg'),('ink','wrongBg'),('bg','correct'),('bg','wrong'),('bg','ink'),('bg','accent'),('correct','bg'),('wrong','bg'),('tip','tipBg')]
nontext=[('control','bg'),('accent','track'),('accent','bg'),('sap','forestTrack'),('forestLine','forest'),('dom0','bg'),('dom1','bg'),('dom2','bg'),('dom3','bg'),('dom4','bg'),('ink','raised')]
bad=0
for m in ('light','dark'):
  t=T[m]
  for lst,th,lab in ((text,4.5,'TEXT'),(nontext,3.0,'NON-TEXT')):
    row=[]
    for a,b in lst:
      c=cr(t[a],t[b]);ok=c>=th
      if not ok and lab=='TEXT': bad+=1
      row.append(f"{a}/{b} {c:.2f}{'' if ok else ' <FAIL' if lab=='TEXT' else ' <3'}")
    print(m,lab,' | '.join(row))
print('text fails',bad)
