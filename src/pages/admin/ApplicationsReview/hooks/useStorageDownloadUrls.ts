import { message } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { getStorageDownloadUrl } from "../../../../firebase/api/common";

export interface StorageFileRef {
  id: string;
  path?: string | null;
}

export type StorageDownloadStatus = "loading" | "ready" | "error";

export interface StorageDownloadEntry {
  status: StorageDownloadStatus;
  url?: string;
}

const entryKey = (file: StorageFileRef) => `${file.id}:${file.path}`;

const toReason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Resolves Firebase Storage download URLs up front so they can be rendered as
 * plain anchors. Resolving on click instead breaks Safari/WebKit, which blocks
 * window.open once the call stack has left the user gesture.
 */
export default function useStorageDownloadUrls(files: StorageFileRef[], errorLabel: string) {
  const [entries, setEntries] = useState<Record<string, StorageDownloadEntry>>({});
  const requestedKeysRef = useRef<Set<string>>(new Set());

  const resolve = useCallback(
    (targets: StorageFileRef[]) => {
      if (!targets.length) return;

      setEntries((prev) => {
        const next = { ...prev };
        targets.forEach((file) => {
          next[file.id] = { status: "loading" };
        });
        return next;
      });

      Promise.allSettled(targets.map((file) => getStorageDownloadUrl(file.path as string))).then((results) => {
        const resolved: Record<string, StorageDownloadEntry> = {};
        const reasons: string[] = [];

        results.forEach((result, index) => {
          const file = targets[index];
          if (result.status === "fulfilled") {
            resolved[file.id] = { status: "ready", url: result.value };
            return;
          }
          resolved[file.id] = { status: "error" };
          reasons.push(toReason(result.reason));
        });

        setEntries((prev) => ({ ...prev, ...resolved }));

        if (!reasons.length) return;
        message.error(
          reasons.length === 1
            ? `Failed to load ${errorLabel}: ${reasons[0]}`
            : `Failed to load ${errorLabel} for ${reasons.length} applications: ${reasons[0]}`
        );
      });
    },
    [errorLabel]
  );

  useEffect(() => {
    // Requested keys are kept even when a request fails, so a failure is never
    // retried automatically. Retrying is an explicit user action instead.
    const missing = files.filter((file) => !!file.path && !requestedKeysRef.current.has(entryKey(file)));

    if (!missing.length) return;

    missing.forEach((file) => requestedKeysRef.current.add(entryKey(file)));
    resolve(missing);
  }, [files, resolve]);

  const retry = useCallback(
    (file: StorageFileRef) => {
      if (!file.path) return;

      requestedKeysRef.current.add(entryKey(file));
      resolve([file]);
    },
    [resolve]
  );

  return { entries, retry };
}
