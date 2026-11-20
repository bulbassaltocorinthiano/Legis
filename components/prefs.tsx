"use client";
import { useCallback, useEffect, useState } from "react";

export interface Prefs {
  theme?: "light" | "dark";
  size?: number; // rem do texto legal
  sans?: boolean;
  hideTerms?: boolean;
  hideNotes?: boolean;
  hideRevoked?: boolean;
  hideCobrados?: boolean;
}

const KEY = "legis:prefs";

function read(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function apply(p: Prefs) {
  const root = document.documentElement;
  const dark = p.theme ? p.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.toggle("dark", dark);
  if (p.size) root.style.setProperty("--law-size", `${p.size}rem`);
  else root.style.removeProperty("--law-size");
}

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>({});
  useEffect(() => {
    setPrefs(read());
    const onChange = () => setPrefs(read());
    window.addEventListener("legis:prefs", onChange);
    return () => window.removeEventListener("legis:prefs", onChange);
  }, []);
  const update = useCallback((patch: Partial<Prefs>) => {
    const next = { ...read(), ...patch };
    for (const k of Object.keys(next) as (keyof Prefs)[]) if (next[k] === undefined) delete next[k];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* navegação privada */
    }
    apply(next);
    setPrefs(next);
    window.dispatchEvent(new Event("legis:prefs"));
  }, []);
  return { prefs, update };
}
