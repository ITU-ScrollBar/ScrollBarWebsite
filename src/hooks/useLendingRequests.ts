import { useCallback, useEffect, useState } from "react";
import {
  addLendingComment as addLendingCommentInDb,
  createLendingRequest,
  deleteLendingComment as deleteLendingCommentInDb,
  deleteLendingRequest as deleteLendingRequestInDb,
  listLendingRequests,
  setLendingDecision as setLendingDecisionInDb,
} from "../firebase/api/lendingRequests";
import { LendingDecision, LendingRequest, LendingRequestCreateParams } from "../types/types-file";

type LendingRequestState = {
  loading: boolean;
  isLoaded: boolean;
  error: string | null;
  requests: (LendingRequest & { key: string })[];
};

type UseLendingRequestsOptions = {
  // Listing is board-only, so the member-facing submit page opts out of loading entirely.
  autoLoad?: boolean;
};

// Lending requests are low volume, so a slower poll than the ticket board is plenty.
const refreshIntervalMs = 30000;

const useLendingRequests = ({ autoLoad = true }: UseLendingRequestsOptions = {}) => {
  const [lendingState, setLendingState] = useState<LendingRequestState>({
    loading: autoLoad,
    isLoaded: false,
    error: null,
    requests: [],
  });

  const loadRequests = useCallback(async (silent = false) => {
    if (!silent) {
      setLendingState((prev) => ({ ...prev, loading: true }));
    }

    try {
      const requests = await listLendingRequests();
      setLendingState({
        loading: false,
        isLoaded: true,
        error: null,
        requests,
      });
    } catch (error) {
      setLendingState((prev) => ({
        ...prev,
        loading: false,
        isLoaded: true,
        error: error instanceof Error ? error.message : "Failed to load lending requests.",
      }));
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    void loadRequests(false);

    const intervalId = window.setInterval(() => {
      void loadRequests(true);
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoLoad, loadRequests]);

  const addLendingRequest = async (request: LendingRequestCreateParams) => {
    return createLendingRequest(request);
  };

  const setLendingDecision = async (id: string, decision: LendingDecision) => {
    await setLendingDecisionInDb(id, decision);
    await loadRequests(true);
  };

  const addComment = async (id: string, body: string) => {
    await addLendingCommentInDb(id, body);
    await loadRequests(true);
  };

  const deleteComment = async (id: string, commentId: string) => {
    await deleteLendingCommentInDb(id, commentId);
    await loadRequests(true);
  };

  const deleteLendingRequest = async (id: string) => {
    await deleteLendingRequestInDb(id);
    await loadRequests(true);
  };

  return {
    lendingState,
    addLendingRequest,
    setLendingDecision,
    addComment,
    deleteComment,
    deleteLendingRequest,
    refreshLendingRequests: loadRequests,
  };
};

export default useLendingRequests;
