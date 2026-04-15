"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Plus, MessageSquare, Clock, CheckCircle, Play, Trash2 } from "lucide-react";

const STATUS_STYLES = {
  draft: { label: "Draft", className: "text-[#b0afc8] bg-[#3d3b5c]/40", Icon: Clock },
  in_progress: { label: "In Progress", className: "text-yellow-300 bg-yellow-500/15", Icon: Play },
  completed: { label: "Completed", className: "text-emerald-300 bg-emerald-500/15", Icon: CheckCircle },
};

export default function MeetingsPage() {
  const { meetings, personas, deleteMeeting } = useStore();
  const router = useRouter();

  const sorted = [...meetings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Delete this meeting? This cannot be undone.")) {
      deleteMeeting(id);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Meetings</h1>
          <p className="text-sm text-[#78788a] mt-1">
            All your past and active council sessions.
          </p>
        </div>
        <Link
          href="/meetings/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#6264a7] hover:bg-[#7b83eb] text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={15} />
          New Meeting
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="border border-dashed border-[#3d3b5c] rounded-2xl p-16 text-center">
          <MessageSquare size={36} className="text-[#78788a] mx-auto mb-3" />
          <p className="text-[#b0afc8] font-medium mb-1">No meetings yet</p>
          <p className="text-sm text-[#78788a] mb-5">
            Start your first council session.
          </p>
          <Link
            href="/meetings/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6264a7] hover:bg-[#7b83eb] text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={15} />
            New Meeting
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((meeting) => {
            const { label, className, Icon } = STATUS_STYLES[meeting.status];
            const participantPersonas = meeting.personaRefs
              .map((r) => personas.find((p) => p.id === r.personaId))
              .filter(Boolean);

            return (
              <div
                key={meeting.id}
                className="group flex items-stretch bg-[#252437] border border-[#3d3b5c] rounded-2xl hover:border-[#5856a0] transition-colors"
              >
                {/* Clickable area */}
                <button
                  type="button"
                  onClick={() => router.push(`/meetings/${meeting.id}`)}
                  className="flex-1 text-left p-4 min-w-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="font-semibold text-[#f5f5f5] truncate">
                          {meeting.title}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${className}`}
                        >
                          <Icon size={10} />
                          {label}
                        </span>
                      </div>
                      {meeting.description && (
                        <p className="text-xs text-[#78788a] truncate mb-2">
                          {meeting.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-[#78788a]">
                        <span>{participantPersonas.length} persona{participantPersonas.length !== 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span>{meeting.rounds} round{meeting.rounds !== 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span>{meeting.messages.filter((m) => m.type !== "system").length} messages</span>
                      </div>
                    </div>

                    {/* Participant avatars */}
                    <div className="flex -space-x-2 flex-shrink-0">
                      {participantPersonas.slice(0, 4).map((p) => (
                        <div
                          key={p!.id}
                          title={p!.name}
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-sm ring-2 ring-[#252437]"
                          style={{ background: p!.color }}
                        >
                          {p!.emoji}
                        </div>
                      ))}
                      {participantPersonas.length > 4 && (
                        <div className="w-7 h-7 rounded-xl bg-[#3d3b5c] flex items-center justify-center text-xs text-[#b0afc8] ring-2 ring-[#252437]">
                          +{participantPersonas.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, meeting.id)}
                  title="Delete meeting"
                  className="flex items-center px-3 border-l border-transparent group-hover:border-[#3d3b5c] text-[#78788a] hover:text-red-400 hover:bg-red-500/5 transition-colors rounded-r-2xl opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
