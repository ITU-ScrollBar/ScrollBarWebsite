import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { App as AntdApp, Button, Form, Input } from "antd";
import useAnonymousFeedback from "../../../../hooks/useAnonymousFeedback";

const { TextArea } = Input;

type FeedbackFormValues = {
  feedback: string;
};

export default function AnonymousFeedbackForm() {
  const { message } = AntdApp.useApp();
  // Reading feedback is board-only, so the submit page never loads the responses.
  const { addFeedback } = useAnonymousFeedback({ autoLoad: false });
  const navigate = useNavigate();
  const [form] = Form.useForm<FeedbackFormValues>();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: FeedbackFormValues) => {
    setSubmitting(true);
    try {
      await addFeedback(values.feedback.trim());
      message.success("Thanks! Your feedback was sent to the board anonymously.");
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
          Send anonymously
        </Button>
      </Form.Item>
    </Form>
  );
}
