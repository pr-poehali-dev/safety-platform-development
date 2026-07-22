import { useState, useEffect, useCallback } from "react";
import { AppUser } from "@/lib/auth";
import { RoutineCategory, RoutineEntry, getCurrentWeekDays } from "@/lib/routineTypes";

const CATEGORIES_URL = "https://functions.poehali.dev/71168178-29a2-4a26-854e-043d0d622df7";
const ENTRIES_URL = "https://functions.poehali.dev/ffa7403e-d254-4946-9d74-11a176c44f52";

export function useRoutine(user: AppUser) {
  const [categories, setCategories] = useState<RoutineCategory[]>([]);
  const [entries, setEntries] = useState<RoutineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDays = getCurrentWeekDays();
  const weekFrom = weekDays[0].iso;
  const weekTo = weekDays[6].iso;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, entRes] = await Promise.all([
        fetch(CATEGORIES_URL),
        fetch(`${ENTRIES_URL}?login=${encodeURIComponent(user.login)}&from=${weekFrom}&to=${weekTo}`),
      ]);
      const catData = await catRes.json();
      const entData = await entRes.json();
      setCategories(Array.isArray(catData) ? catData : []);
      setEntries(Array.isArray(entData) ? entData : []);
    } catch {
      setCategories([]);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [user.login, weekFrom, weekTo]);

  useEffect(() => { load(); }, [load]);

  const createEntry = async (payload: { category_id: number | null; category_name: string; entry_date: string; hours: number; comment: string }) => {
    await fetch(ENTRIES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, user_login: user.login, user_name: user.name }),
    });
    await load();
  };

  const updateEntry = async (id: number, payload: { category_id: number | null; category_name: string; entry_date: string; hours: number; comment: string }) => {
    await fetch(ENTRIES_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    await load();
  };

  const deleteEntry = async (id: number) => {
    await fetch(`${ENTRIES_URL}?id=${id}`, { method: "DELETE" });
    await load();
  };

  return { categories, entries, weekDays, loading, load, createEntry, updateEntry, deleteEntry };
}
