"use client";

import { EmptyState } from "@/components/EmptyState";
import { TimelineDashboard } from "@/components/TimelineDashboard";
import { useDadKitStore } from "@/lib/store";
import {
  isTimelineTaskComplete,
  type TimelineTask,
} from "@/lib/timeline";

export default function TimelinePage() {
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const timelineTaskStatuses = useDadKitStore(
    (state) => state.timelineTaskStatuses,
  );
  const updateTimelineTaskStatus = useDadKitStore(
    (state) => state.updateTimelineTaskStatus,
  );

  if (!profile?.dueDate) {
    return (
      <div className="page-shell">
        <EmptyState
          title="还没有准备时间线"
          description="填写预产期后，DadKit 会自动生成准备节奏和临出门检查。"
          actionHref="/setup"
          actionLabel="填写预产期"
        />
      </div>
    );
  }

  function toggleTask(task: TimelineTask) {
    const complete = isTimelineTaskComplete(
      task,
      checklist,
      timelineTaskStatuses,
    );

    updateTimelineTaskStatus(task.id, complete ? "todo" : "done");
  }

  return (
    <div className="page-shell">
      <TimelineDashboard
        checklist={checklist}
        profile={profile}
        statuses={timelineTaskStatuses}
        onToggleTask={toggleTask}
      />
    </div>
  );
}
