import { useCallback, useEffect, useState } from "react";
import {
  addFeedbackComment as addFeedbackCommentInDb,
  deleteAnonymousFeedback as deleteAnonymousFeedbackInDb,
  deleteFeedbackComment as deleteFeedbackCommentInDb,
  listAnonymousFeedback,
  submitAnonymousFeedback,
} from "../firebase/api/anonymousFeedback";
import { AnonymousFeedback } from "../types/types-file";

type AnonymousFeedbackState = {
  loading: boolean;
  isLoaded: boolean;
  error: string | null;
  entries: (AnonymousFeedback & { key: string })[];
};

type UseAnonymousFeedbackOptions = {
  // Listing is board-only, so the member-facing submit page opts out of loading entirely.
  autoLoad?: boolean;
};

const refreshIntervalMs = 30000;

const useAnonymousFeedback = ({ autoLoad = true }: UseAnonymousFeedbackOptions = {}) => {
  const [feedbackState, setFeedbackState] = useState<AnonymousFeedbackState>({
    loading: autoLoad,
    isLoaded: false,
    error: null,
    entries: [],
  });

  const loadFeedback = useCallback(async (silent = false) => {
    if (!silent) {
      setFeedbackState((prev) => ({ ...prev, loading: true }));
    }

    try {
      const entries = await listAnonymousFeedback();
      setFeedbackState({
        loading: false,
        isLoaded: true,
        error: null,
        entries,
      });
    } catch (error) {
      setFeedbackState((prev) => ({
        ...prev,
        loading: false,
        isLoaded: true,
        error: error instanceof Error ? error.message : "Failed to load feedback.",
      }));
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    void loadFeedback(false);

    const intervalId = window.setInterval(() => {
      void loadFeedback(true);
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoLoad, loadFeedback]);

  const addFeedback = async (feedback: string) => {
    return submitAnonymousFeedback(feedback);
  };

  const addComment = async (id: string, body: string) => {
    await addFeedbackCommentInDb(id, body);
    await loadFeedback(true);
  };

  const deleteComment = async (id: string, commentId: string) => {
    await deleteFeedbackCommentInDb(id, commentId);
    await loadFeedback(true);
  };

  const deleteFeedback = async (id: string) => {
    await deleteAnonymousFeedbackInDb(id);
    await loadFeedback(true);
  };

  return {
    feedbackState,
    addFeedback,
    addComment,
    deleteComment,
    deleteFeedback,
    refreshFeedback: loadFeedback,
  };
};

export default useAnonymousFeedback;
