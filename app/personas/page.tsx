"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import LLMBadge from "@/components/LLMBadge";
import { Plus, Pencil, Trash2, Users } from "lucide-react";

export default function PersonasPage() {
  const { personas, deletePersona } = useStore();

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Personas</h1>
          <p className="text-sm text-[#78788a] mt-1">
            Your AI persona library — reuse them across any meeting.
          </p>
        </div>
        <Link
          href="/personas/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#6264a7] hover:bg-[#7b83eb] text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={15} />
          New Persona
        </Link>
      </div>

      {personas.length === 0 ? (
        <div className="border border-dashed border-[#3d3b5c] rounded-2xl p-16 text-center">
          <Users size={36} className="text-[#78788a] mx-auto mb-3" />
          <p className="text-[#b0afc8] font-medium mb-1">No personas yet</p>
          <p className="text-sm text-[#78788a] mb-5">
            Create your first persona to start building your AI council.
          </p>
          <Link
            href="/personas/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6264a7] hover:bg-[#7b83eb] text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={15} />
            Create Persona
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {personas.map((persona) => (
            <div
              key={persona.id}
              className="bg-[#252437] border border-[#3d3b5c] rounded-2xl p-4 hover:border-[#5856a0] transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: persona.color }}
                >
                  {persona.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#f5f5f5] truncate">
                    {persona.name}
                  </p>
                  <p className="text-xs text-[#78788a] truncate">{persona.role}</p>
                </div>
              </div>

              <p className="text-xs text-[#78788a] line-clamp-2 mb-3 leading-relaxed">
                {persona.systemPrompt}
              </p>

              <div className="flex items-center justify-between">
                <LLMBadge provider={persona.provider} model={persona.model} />
                <div className="flex items-center gap-1">
                  <Link
                    href={`/personas/${persona.id}`}
                    className="p-1.5 text-[#78788a] hover:text-[#b0afc8] hover:bg-[#2f2d47] rounded-xl transition-colors"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${persona.name}"?`)) {
                        deletePersona(persona.id);
                      }
                    }}
                    className="p-1.5 text-[#78788a] hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
