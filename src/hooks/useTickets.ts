import { createTicket } from "../firebase/api/tickets";
import { TicketCreateParams } from "../types/types-file";

const useTickets = () => {
  const addTicket = async (ticket: TicketCreateParams) => {
    return createTicket(ticket);
  };

  return { addTicket };
};

export default useTickets;
