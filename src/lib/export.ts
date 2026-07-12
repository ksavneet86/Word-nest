import type { SessionEntry, WordRecord } from "@/lib/types";

export interface ProgressRow {
  lib: string;
  folder: string;
  listName: string;
  total: number;
  mastered: number;
  practice: number;
}

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

function downloadBlob(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportProgressCSV(learnerName: string, rows: ProgressRow[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = "Library,Folder,List,Total Words,Mastered,Needs Practice,% Mastered";
  const lines = rows.map((r) => {
    const pct = r.total ? Math.round((r.mastered / r.total) * 100) : 0;
    return [esc(r.lib), esc(r.folder), esc(r.listName), r.total, r.mastered, r.practice, pct].join(",");
  });
  downloadBlob(
    `${learnerName.replace(/[^a-z0-9]+/gi, "-")}-progress.csv`,
    [header, ...lines].join("\n"),
    "text/csv;charset=utf-8;"
  );
}

export function exportProgressPDF(learnerName: string, rows: ProgressRow[], sessionLog: SessionEntry[]) {
  const win = window.open("", "_blank");
  if (!win) return;

  const totalWords = rows.reduce((a, r) => a + r.total, 0);
  const totalMastered = rows.reduce((a, r) => a + r.mastered, 0);
  const overallPct = totalWords ? Math.round((totalMastered / totalWords) * 100) : 0;

  const rowsHtml = rows
    .map((r) => {
      const pct = r.total ? Math.round((r.mastered / r.total) * 100) : 0;
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${r.listName}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#667;font-size:12px;">${r.lib} / ${r.folder}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${r.mastered}/${r.total}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${pct}%</td>
      </tr>`;
    })
    .join("");

  const recentSessions = sessionLog.slice(-10).reverse();
  const sessionsHtml = recentSessions.length
    ? recentSessions
        .map((s) => {
          const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
          return `<li>${new Date(s.createdAt).toLocaleDateString()} — ${s.type} (${s.section}): ${s.correct}/${s.total} (${pct}%)</li>`;
        })
        .join("")
    : "<li>No practice sessions yet.</li>";

  win.document.write(`<html><head><title>${learnerName} — Progress Report</title></head>
    <body style="font-family:sans-serif;max-width:700px;margin:24px auto;color:#182A33;">
      <h1 style="font-size:24px;">${learnerName} — Progress Report</h1>
      <p style="font-size:14px;color:#556;">Generated ${new Date().toLocaleDateString()}</p>
      <h2 style="font-size:18px;margin-top:24px;">${overallPct}% mastered overall (${totalMastered}/${totalWords} words)</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px;">
        <thead><tr>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd;">List</th>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd;">Location</th>
          <th style="text-align:center;padding:6px 10px;border-bottom:2px solid #ddd;">Mastered</th>
          <th style="text-align:center;padding:6px 10px;border-bottom:2px solid #ddd;">%</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <h2 style="font-size:18px;margin-top:24px;">Recent practice sessions</h2>
      <ul style="font-size:13px;color:#334;">${sessionsHtml}</ul>
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
