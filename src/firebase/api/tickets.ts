import { auth } from "..";
import { TicketCreateParams } from "../../types/types-file";

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
