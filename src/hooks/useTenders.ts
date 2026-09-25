import { message } from "antd";
import { useEffect, useState } from "react";
import {
  deleteInvite,
  inviteUser,
  streamUsers,
  updateUser,
  deleteUser,
} from "../firebase/api/authentication";
import { queueApplicationInviteEmails } from "../firebase/api/applications";
import { countFutureEngagementsForUser } from "../firebase/api/engagements";
import { Tender } from "../types/types-file"; // Ensure the correct import path

type TenderState = {
  loading: boolean;
  isLoaded: boolean;
  tenders: Tender[];
};

type AddInvitesResult = {
  successful: string[];
  failed: Array<{ id: string; email: string; error: unknown }>;
};

const useTenders = () => {
  const [tenderState, setTenderState] = useState<TenderState>({
    loading: false,
    isLoaded: false,
    tenders: [],
  });

  useEffect(() => {
    setTenderState((prevState) => ({ ...prevState, loading: true }));

    // Stream tenders data
    const unsubscribeTenders = streamUsers({
      next: (snapshot) => {
        const updatedTenders: Tender[] = snapshot.docs.map((doc) => {
          const data = doc.data() as Tender; // Typing the data as Tender
          return { ...data, uid: doc.id };
        });
        setTenderState((prevState) => ({
          ...prevState,
          loading: false,
          isLoaded: true,
          tenders: updatedTenders,
        }));
      },
      error: (error) => {
        message.error(
          `An error occurred while streaming tenders: ${error.message}`
        );
        setTenderState((prevState) => ({
          ...prevState,
          loading: false,
          isLoaded: false,
        }));
      },
    });

    // Cleanup streams on component unmount
    return () => {
      unsubscribeTenders();
    };
  }, []);

  // Add invite
  const addInvite = (email: string) => {
    return inviteUser(email, { manualInvite: true })
      .then((response) => {
        message.success("Invite sent successfully!");
        return response; // Return the response from the inviteUser function
      })
      .catch((error) => {
        message.error(`Failed to send invite: ${error.message}`);
        throw error; // Propagate error for further handling if needed
      });
  };

  const addInvites = (
    recipients: Array<{ id: string; email: string; fullName?: string; studyline?: string }>,
    bodyText?: string
  ): Promise<AddInvitesResult> => {
    return Promise.allSettled(recipients.map((recipient) => inviteUser(recipient.email)))
      .then(async (inviteRecordResults) => {
        const readyForQueue: Array<{ id: string; email: string; fullName?: string; studyline?: string }> = [];
        const failed: Array<{ id: string; email: string; error: unknown }> = [];

        inviteRecordResults.forEach((result, index) => {
          const recipient = recipients[index];
          if (result.status === "fulfilled") {
            readyForQueue.push(recipient);
          } else {
            failed.push({ id: recipient.id, email: recipient.email, error: result.reason });
          }
        });

        const queueResult = await queueApplicationInviteEmails(
          readyForQueue.map((recipient) => ({
            id: recipient.id,
            email: recipient.email,
            fullName: recipient.fullName,
            studyline: recipient.studyline,
            bodyText,
          }))
        );

        const allFailed = [...failed, ...queueResult.failed];

        if (allFailed.length) {
          allFailed.forEach((entry) => {
            const reason = entry.error as { message?: string };
            message.error(`Failed to invite ${entry.email}: ${reason?.message}`);
          });
        } else {
          message.success(
            `Invited ${queueResult.successful.length} accepted applicant${queueResult.successful.length === 1 ? "" : "s"}.`
          );
        }

        return { successful: queueResult.successful, failed: allFailed };
      });
  };

  // Remove invite
  const removeInvite = (row: string) => {
    return deleteInvite({id: row})
      .then(() => {
        message.success("Invite removed successfully!");
      })
      .catch((error) => {
        message.error(`Failed to remove invite: ${error.message}`);
        throw error; // Propagate error for further handling if needed
      });
  };

  // Update tender
  const updateTender = (id: string, field: string, value: any) => {
    return updateUser({ id, field, value })
      .then(() => {
        message.success("Tender updated successfully!");
      })
      .catch((error) => {
        message.error(`Failed to update tender: ${error.message}`);
        throw error; // Propagate error for further handling if needed
      });
  };

  // Deletes a tender entirely (doc, account, profile picture), see deleteUser
  // Only succeeds if the tender exists and has no future shifts/engagements
  const deleteTender = async (id: string) => {
    const tender = tenderState.tenders.find(tender => tender.uid === id);
    if (!tender) {
      message.error("Tender not found.");
      return;
    }

    // Check for future shifts or engagements before deleting
    let futureEngagementCount: number;
    try {
      futureEngagementCount = await countFutureEngagementsForUser(id);
    } catch (error) {
      message.error(`Failed to check upcoming shifts for ${tender.displayName}: ${(error as Error).message}`);
      return;
    }

    if (futureEngagementCount > 0) {
      message.error(`Cannot delete ${tender.displayName}. Remove them from ${futureEngagementCount} upcoming shifts first.`);
      return;
    }

    const tenderName = tender.displayName;
    deleteUser(tender.uid)
      .then(() => {
        message.success(`${tenderName ?? "Tender"} deleted successfully!`);
      })
      .catch((error) => {
        message.error(`Failed to delete ${tenderName ?? "tender"}: ${error.message}`);
      }
      );
  };

  return {
    tenderState,
    addInvite,
    addInvites,
    removeInvite,
    updateTender,
    deleteTender,
  };
};

export default useTenders;
