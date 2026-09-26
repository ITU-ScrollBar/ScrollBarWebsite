import { useCallback, useEffect, useState } from "react";

/**
 * Lets a provider hold off on a live listener until some component actually
 * reads its data. The provider passes `requested` to its streaming hook and
 * exposes `request` in its context value; consumers call useRequestStream.
 * Once started, the listener keeps running so later pages get the data at once.
 */
export const useStreamRequest = () => {
  const [requested, setRequested] = useState(false);
  const request = useCallback(() => setRequested(true), []);
  return { requested, request };
};

/**
 * Starts the provider's listener from a consumer. Pass `stream: false` from
 * components that only use the context's actions, not its streamed state.
 */
export const useRequestStream = (request: (() => void) | undefined, stream: boolean) => {
  useEffect(() => {
    if (stream) request?.();
  }, [request, stream]);
};
