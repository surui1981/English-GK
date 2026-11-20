"""PDF 页面栅格化 + 链接抽取，用于人工视觉抽检。

用法：
  python3 tools/pdf_preview.py in.pdf out_dir [页码,页码...]   # 页码从 1 开始
  python3 tools/pdf_preview.py in.pdf out_dir --links           # 只打印链接信息
"""
import os
import sys

import pypdfium2 as pdfium


def main():
    src = sys.argv[1]
    outdir = sys.argv[2]
    args = sys.argv[3:]
    os.makedirs(outdir, exist_ok=True)
    pdf = pdfium.PdfDocument(src)
    n = len(pdf)
    if "--links" in args:
        from pypdf import PdfReader
        r = PdfReader(src)
        print(f"页数 {len(r.pages)}")
        for i, p in enumerate(r.pages, start=1):
            names = []
            for a in (p.get("/Annots") or []):
                try:
                    o = a.get_object()
                    if o.get("/Subtype") == "/Link":
                        dest = o.get("/Dest")
                        act = o.get("/A")
                        names.append(str(dest or (act.get("/D") if act else "?")))
                except Exception:
                    pass
            if names:
                print(f"  p{i}: {len(names)} 个链接 → {names[:4]}")
        return
    pages = [int(x) for x in args if x.isdigit()] or [1, 2, 3]
    for p in pages:
        if p < 1 or p > n:
            continue
        img = pdf[p - 1].render(scale=1.6).to_pil()
        path = os.path.join(outdir, f"p{p:03d}.png")
        img.save(path)
        print(path)


if __name__ == "__main__":
    main()
