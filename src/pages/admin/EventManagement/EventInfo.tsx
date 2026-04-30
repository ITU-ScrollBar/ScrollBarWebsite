import React, { useState } from "react";
import { Event } from "../../../types/types-file";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import useEvents from "../../../hooks/useEvents";
import {
  Button,
  DatePicker,
  Tabs,
  message,
  Upload,
  Popconfirm,
  Switch,
} from "antd";
import dayjs from "dayjs";
import TextArea from "antd/es/input/TextArea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { deleteFileFromStorage, uploadEventPicture } from "../../../firebase/api/events";

export default function EventInfo(props: { event: Event }) {
  const { updateEvent, removeEvent } = useEvents();
  const [activeTab, setActiveTab] = useState("edit");

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    updateEvent(props.event.id, "description", e.target.value);
  };

  const tokenRegex = /(\?alt=media&token=[\w-]+)$/;

  return (
    <div>
      <Popconfirm title={"Delete Event"} description={"Are you sure you want to delete this event? This action cannot be undone."}
        onConfirm={() => removeEvent(props.event.id)}>
        <Button type="primary" danger>
          Delete Event
        </Button>
      </Popconfirm>
      <div {...(props.event.photo_url) ?
        {style: 
          {backgroundImage: `url(${props.event.photo_url})`,
            padding: '16px',
            backgroundSize: 'cover',
            backgroundPosition: 'center', 
            height: '200px',
            borderRadius: '8px',
            marginBottom: '16px',
            color: 'white',
            marginTop: '8px'}}
        : {style: {marginBottom: '16px'}}}
      >
        <Title
          level={3}
          style={props.event.photo_url ? { color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.7)' } : {}}
          editable={{
            onChange: (value) => updateEvent(props.event.id, "title", value),
          }}
        >
          {props.event.title}
        </Title>
        <Title
          level={4}
          style={props.event.photo_url ? { color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.7)' } : {}}
          editable={{
            onChange: (value) => updateEvent(props.event.id, "where", value),
          }}
        >
          {props.event.where}
        </Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <Text>Published:</Text>
          <Switch checked={props.event.published} onChange={(checked) => updateEvent(props.event.id, "published", checked)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Upload
            customRequest={({file}) => {
              uploadEventPicture(file as File, props.event.id)
                .then((url) => {
                  const previousUrl = props.event.photo_url;
                  updateEvent(props.event.id, "photo_url", url);
                  message.success("Event photo uploaded successfully");
                  if (previousUrl && previousUrl.replace(tokenRegex, '') !== url.replace(tokenRegex, '')) {
                    deleteFileFromStorage(previousUrl);
                  }
                })
                .catch(() => {
                  message.error("Failed to upload event photo");
                });
            }}
            showUploadList={false}
            accept="image/*"
          >
            <Button type="primary">
              {props.event.photo_url ? "Change Photo" : "Add Photo"}
            </Button>
          </Upload>
          {props.event.photo_url && (
            <Button type="primary" danger
              onClick={() => {
                deleteFileFromStorage(props.event.photo_url!);
                updateEvent(props.event.id, "photo_url", null);
              }}
            >
              Delete Photo
            </Button>
          )}
        </div>
      </div>
      {"From: "}
      <DatePicker
        format="DD-MM-YYYY HH:mm"
        showTime
        allowClear={false}
        value={dayjs(props.event.start)}
        onChange={(value) =>
          updateEvent(props.event.id, "start", value?.toDate())
        }
      />
      {" To: "}
      <DatePicker
        format="DD-MM-YYYY HH:mm"
        showTime
        allowClear={false}
        value={dayjs(props.event.end)}
        onChange={(value) => updateEvent(props.event.id, "end", value?.toDate())}
      />
      <br />
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "edit",
            label: "Edit Description",
            children: (
              <TextArea
                rows={6}
                placeholder="Write a description using Markdown..."
                value={props.event.description || ""}
                onChange={handleDescriptionChange}
              />
            ),
          },
          {
            key: "preview",
            label: "Preview",
            children: (
              <div className="p-2 border rounded-md bg-gray-50 prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {props.event.description || "*No description yet*"}
                </ReactMarkdown>
              </div>
            ),
          },
        ]}
      />
      Event URL:
      <Text editable={{
        onChange: (value) => updateEvent(props.event.id, "event_url", value),
      }}
      >
        {props.event.event_url}
      </Text>
    </div>
  );
}
