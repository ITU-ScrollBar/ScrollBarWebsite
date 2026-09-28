import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { App as AntdApp, Button, Form, Input } from "antd";
import useAnonymousFeedback from "../../../../hooks/useAnonymousFeedback";

const { TextArea } = Input;

type FeedbackFormValues = {
  name?: string;
  feedback: string;
};

export default function AnonymousFeedbackForm() {
  const { message } = AntdApp.useApp();
  // Reading feedback is board-only, so the submit page never loads the responses.
  const { addFeedback } = useAnonymousFeedback({ autoLoad: false });
  const navigate = useNavigate();
  const [form] = Form.useForm<FeedbackFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const hasName = Boolean(Form.useWatch("name", form)?.trim());

  const onFinish = async (values: FeedbackFormValues) => {
    setSubmitting(true);
    try {
      const name = values.name?.trim();
      await addFeedback({ feedback: values.feedback.trim(), ...(name ? { name } : {}) });
      message.success(
        name
          ? "Thanks! Your feedback was sent to the board with your name."
          : "Thanks! Your feedback was sent to the board anonymously."
      );
      navigate("/tenders/forms");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send feedback.";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form<FeedbackFormValues> form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
      <Form.Item
        label={<strong>(Optional) Name</strong>}
        name="name"
        extra="Please write your name here if you would like the board to reach out to you in regards to a solution of your feedback. We do not respond directly to all types of feedback to ensure privacy for all members. If you are in doubt, please reach out to a board member. If you write your name, your feedback is no longer anonymous."
        rules={[{ max: 100, message: "Keep it to 100 characters or less." }]}
      >
        <Input placeholder="Leave empty to stay anonymous" maxLength={100} />
      </Form.Item>

      <Form.Item
        label="Put your feedback here!"
        name="feedback"
        rules={[
          { required: true, message: "Please write your feedback." },
          { max: 3000, message: "Keep it to 3000 characters or less." },
        ]}
      >
        <TextArea
          rows={8}
          placeholder="Anything you want to ask, suggest or complain about"
          showCount
          maxLength={3000}
        />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={submitting} block>
          {hasName ? "Send with my name" : "Send anonymously"}
        </Button>
      </Form.Item>
    </Form>
  );
}
