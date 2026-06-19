"use client";

import { useEffect } from "react";

export function HomepageSessionReset() {
  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {
      // The public homepage should stay usable even if the cleanup request is interrupted.
    });
  }, []);

  return null;
}
