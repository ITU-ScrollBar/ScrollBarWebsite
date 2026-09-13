import { message } from "antd";
import { getDownloadURL, ref } from "firebase/storage";
import { useEffect, useRef, useState } from "react";
import { storage } from "../../../../firebase";

export interface StorageFileRef {
  id: string;
  path?: string | null;
}

/**
 * Resolves Firebase Storage download URLs ahead of time so they can be rendered
 * as plain anchors. Resolving on click instead would break Safari/WebKit, which
 * blocks window.open once the call stack has left the user gesture.
 */
export default function useStorageDownloadUrls(files: StorageFileRef[], errorLabel: string) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const requestedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const missing = files.filter((file) => !!file.path && !requestedKeysRef.current.has(`${file.id}:${file.path}`));

    if (!missing.length) return;

    missing.forEach((file) => {
      requestedKeysRef.current.add(`${file.id}:${file.path}`);
      getDownloadURL(ref(storage, file.path as string))
        .then((url) => {
          setUrls((prev) => ({ ...prev, [file.id]: url }));
        })
        .catch((error: unknown) => {
          const reason = error instanceof Error ? error.message : String(error);
          message.error(`Failed to load ${errorLabel}: ${reason}`);
        });
    });
  }, [files, errorLabel]);

  return urls;
}
