import { useState } from "react";
import { App as AntdApp, Button, Form, Input, Modal, Result, Typography } from "antd";
import DrinkRecipeList from "../../../../components/DrinkRecipeList";
import {
  DRINK_CREATOR_NAME_MAX_LENGTH,
  DRINK_NAME_MAX_LENGTH,
  DrinkState,
  DrinkStep,
  DrinkSubmissionCreateParams,
  normalizeItuInitials,
} from "../../../../types/drinkRecipe";
import { formatCl } from "../../../../utils/drinks";

const { Text } = Typography;

type SubmitDrinkFormValues = {
  drinkName: string;
  creatorName: string;
  ituInitials: string;
};

type SubmitDrinkModalProps = {
  open: boolean;
  drink: DrinkState;
  steps: DrinkStep[];
  submitDrink: (params: DrinkSubmissionCreateParams) => Promise<{ id: string }>;
  onClose: () => void;
  onStartOver: () => void;
};

export default function SubmitDrinkModal({
  open,
  drink,
  steps,
  submitDrink,
  onClose,
  onStartOver,
}: SubmitDrinkModalProps) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<SubmitDrinkFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [submittedName, setSubmittedName] = useState<string | null>(null);

  const close = () => {
    setSubmittedName(null);
    onClose();
  };

  const startOver = () => {
    setSubmittedName(null);
    onStartOver();
  };

  const handleSubmit = async (values: SubmitDrinkFormValues) => {
    setSubmitting(true);
    try {
      await submitDrink({
        drinkName: values.drinkName.trim(),
        creatorName: values.creatorName.trim(),
        ituInitials: normalizeItuInitials(values.ituInitials) ?? values.ituInitials.trim(),
        steps,
      });
      // Keep who they are for the next drink; only the drink's own name starts over.
      form.resetFields(["drinkName"]);
      setSubmittedName(values.drinkName.trim());
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to submit your drink.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={close}
      title={submittedName ? null : "Submit your drink"}
      footer={null}
      destroyOnHidden
    >
      {submittedName ? (
        <Result
          status="success"
          title="Cheers!"
          subTitle={`"${submittedName}" has been sent to the board.`}
          extra={[
            <Button key="again" type="primary" onClick={startOver}>
              Build another
            </Button>,
            <Button key="close" onClick={close}>
              Close
            </Button>,
          ]}
        />
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <DrinkRecipeList pours={drink.pours} />
            <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
              {formatCl(drink.levelCl)} in total
            </Text>
          </div>
          <Form<SubmitDrinkFormValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={handleSubmit}
          >
            <Form.Item
              label="Name of the drink"
              name="drinkName"
              rules={[
                { required: true, whitespace: true, message: "Give your drink a name." },
                { max: DRINK_NAME_MAX_LENGTH },
              ]}
            >
              <Input maxLength={DRINK_NAME_MAX_LENGTH} placeholder="The Scroll Sunrise" />
            </Form.Item>
            <Form.Item
              label="Your name"
              name="creatorName"
              rules={[
                { required: true, whitespace: true, message: "Tell us who you are." },
                { max: DRINK_CREATOR_NAME_MAX_LENGTH },
              ]}
            >
              <Input maxLength={DRINK_CREATOR_NAME_MAX_LENGTH} autoComplete="name" />
            </Form.Item>
            <Form.Item
              label="ITU initials"
              name="ituInitials"
              extra="The part before @itu.dk in your ITU email."
              rules={[
                { required: true, message: "Add your ITU initials." },
                {
                  validator: async (_rule, value?: string) => {
                    if (value && !normalizeItuInitials(value)) {
                      throw new Error("That doesn't look like ITU initials, e.g. abcd.");
                    }
                  },
                },
              ]}
            >
              <Input placeholder="abcd" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} block>
              Submit drink
            </Button>
          </Form>
        </>
      )}
    </Modal>
  );
}
