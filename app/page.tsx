"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Plus, Users, MessageSquare, Play, CheckCircle, Clock } from "lucide-react";

export default function DashboardPage() {
  const { personas, meetings } = useStore();

  const recentMeetings = [...meetings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const inProgress = meetings.filter((m) => m.status === "in_progress").length;
  const completed = meetings.filter((m) => m.status === "completed").length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Dashboard</h1>
        <p className="text-sm text-[#78788a] mt-1">Welcome to AI Council.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#252437] border border-[#3d3b5c] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-[#9496ca]" />
            <span className="text-xs text-[#78788a] font-medium">Personas</span>
          </div>
          <p className="text-3xl font-bold text-[#f5f5f5]">{personas.length}</p>
        </div>
        <div className="bg-[#252437] border border-[#3d3b5c] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Play size={16} className="text-yellow-400" />
            <span className="text-xs text-[#78788a] font-medium">In Progress</span>
          </div>
          <p className="text-3xl font-bold text-[#f5f5f5]">{inProgress}</p>
        </div>
        <div className="bg-[#252437] border border-[#3d3b5c] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-emerald-400" />
            <span className="text-xs text-[#78788a] font-medium">Completed</span>
          </div>
          <p className="text-3xl font-bold text-[#f5f5f5]">{completed}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
        <Link
          href="/meetings/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#6264a7] hover:bg-[#7b83eb] text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={15} />
          New Meeting
        </Link>
        <Link
          href="/personas/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2f2d47] hover:bg-[#39365a] text-[#b0afc8] text-sm font-medium rounded-xl transition-colors border border-[#3d3b5c]"
        >
          <Plus size={15} />
          New Persona
        </Link>
      </div>

      {/* Recent meetings */}
      <div>
        <h2 className="text-xs font-semibold text-[#78788a] uppercase tracking-wider mb-3">
          Recent Meetings
        </h2>
        {recentMeetings.length === 0 ? (
          <div className="border border-dashed border-[#3d3b5c] rounded-2xl p-10 text-center">
            <MessageSquare size={32} className="text-[#78788a] mx-auto mb-3" />
            <p className="text-[#78788a] text-sm">No meetings yet.</p>
            <Link
              href="/meetings/new"
              className="inline-block mt-4 text-[#9496ca] text-sm hover:underline"
            >
              Start your first meeting →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentMeetings.map((meeting) => {
              const StatusIcon =
                meeting.status === "completed"
                  ? CheckCircle
                  : meeting.status === "in_progress"
                  ? Play
                  : Clock;
              const statusColor =
                meeting.status === "completed"
                  ? "text-emerald-400"
                  : meeting.status === "in_progress"
                  ? "text-yellow-400"
                  : "text-[#78788a]";

              return (
                <Link
                  key={meeting.id}
                  href={`/meetings/${meeting.id}`}
                  className="flex items-center gap-4 bg-[#252437] border border-[#3d3b5c] rounded-xl px-4 py-3 hover:border-[#5856a0] transition-colors"
                >
                  <StatusIcon size={15} className={statusColor} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#f5f5f5] truncate">
                      {meeting.title}
                    </p>
                    <p className="text-xs text-[#78788a]">
                      {new Date(meeting.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-xs text-[#78788a] flex-shrink-0">
                    {meeting.personaRefs.length} personas · {meeting.rounds} rounds
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
