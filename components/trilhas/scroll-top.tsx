"use client";
import { useEffect } from "react";

/** Garante que a página recém-aberta (após criar a trilha) comece do topo. */
export function ScrollTop() {
  useEffect(() => window.scrollTo(0, 0), []);
  return null;
}
