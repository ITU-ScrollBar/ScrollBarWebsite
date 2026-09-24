import FormPageShell from "./Forms/components/FormPageShell";
import LendingRequestForm from "./Forms/components/LendingRequestForm";

export default function LendingRequestPage() {
  return (
    <FormPageShell
      title="Book ScrollBar equipment"
      description="For members who want to borrow equipment from the bar. You are fully responsible for
      what you borrow, and we expect it back in the same condition."
    >
      <LendingRequestForm />
    </FormPageShell>
  );
}
