import React from "react";
import { Card, notification, Tooltip, Typography } from "antd";
import { useAuth } from "../contexts/AuthContext";
import { CalendarTwoTone, CopyTwoTone } from "@ant-design/icons";
import googlecalendaricon from "../assets/images/googlecal.svg";
import applecalendaricon from "../assets/images/applecal.svg";
import outlookcalendaricon from "../assets/images/outlookcal.svg";
import type { ElementType } from "react";

type CalendarIconProps = {
    icon: string | ElementType;
    alt: string;
};

const CalendarIcon = ({icon, alt}: CalendarIconProps) => {
    if (typeof icon === "string") {
        return <Tooltip title={alt}>
            <img src={icon} alt={alt} style={{ width: 32, marginRight: 4, verticalAlign: 'middle' }} />
        </Tooltip>
    }

    // Otherwise assume it's a component type (ElementType) and render it
    const IconComponent = icon as ElementType;
    return <Tooltip title={alt}><IconComponent style={{ fontSize: 32, marginRight: 4, verticalAlign: 'middle' }} /></Tooltip>;
};

export const CalendarSection = () => {
    const { currentUser } = useAuth();

    if (!currentUser) {
        return; // authentication and loading handled elsewhere
    }

    const calendarUrl = `${globalThis.location.origin}/calendar/${currentUser.uid}`;

    const googleCalendarUrl = `https://calendar.google.com/calendar/u/0/r?cid=${calendarUrl}`
    const appCalendarUrl = `webcal:${calendarUrl}`;

    return (
        <Card size="small" style={{ marginBottom: 16 }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
                <CalendarTwoTone style={{ marginRight: 8 }} />
                Your Calendar Links
            </Typography.Title>
            <Typography.Paragraph>
                Subscribe to your personal calendar with your favourite app:
            </Typography.Paragraph>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                <Typography.Link href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
                    <CalendarIcon icon={googlecalendaricon} alt="Add to Google Calendar" />
                </Typography.Link>
                <Typography.Link href={appCalendarUrl} target="_blank" rel="noopener noreferrer">
                    <CalendarIcon icon={applecalendaricon} alt="Add to Apple Calendar" />
                </Typography.Link>
                <Typography.Link href={appCalendarUrl} target="_blank" rel="noopener noreferrer">
                    <CalendarIcon icon={outlookcalendaricon} alt="Add to Outlook Calendar" />
                </Typography.Link>
                <Typography.Link
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        navigator.clipboard
                        .writeText(calendarUrl)
                        .then(() => { notification.success({ message: "Calendar link copied to clipboard", placement: "bottom" }); })
                        .catch(() => { notification.error({ message: "Failed to copy calendar link", placement: "bottom" }); });
                    }}
                    >
                    <CalendarIcon icon={CopyTwoTone} alt="Copy calendar link to clipboard" />
                </Typography.Link>
            </div>
        </Card>
    );
};
