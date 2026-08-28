import { useState, useEffect, useCallback } from "react";
import { HeadcountDay } from "@/lib/headcountTypes";

const HEADCOUNT_URL = "https://functions.poehali.dev/524b275c-ad3f-4a44-bd48-10b14045a7bd";

export function useHeadcount(year: number) {
  const [days, setDays] = useState<HeadcountDay[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${HEADCOUNT_URL}?year=${year}`);
      const data = await res.json();
      setDays(Array.isArray(data) ? data : []);
    } catch {
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const saveDay = async (entry_date: string, po_count: number | null, sbd_count: number | null, updated_by: string) => {
    await fetch(HEADCOUNT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry_date, po_count, sbd_count, updated_by }),
    });
    await load();
  };

  return { days, loading, load, saveDay };
}
