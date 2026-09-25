"use client";

import React, { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Activity } from '@/lib/types';
import { ActivityRow } from './ActivityRow';
import { GripVertical } from 'lucide-react';
import { getDistanceService } from '@/lib/services/distance';
import { resolveActivityCoords } from '@/lib/itinerary/coordinateUtils';

// Sortable item wrapper
function SortableActivityItem({ 
  activity, 
  isLast,
  distanceLabel,
  onEdit,
  onRemove
}: { 
  activity: Activity; 
  isLast: boolean;
  distanceLabel?: string;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/sortable">
      <div 
        {...attributes} 
        {...listeners}
        className="absolute -left-3 md:-left-6 top-12 md:top-8 p-1 cursor-grab active:cursor-grabbing text-cream-200 hover:text-ink-400 opacity-0 group-hover/sortable:opacity-100 transition-opacity z-10"
      >
        <GripVertical size={16} />
      </div>
      <ActivityRow 
        activity={activity} 
        isLast={isLast}
        distanceLabel={distanceLabel}
        onEdit={onEdit} 
        onRemove={onRemove} 
      />
    </div>
  );
}

interface DraggableActivityListProps {
  activities: Activity[];
  originCoords?: { lat: number; lon: number; label?: string } | null;
  destination?: string;
  onReorder: (newOrder: Activity[]) => void;
  onEditActivity: (id: string) => void;
  onRemoveActivity: (id: string) => void;
}

export function DraggableActivityList({ 
  activities, 
  originCoords,
  destination,
  onReorder,
  onEditActivity,
  onRemoveActivity
}: DraggableActivityListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before dragging starts (helps with clicks)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const items = useMemo(() => activities.map(a => a.id), [activities]);

  // Compute per-activity distance labels
  const ds = getDistanceService();
  const distanceLabels = useMemo(() => {
    // Resolve coords for each activity (uses stored lat/lon or deterministic fallback)
    const resolved = activities.map(act => resolveActivityCoords(act.name, act.lat, act.lon, destination || ""));
    return activities.map((act, idx) => {
      const coords = resolved[idx];
      let prevCoords: { lat: number; lon: number } | null | undefined = originCoords;
      if (idx > 0) prevCoords = resolved[idx - 1];
      if (!prevCoords || !coords) return undefined;
      const dist = ds.calculateDistance(prevCoords.lat, prevCoords.lon, coords.lat, coords.lon);
      if (!dist) return undefined;
      if (originCoords?.label === 'center' && idx === 0) {
        return `📍 ${dist.distanceKm >= 1 ? dist.distanceKm.toFixed(1) + ' km' : Math.round(dist.distanceKm * 1000) + ' m'} from center`;
      }
      return dist.label;
    });
  }, [activities, originCoords, destination]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = activities.findIndex(a => a.id === active.id);
      const newIndex = activities.findIndex(a => a.id === over.id);
      const newArray = arrayMove(activities, oldIndex, newIndex);
      
      // Update start times sequentially as a simple reorder logic
      // In a real app we might just snap to grid, but here we just keep the array order
      onReorder(newArray);
    }
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-ink-500 border border-dashed border-cream-200 rounded-cardLg">
        No activities planned for this day yet.
      </div>
    );
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={items}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col ml-3 md:ml-6 pt-4">
          {activities.map((act, idx) => (
            <SortableActivityItem 
              key={act.id} 
              activity={act} 
              isLast={idx === activities.length - 1}
              distanceLabel={distanceLabels[idx]}
              onEdit={onEditActivity}
              onRemove={onRemoveActivity}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
