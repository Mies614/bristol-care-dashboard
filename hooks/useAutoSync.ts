"use client";

import { useEffect, useState } from "react";
import {
  AUTO_SYNC_EVENT,
  bootstrapAutoSync,
  getAutoSyncEnabled,
  getPendingSyncState,
  runAutoSyncNow,
  setAutoSyncEnabled,
  type AutoSyncStatus
} from "@/lib/autoSync";

export function useAutoSync() {
  const [state, setState] = useState(() => ({
    enabled: true,
    pending: false,
    status: "idle" as AutoSyncStatus,
    lastSyncAt: "",
    lastError: ""
  }));

  useEffect(() => {
    function refresh() {
      const pending = getPendingSyncState();
      setState({
        enabled: getAutoSyncEnabled(),
        pending: pending.pending,
        status: pending.status,
        lastSyncAt: pending.lastSyncAt,
        lastError: pending.lastError
      });
    }
    bootstrapAutoSync();
    refresh();
    window.addEventListener(AUTO_SYNC_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(AUTO_SYNC_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return {
    ...state,
    setEnabled: setAutoSyncEnabled,
    runNow: runAutoSyncNow
  };
}
