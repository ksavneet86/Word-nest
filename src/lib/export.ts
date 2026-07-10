import type { WordRecord } from "@/lib/types";

export function exportPDF(listName: string, words: WordRecord[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const rows = words
    .map((w) => {
      const visual = w.pictogramId
        ? `<img src="https://static.arasaac.org/pictograms/${w.pictogramId}/${w.pictogramId}_500.png" style="width:56px;height:56px;object-fit:contain;" />`
        : `<div style="font-size:36px;">${w.emoji || ""}</div>`;
      return `
    <div style="page-break-inside:avoid;margin-bottom:14px;padding:12px;border:1px solid #eee;border-radius:10px;display:flex;gap:12px;align-items:flex-start;">
      ${visual}
      <div>
        <div style="font-size:18px;font-weight:800;">${w.word} <span style="font-size:11px;font-weight:600;color:#7C6FF0;text-transform:uppercase;">${w.pos || ""}</span></div>
        <div style="color:#334;margin-top:4px;">${w.meaning}</div>
        <div style="color:#667;font-size:12px;margin-top:4px;">Synonyms: ${(w.synonyms || []).join(", ") || "—"} &nbsp; | &nbsp; Antonyms: ${(w.antonyms || []).join(", ") || "—"}</div>
        ${w.sentenceTip ? `<div style="color:#889;font-size:12px;font-style:italic;margin-top:4px;">"${w.sentenceTip}"</div>` : ""}
      </div>
    </div>`;
    })
    .join("");
  win.document.write(`<html><head><title>${listName}</title></head><body style="font-family:sans-serif;max-width:700px;margin:24px auto;">
    <h1 style="font-size:24px;">${listName}</h1>${rows}
    <p style="font-size:10px;color:#999;margin-top:20px;">Picture symbols by ARASAAC (arasaac.org), CC BY-NC-SA.</p>
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export function shareText(listName: string, words: WordRecord[]) {
  return `${listName}\n\n` + words.map((w) => `${w.word}: ${w.meaning}`).join("\n");
}
