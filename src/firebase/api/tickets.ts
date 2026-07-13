import { auth } from "..";
import {
  Ticket,
  TicketCreateParams,
  TicketDepartment,
  TicketImpact,
  TicketRequestType,
  TicketStatus,
} from "../../types/types-file";

const projectId = import.meta.env.VITE_APP_FIREBASE_PROJECT_ID as string;
const ticketsEndpoint = `https://europe-west1-${projectId}.cloudfunctions.net/calendar/tickets`;

export const createTicket = async (ticket: TicketCreateParams) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be signed in to create a ticket.");
  }

  const token = await currentUser.getIdToken();
  const payload = {
    title: ticket.title,
    description: ticket.description,
    department: ticket.department,
    requestType: ticket.requestType,
    impact: ticket.impact,
  };

  const response = await fetch(ticketsEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to create ticket");
  }

  return (await response.json()) as { id: string };
};

type ListTicketsHttpResponse = {
  tickets: {
    id: string;
    title: string;
    description: string;
    department: Ticket["department"];
    requestType: Ticket["requestType"];
    impact: Ticket["impact"];
    status: TicketStatus;
    createdByUid?: string;
    createdAtMs?: number;
    updatedAtMs?: number;
  }[];
};

export const listTickets = async (): Promise<(Ticket & { key: string })[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be signed in to list tickets.");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(ticketsEndpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to load tickets");
  }

  const payload = (await response.json()) as ListTicketsHttpResponse;

  return payload.tickets.map((ticket) => ({
    id: ticket.id,
    key: ticket.id,
    title: ticket.title,
    description: ticket.description,
    department: ticket.department,
    requestType: ticket.requestType,
    impact: ticket.impact,
    status: ticket.status,
    createdByRef: ticket.createdByUid ?? null,
    createdAt: ticket.createdAtMs ? new Date(ticket.createdAtMs) : undefined,
    updatedAt: ticket.updatedAtMs ? new Date(ticket.updatedAtMs) : undefined,
  }));
};

export const updateTicketStatus = async (
  id: string,
  status: TicketStatus
): Promise<void> => {
  return updateTicket(id, { status });
};

export const updateTicket = async (
  id: string,
  update: {
    title?: string;
    description?: string;
    department?: TicketDepartment;
    requestType?: TicketRequestType;
    impact?: TicketImpact;
    status?: TicketStatus;
  }
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be signed in to update ticket.");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${ticketsEndpoint}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(update),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to update ticket");
  }
};

export const deleteTicket = async (id: string): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be signed in to delete ticket.");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${ticketsEndpoint}/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to delete ticket");
  }
};
