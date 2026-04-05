"use client";

import { Card, Chip } from "@heroui/react";
import { Pin, Calendar, User, Eye, MessageSquare, Bell } from "lucide-react";

export function NoticeList({ notices }: { notices: any[] }) {
  if (notices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-default-200 rounded-xl bg-default-50">
        <Bell className="text-default-300 w-12 h-12 mb-4" />
        <h3 className="text-lg font-semibold text-default-600">No notices posted yet</h3>
        <p className="text-default-400">Announcements from the management will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {notices.map((notice) => (
        <Card key={notice.id} className="p-0 overflow-hidden border border-default-200 bg-background hover:border-primary/50 transition-all cursor-pointer group relative">
          {notice.pinned && (
            <div className="absolute top-0 right-0 bg-primary/10 text-primary px-3 py-1 flex items-center gap-1 rounded-bl-xl text-xs font-bold z-10">
              <Pin size={12} fill="currentColor" />
              PINNED
            </div>
          )}
          
          <div className="p-6 flex flex-col h-full">
            <div className="flex gap-2 mb-4">
              <Chip size="sm" variant="soft" color="accent" className="font-bold">
                {notice.category}
              </Chip>
              <Chip size="sm" variant="soft" color="default">
                {notice.status}
              </Chip>
            </div>

            <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
              {notice.title}
            </h3>
            
            <p className="text-default-500 text-sm line-clamp-3 mb-6 flex-1">
              {notice.body}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-default-100 mt-auto">
              <div className="flex items-center gap-4 text-xs text-default-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {new Date(notice.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1.5">
                   <User size={14} />
                   {notice.author?.full_name || "Management"}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-default-400 font-bold">
                 <div className="flex items-center gap-1">
                    <Eye size={14} />
                    {notice.views_count}
                 </div>
                 <div className="flex items-center gap-1">
                    <MessageSquare size={14} />
                    0
                 </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
