#!/usr/bin/env python3
import json, hashlib, re, ssl, sys
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"cacciatraccia/data/normativa-italia.json"
UA="PassioneFunghiCaccia-RegulationMonitor/1.0 (+GitHub Actions)"

def norm_bytes(raw, headers):
    etag=headers.get("ETag","").strip()
    lm=headers.get("Last-Modified","").strip()
    ctype=headers.get("Content-Type","").lower()
    if etag:
        seed=("etag:"+etag).encode()
    elif lm:
        seed=("last-modified:"+lm).encode()
    else:
        data=raw[:900000]
        if "text" in ctype or "html" in ctype or not ctype:
            try:
                txt=data.decode("utf-8","ignore")
                txt=re.sub(r"\s+"," ",txt)
                txt=re.sub(r"(?i)(timestamp|nonce|csrf)[^ <]{0,80}","",txt)
                data=txt.encode("utf-8")
            except Exception:
                pass
        seed=data
    return hashlib.sha256(seed).hexdigest()

def fetch_fp(url):
    req=Request(url,headers={"User-Agent":UA,"Accept":"text/html,application/pdf,application/json,*/*"})
    with urlopen(req,timeout=28,context=ssl.create_default_context()) as r:
        raw=r.read(1000000)
        return norm_bytes(raw,r.headers),getattr(r,"status",200)

def main():
    doc=json.loads(DATA.read_text(encoding="utf-8"))
    changed=False
    notes=[]
    for section in ("mushrooms","hunting"):
        for name,item in doc.get(section,{}).items():
            url=item.get("src")
            if not url: continue
            try:
                fp,status=fetch_fp(url)
                old=item.get("sourceFingerprint")
                if not old:
                    item["sourceFingerprint"]=fp
                    item["checkStatus"]="ok"
                    changed=True
                    notes.append(f"baseline {section}/{name}")
                elif old!=fp:
                    if item.get("detectedFingerprint")!=fp or not item.get("sourceChanged"):
                        item["detectedFingerprint"]=fp
                        item["sourceChanged"]=True
                        item["checkStatus"]="changed"
                        changed=True
                        notes.append(f"CHANGED {section}/{name}")
                elif item.get("checkStatus") not in ("ok","changed"):
                    item["checkStatus"]="ok"
                    changed=True
            except Exception as e:
                msg=type(e).__name__
                if item.get("checkStatus")!="unavailable" or item.get("lastCheckError")!=msg:
                    item["checkStatus"]="unavailable"
                    item["lastCheckError"]=msg
                    changed=True
                    notes.append(f"unavailable {section}/{name}: {msg}")
    if changed:
        DATA.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("\n".join(notes) if notes else "No source-state changes")
    return 0

if __name__=="__main__":
    sys.exit(main())
