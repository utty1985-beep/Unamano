#!/usr/bin/env python3
"""Download Puglia official map geometry and monitor source changes, without interpreting new laws."""
import concurrent.futures
import hashlib
import json
import math
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'cacciatraccia/data'
BASE = 'https://webapps.sit.puglia.it/arcgis/rest/services/Operationals/AreeProtetteReteNatura2000/MapServer'
SOURCES = [
 ('hunting', 'Calendario venatorio Puglia', 'https://foreste.regione.puglia.it/stagione-venatoria'),
 ('atc', 'ATC della Puglia', 'https://www.regione.puglia.it/web/foreste-biodiversita/ambiti-territoriali-di-caccia-atc'),
 ('mushrooms', 'Normativa raccolta funghi Puglia', 'https://bussolanormativa.consiglio.puglia.it/public/leges/LeggeNavscroll.aspx?id=13571'),
]

class Text(HTMLParser):
 def __init__(self): super().__init__(); self.skip=0; self.parts=[]
 def handle_starttag(self, tag, attrs):
  if tag in ('script','style','noscript'): self.skip+=1
 def handle_endtag(self, tag):
  if tag in ('script','style','noscript') and self.skip: self.skip-=1
 def handle_data(self, data):
  if not self.skip: self.parts.append(data)

def fetch(url):
 request=Request(url, headers={'User-Agent':'PassioneFunghiCaccia-PugliaSourceMonitor/2.0','Accept':'application/json,text/html,*/*'})
 with urlopen(request,timeout=30) as response:
  raw=response.read(12000001)
  if len(raw)>12000000: raise ValueError('response_too_large')
  return raw

def load(path, default):
 try:return json.loads(path.read_text())
 except (OSError,ValueError):return default

def write(path, value):
 path.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n')

def collect_source(source, previous, now):
 key,title,url=source; old=next((s for s in previous.get('sources',[]) if s.get('id')==key),{})
 item={**old,'id':key,'title':title,'url':url,'lastAttemptAt':now}
 try:
  text=Text();text.feed(fetch(url).decode('utf-8','replace'))
  normalized=re.sub(r'\s+',' ',' '.join(text.parts)).strip()
  if len(normalized)<150:raise ValueError('empty_source')
  fp=hashlib.sha256(normalized.encode()).hexdigest()
  if old.get('fingerprint') and old['fingerprint']!=fp:item['changedAt']=now
  item.update(status='ok',fingerprint=fp,lastSuccessfulCheckAt=now)
  item.pop('error',None)
 except Exception as error:item.update(status='unavailable',error=type(error).__name__)
 return item

def collect_layer(layer_id, previous, now):
 title='Aree protette nazionali e regionali' if layer_id==0 else 'Rete Natura 2000 · SIC/ZPS'
 old=next((l for l in previous.get('layers',[]) if l.get('id')==layer_id),{})
 item={**old,'id':layer_id,'title':title,'source':BASE+'/'+str(layer_id),'lastAttemptAt':now}
 try:
  params=urlencode({'f':'json','where':'1=1','outFields':'*','returnGeometry':'true','outSR':'4326','geometryPrecision':6,'maxAllowableOffset':0.00002})
  result=json.loads(fetch(BASE+'/'+str(layer_id)+'/query?'+params))
  if result.get('error') or 'features' not in result:raise ValueError('query_failed')
  features=[]
  for f in result['features']:
   rings=f.get('geometry',{}).get('rings',[])
   if not rings:continue
   for ring in rings:
    if len(ring)<4 or any(len(p)<2 or not all(isinstance(v,(int,float)) and math.isfinite(v) for v in p[:2]) or abs(p[0])>180 or abs(p[1])>90 for p in ring):raise ValueError('invalid_polygon')
   a=f.get('attributes',{})
   name=next((str(a[k]) for k in ('DENOMINAZI','DENOMINAZIONE','NOME','NOME_AREA','DENOM','NAME') if a.get(k)),title)
   xs=[p[0]for r in rings for p in r];ys=[p[1]for r in rings for p in r]
   features.append({'id':str(layer_id)+':'+str(a.get('OBJECTID',len(features))),'name':name,'type':str(a.get('TIPO','')),'rings':rings,'bbox':[min(xs),min(ys),max(xs),max(ys)]})
  item.update(status='partial' if result.get('exceededTransferLimit') else 'ok',downloadedAt=now,features=features,featureCount=len(features))
  item.pop('error',None)
 except Exception as error:item.update(status='unavailable',error=type(error).__name__)
 return item

def main():
 DATA.mkdir(parents=True,exist_ok=True);now=datetime.now(timezone.utc).isoformat()
 source_path=DATA/'normativa-puglia.json';map_path=DATA/'aree-protette-puglia.json'
 old_sources=load(source_path,{});old_map=load(map_path,{})
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
  sources=list(pool.map(lambda s:collect_source(s,old_sources,now),SOURCES))
  layers=list(pool.map(lambda i:collect_layer(i,old_map,now),(0,1)))
 write(source_path,{'schemaVersion':2,'region':'Puglia','checkedAt':now,'sources':sources,'coverage':'Monitoraggio delle fonti collegate. Le novità non vengono interpretate automaticamente come divieti geolocalizzati.'})
 write(map_path,{'schemaVersion':1,'region':'Puglia','checkedAt':now,'source':BASE,'geometryToleranceMetres':30,'coverage':'Aree protette e SIC/ZPS del SIT Puglia; non comprende tutte le ordinanze temporanee o comunali.','layers':layers})
 for s in sources: print(s['id'],s['status'])
 for l in layers: print('layer',l['id'],l['status'],l.get('featureCount',0))
 return 0

if __name__=='__main__':raise SystemExit(main())
