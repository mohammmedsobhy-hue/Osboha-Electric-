/**
 * Critical Path Method (CPM) and Gantt Chart Calculations
 */

import { ProjectTask, CalculatedTask } from '../types';

/**
 * Calculates Critical Path, Slack (Float), and Overdue Delays for a list of project tasks
 */
export function calculateCriticalPath(tasks: ProjectTask[]): CalculatedTask[] {
  if (tasks.length === 0) return [];

  // 1. Identify baseline project origin date
  const timestamps = tasks.map(t => new Date(t.startDate).getTime());
  const minTime = Math.min(...timestamps);
  const oneDay = 1000 * 60 * 60 * 24;

  const toDays = (dateStr: string) => Math.max(0, Math.round((new Date(dateStr).getTime() - minTime) / oneDay));

  // Map of basic initial nodes
  const nodeMap = new Map<
    string,
    {
      task: ProjectTask;
      duration: number;
      es: number;
      ef: number;
      ls: number;
      lf: number;
      predecessors: string[];
      successors: string[];
    }
  >();

  tasks.forEach(t => {
    const startDay = toDays(t.startDate);
    const endDay = toDays(t.endDate);
    const duration = Math.max(1, t.durationDays || endDay - startDay || 1);

    nodeMap.set(t.id, {
      task: t,
      duration,
      es: startDay,
      ef: startDay + duration,
      ls: Infinity,
      lf: Infinity,
      predecessors: [...(t.dependencies || [])],
      successors: [],
    });
  });

  // Build successors map
  tasks.forEach(t => {
    (t.dependencies || []).forEach(depId => {
      const parent = nodeMap.get(depId);
      if (parent) {
        parent.successors.push(t.id);
      }
    });
  });

  // Forward Pass (Calculate Early Start & Early Finish)
  // Process nodes until topological convergence
  let changed = true;
  let iterations = 0;
  while (changed && iterations < tasks.length * 2) {
    changed = false;
    iterations++;

    nodeMap.forEach(node => {
      if (node.predecessors.length > 0) {
        let maxPredEF = node.es;
        node.predecessors.forEach(predId => {
          const pred = nodeMap.get(predId);
          if (pred && pred.ef > maxPredEF) {
            maxPredEF = pred.ef;
          }
        });

        if (maxPredEF > node.es) {
          node.es = maxPredEF;
          node.ef = node.es + node.duration;
          changed = true;
        }
      }
    });
  }

  // Find max project completion day
  let projectDuration = 0;
  nodeMap.forEach(node => {
    if (node.ef > projectDuration) {
      projectDuration = node.ef;
    }
  });

  // Backward Pass (Calculate Late Finish & Late Start)
  // Initialize terminal nodes
  nodeMap.forEach(node => {
    if (node.successors.length === 0) {
      node.lf = projectDuration;
      node.ls = node.lf - node.duration;
    }
  });

  changed = true;
  iterations = 0;
  while (changed && iterations < tasks.length * 2) {
    changed = false;
    iterations++;

    nodeMap.forEach(node => {
      if (node.successors.length > 0) {
        let minSuccLS = Infinity;
        node.successors.forEach(succId => {
          const succ = nodeMap.get(succId);
          if (succ && succ.ls < minSuccLS) {
            minSuccLS = succ.ls;
          }
        });

        if (minSuccLS !== Infinity && minSuccLS < node.lf) {
          node.lf = minSuccLS;
          node.ls = node.lf - node.duration;
          changed = true;
        }
      }
    });
  }

  // Current date for delay checks
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Return Calculated Tasks
  return tasks.map(t => {
    const node = nodeMap.get(t.id)!;
    const slack = Math.max(0, (node.ls === Infinity ? node.es : node.ls) - node.es);
    // Task is on critical path if slack is 0 (or minimal float <= 0.1)
    const isCritical = slack <= 0.1;

    // Check if task is delayed
    const taskEnd = new Date(t.endDate);
    taskEnd.setHours(0, 0, 0, 0);
    const isPastDue = now.getTime() > taskEnd.getTime() && t.progress < 100;
    const daysDelayed = isPastDue ? Math.ceil((now.getTime() - taskEnd.getTime()) / oneDay) : 0;
    const isDelayed = isPastDue || t.status === 'delayed';

    return {
      ...t,
      earlyStart: node.es,
      earlyFinish: node.ef,
      lateStart: node.ls === Infinity ? node.es : node.ls,
      lateFinish: node.lf === Infinity ? node.ef : node.lf,
      slack,
      isCritical,
      isDelayed,
      daysDelayed,
      status: isDelayed ? 'delayed' : t.status,
    };
  });
}
