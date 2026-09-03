import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  App as AntdApp,
  Alert,
  Button,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useAuth } from "../../../../contexts/AuthContext";
import useLendingRequests from "../../../../hooks/useLendingRequests";
import { LendingEquipment } from "../../../../types/types-file";
import { equipmentOptions } from "../../../../utils/formResponses";

const { TextArea } = Input;

type LendingFormValues = {
  equipment: LendingEquipment;
  equipmentDetails?: string;
  occasion: string;
  pickupAt: Dayjs;
  returnAt: Dayjs;
  responsibilityAccepted: boolean;
  additionalInfo?: string;
};

export default function LendingRequestForm() {
  const { message } = AntdApp.useApp();
  const { currentUser } = useAuth();
  // Listing lending requests is board-only, so the submit page never loads them.
  const { addLendingRequest } = useLendingRequests({ autoLoad: false });
  const navigate = useNavigate();
  const [form] = Form.useForm<LendingFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const selectedEquipment = Form.useWatch("equipment", form);
  const pickupAt = Form.useWatch("pickupAt", form);

  const onFinish = async (values: LendingFormValues) => {
    setSubmitting(true);
    try {
      await addLendingRequest({
        equipment: values.equipment,
        // Only "Other" carries free text; anything typed before switching equipment is dropped.
        equipmentDetails:
          values.equipment === LendingEquipment.OTHER
            ? values.equipmentDetails?.trim()
            : undefined,
        occasion: values.occasion.trim(),
        pickupAt: values.pickupAt.startOf("day").toDate(),
        returnAt: values.returnAt.startOf("day").toDate(),
        responsibilityAccepted: values.responsibilityAccepted,
        additionalInfo: values.additionalInfo?.trim(),
      });
      message.success("Request sent. The board will review it shortly.");
      navigate("/tenders/forms");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to submit lending request.";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form<LendingFormValues>
      form={form}
      layout="vertical"
      onFinish={onFinish}
      requiredMark={false}
      initialValues={{ equipment: LendingEquipment.SOUNDBOKS }}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
        message="Requests are reviewed by the board"
        description={
          <>
            Lending equipment requires approval from at least two board members, and only if the
            equipment is not already booked. Shorter loan periods are easier to approve. You are
            submitting as{" "}
            <strong>{currentUser?.displayName || currentUser?.email || "your account"}</strong>, so
            the board can reach you about the request.
          </>
        }
      />

      <Form.Item
        label="What equipment do you wish to borrow?"
        name="equipment"
        rules={[{ required: true, message: "Please select the equipment." }]}
      >
        <Select options={equipmentOptions} />
      </Form.Item>

      {selectedEquipment === LendingEquipment.OTHER ? (
        <Form.Item
          label="Which equipment?"
          name="equipmentDetails"
          preserve={false}
          rules={[
            { required: true, message: "Please describe the equipment." },
            { max: 120, message: "Keep it to 120 characters or less." },
          ]}
        >
          <Input placeholder="Describe what you need to borrow" maxLength={120} />
        </Form.Item>
      ) : null}

      <Form.Item
        label="What is the occasion of lending the equipment?"
        name="occasion"
        rules={[
          { required: true, message: "Please describe the occasion." },
          { max: 500, message: "Keep it to 500 characters or less." },
        ]}
      >
        <TextArea rows={3} placeholder="What are you using it for?" showCount maxLength={500} />
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="When will you pick up the equipment?"
            name="pickupAt"
            rules={[{ required: true, message: "Please pick a date." }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              disabledDate={(current) => current.isBefore(dayjs().startOf("day"))}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="When will you return the equipment?"
            name="returnAt"
            dependencies={["pickupAt"]}
            rules={[
              { required: true, message: "Please pick a date." },
              {
                validator: (_rule, value: Dayjs | undefined) => {
                  const pickup = form.getFieldValue("pickupAt") as Dayjs | undefined;
                  if (!value || !pickup || !value.isBefore(pickup, "day")) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Return date must be on or after pick-up."));
                },
              },
            ]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              disabledDate={(current) =>
                current.isBefore(pickupAt ? pickupAt.startOf("day") : dayjs().startOf("day"))
              }
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="responsibilityAccepted"
        valuePropName="checked"
        rules={[
          {
            validator: (_rule, value: boolean) =>
              value
                ? Promise.resolve()
                : Promise.reject(new Error("You have to accept responsibility to continue.")),
          },
        ]}
      >
        <Checkbox>
          I take full responsibility of returning this equipment in the same condition as I receive
          it in, including replacing the equipment if necessary.
        </Checkbox>
      </Form.Item>

      <Form.Item label="Anything else we should know?" name="additionalInfo">
        <TextArea rows={3} placeholder="Optional" showCount maxLength={1000} />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={submitting} block>
          Send request
        </Button>
      </Form.Item>
    </Form>
  );
}
