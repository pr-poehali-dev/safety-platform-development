import { useEffect, useRef, useState } from "react";

const MAX_STEPS = 100;
const GROUP_MS = 800;

export function useFormHistory<T>(form: T, setForm: (v: T) => void) {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const last = useRef<T>(form);
  const skip = useRef(false);
  const lastChangeAt = useRef(0);
  const [, bump] = useState(0);

  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      last.current = form;
      return;
    }
    if (form === last.current) return;
    const now = Date.now();
    if (now - lastChangeAt.current > GROUP_MS || past.current.length === 0) {
      past.current.push(last.current);
      if (past.current.length > MAX_STEPS) past.current.shift();
    }
    lastChangeAt.current = now;
    future.current = [];
    last.current = form;
    bump(n => n + 1);
  }, [form]);

  const undo = () => {
    const prev = past.current.pop();
    if (prev === undefined) return;
    future.current.push(last.current);
    skip.current = true;
    lastChangeAt.current = 0;
    setForm(prev);
    bump(n => n + 1);
  };

  const redo = () => {
    const next = future.current.pop();
    if (next === undefined) return;
    past.current.push(last.current);
    skip.current = true;
    lastChangeAt.current = 0;
    setForm(next);
    bump(n => n + 1);
  };

  return { undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}
