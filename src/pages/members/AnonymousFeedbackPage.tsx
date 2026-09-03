import AnonymousFeedbackForm from "./Forms/components/AnonymousFeedbackForm";
import FormPageShell from "./Forms/components/FormPageShell";

export default function AnonymousFeedbackPage() {
  return (
    <FormPageShell
      title="Anonymous feedback"
      description="For any feedback you want to give the board anonymously — complaints about a member or
      a board member, something about the bar, or anything you want to ask or suggest without us
      knowing who you are. Your name, email and account are never stored with the submission, and
      the board checks it frequently."
    >
      <AnonymousFeedbackForm />
    </FormPageShell>
  );
}
