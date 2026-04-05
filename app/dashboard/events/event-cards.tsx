"use client";

import { Card, Button, Chip } from "@heroui/react";
import { Calendar, MapPin, Users, ArrowRight } from "lucide-react";

export function EventCards({ events }: { events: any[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-default-200 rounded-xl bg-default-50">
        <Calendar className="text-default-300 w-12 h-12 mb-4" />
        <h3 className="text-lg font-semibold text-default-600">No events scheduled</h3>
        <p className="text-default-400">Community festivities and meetings will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <Card key={event.id} className="p-0 overflow-hidden border border-default-200 bg-background hover:shadow-lg transition-all group">
          <div className="aspect-video w-full bg-default-100 relative overflow-hidden">
            {event.cover_image_url ? (
               <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
               <div className="w-full h-full flex items-center justify-center text-default-300">
                  <Calendar size={48} strokeWidth={1} />
               </div>
            )}
            <div className="absolute top-3 left-3 flex gap-2">
              <Chip size="sm" variant="soft" color="accent" className="font-bold uppercase tracking-wider text-[10px]">
                {event.category || "General"}
              </Chip>
            </div>
          </div>
          
          <div className="p-6">
            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{event.title}</h3>
            
            <div className="flex flex-col gap-2 mb-6">
               <div className="flex items-center gap-2 text-default-500 text-sm font-medium">
                  <Calendar size={16} className="text-primary" />
                  {new Date(event.starts_at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
               </div>
               <div className="flex items-center gap-2 text-default-500 text-sm font-medium">
                  <MapPin size={16} className="text-primary" />
                  {event.venue || "Community Hall"}
               </div>
               <div className="flex items-center gap-2 text-default-500 text-sm font-medium">
                  <Users size={16} className="text-primary" />
                  {event.going_count || 0} residents going
               </div>
            </div>

            <div className="flex items-center gap-3">
               <Button variant="primary" className="flex-1 font-bold h-10 px-4 group/btn">
                  RSVP NOW
                  <ArrowRight size={16} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
               </Button>
               <Button variant="outline" className="h-10 px-4 font-bold border-default-200">
                  DETAILS
               </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
