"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import type { SessionEntry } from "@/lib/types";

export function PerformanceGraph({ sessionLog, color }: { sessionLog: SessionEntry[]; color: string }) {
  if (!sessionLog || sessionLog.length === 0) return null;
  const data = sessionLog.slice(-20).map((s, i) => ({
    name: `#${i + 1}`,
    accuracy: s.total ? Math.round((s.correct / s.total) * 100) : 0,
  }));
  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
      <h3 className="font-extrabold text-slate-700 mb-3 flex items-center gap-2"><TrendingUp size={18} style={{ color }} /> Accuracy over recent sessions</h3>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Line type="monotone" dataKey="accuracy" stroke={color} strokeWidth={3} dot={{ r: 4, fill: color }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
