import { useCallback, useEffect, useState } from "react";
import {
  createTicket,
  deleteTicket as deleteTicketInDb,
  listTickets,
  updateTicket as updateTicketInDb,
  updateTicketStatus as updateTicketStatusInDb,
} from "../firebase/api/tickets";
import {
  Ticket,
  TicketCreateParams,
  TicketDepartment,
  TicketImpact,
  TicketRequestType,
  TicketStatus,
} from "../types/types-file";

type TicketState = {
  loading: boolean;
  isLoaded: boolean;
  error: string | null;
  tickets: (Ticket & { key: string })[];
};

type UseTicketsOptions = {
  // Listing is board-only, so the member-facing submit page opts out of loading entirely.
  autoLoad?: boolean;
};

const useTickets = ({ autoLoad = true }: UseTicketsOptions = {}) => {
  const [ticketState, setTicketState] = useState<TicketState>({
    loading: false,
    isLoaded: false,
    error: null,
    tickets: [],
  });

  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) {
      setTicketState((prev) => ({ ...prev, loading: true }));
    }

    try {
      const tickets = await listTickets();
      setTicketState({
        loading: false,
        isLoaded: true,
        error: null,
        tickets,
      });
    } catch (error) {
      setTicketState((prev) => ({
        ...prev,
        loading: false,
        isLoaded: true,
        error: error instanceof Error ? error.message : "Failed to load tickets.",
      }));
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    void loadTickets(false);

    const intervalId = window.setInterval(() => {
      void loadTickets(true);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoLoad, loadTickets]);

  const addTicket = async (ticket: TicketCreateParams, imageFiles: File[] = []) => {
    return createTicket(ticket, imageFiles);
  };

  const updateTicketStatus = async (id: string, status: TicketStatus) => {
    await updateTicketStatusInDb(id, status);
    await loadTickets(true);
  };

  const updateTicket = async (
    id: string,
    update: {
      title?: string;
      description?: string;
      department?: TicketDepartment;
      requestType?: TicketRequestType;
      impact?: TicketImpact;
      status?: TicketStatus;
    }
  ) => {
    await updateTicketInDb(id, update);
    await loadTickets(true);
  };

  const deleteTicket = async (id: string) => {
    await deleteTicketInDb(id);
    await loadTickets(true);
  };

  return {
    ticketState,
    addTicket,
    deleteTicket,
    updateTicket,
    updateTicketStatus,
    refreshTickets: loadTickets,
  };
};

export default useTickets;
