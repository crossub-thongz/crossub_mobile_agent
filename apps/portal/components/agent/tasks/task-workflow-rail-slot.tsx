'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type TaskWorkflowRailSlotContextValue = {
  node: HTMLElement | null;
  setNode: (node: HTMLElement | null) => void;
  onStepActivate: () => void;
};

const TaskWorkflowRailSlotContext = createContext<TaskWorkflowRailSlotContextValue | null>(
  null,
);

export function TaskWorkflowRailSlotProvider({
  children,
  onStepActivate,
}: {
  children: ReactNode;
  onStepActivate?: () => void;
}) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const value = useMemo(
    () => ({
      node,
      setNode,
      onStepActivate: onStepActivate ?? (() => {}),
    }),
    [node, onStepActivate],
  );

  return (
    <TaskWorkflowRailSlotContext.Provider value={value}>
      {children}
    </TaskWorkflowRailSlotContext.Provider>
  );
}

export function TaskWorkflowRailSlot() {
  const ctx = useContext(TaskWorkflowRailSlotContext);
  if (!ctx) return null;

  return (
    <div
      ref={ctx.setNode}
      data-tour="workflow-rail"
      className="rounded-2xl border v2-frosted-surface p-2 empty:hidden md:p-3"
    />
  );
}

export function TaskWorkflowRailPortal({ children }: { children: ReactNode }) {
  const ctx = useContext(TaskWorkflowRailSlotContext);
  if (!ctx?.node) return children;

  return createPortal(
    <div
      onClickCapture={() => {
        ctx.onStepActivate();
      }}
    >
      {children}
    </div>,
    ctx.node,
  );
}
