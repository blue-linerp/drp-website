"use client";
import type { ReactNode } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

/** Vertical drag-and-drop list (mouse, touch and keyboard: Space to pick up, arrows to move). */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  render,
}: {
  items: T[];
  getId: (item: T) => string;
  onReorder: (items: T[]) => void;
  render: (item: T, index: number, handle: ReactNode) => ReactNode;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = items.map(getId);
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onReorder(arrayMove(items, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {items.map((item, i) => (
          <Row key={ids[i]} id={ids[i]}>
            {(handle) => render(item, i, handle)}
          </Row>
        ))}
      </SortableContext>
    </DndContext>
  );
}

function Row({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button
      type="button"
      className="flex h-9 w-7 shrink-0 cursor-grab items-center justify-center text-white/40 hover:text-white active:cursor-grabbing"
      aria-label="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={16} />
    </button>
  );
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined, position: "relative", opacity: isDragging ? 0.85 : 1 }}>
      {children(handle)}
    </div>
  );
}
