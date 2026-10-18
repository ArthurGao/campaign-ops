import { AD_TASK_TYPES, type Task, type TaskType } from '@campaign-ops/core';

export const isAdTask = (t: Task) => (AD_TASK_TYPES as readonly TaskType[]).includes(t.type);
