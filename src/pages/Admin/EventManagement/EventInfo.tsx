import React, { useState } from 'react'
import { Event } from '../../../types/types-file';
import Title from 'antd/es/typography/Title'
import useEvents from '../../../hooks/useEvents';
import { Button, DatePicker, Tabs } from 'antd';
import dayjs from 'dayjs';
import TextArea from 'antd/es/input/TextArea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useShifts from '../../../hooks/useShifts';
import ShiftInfo from './ShiftInfo';

export default function EventInfo(props : {event: Event}) {

    const { updateEvent,removeEvent } = useEvents();
    const [activeTab, setActiveTab] = useState('edit')
    const {shiftState, updateShift} = useShifts();


    const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    updateEvent(props.event.id, 'description', e.target.value)
  }

    const shifts = shiftState.shifts.filter(shift => shift.eventId === props.event.id);





  return (
    <div>
    <Button type="primary" danger onClick={() => removeEvent(props.event.id)} >Delete Event</Button>

    <Title level={3} editable={{onChange: (value) => updateEvent(props.event.id,'title',value) }}>{props.event.title}</Title>
    <Title level={4} editable={{onChange: (value) => updateEvent(props.event.id,'where',value) }}>{props.event.where}</Title>
    From
    <DatePicker   format="DD-MM-YYYY HH:mm" showTime value={dayjs(props.event.start)} onChange={(value) => updateEvent(props.event.id,'start',value.toDate())}/>
    To
    <DatePicker   format="DD-MM-YYYY HH:mm" showTime value={dayjs(props.event.end)} onChange={(value) => updateEvent(props.event.id,'end',value.toDate())}/>
     <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'edit',
            label: 'Edit Description',
            children: (
              <TextArea
                rows={6}
                placeholder="Write a description using Markdown..."
                value={props.event.description || ''}
                onChange={handleDescriptionChange}
              />
            ),
          },
          {
            key: 'preview',
            label: 'Preview',
            children: (
              <div className="p-2 border rounded-md bg-gray-50 prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{props.event.description || '*No description yet*'}</ReactMarkdown>
              </div>
            ),
          },
        ]}
      />
        <Title>Shifts</Title>
        <Button >Add default 3 shifts</Button>
        <Button >Add custom shift</Button>
        <Button >Add default Big Party Shifts</Button>

        
        {shifts && shifts.length > 0 ? (
        shifts.map((shift) => (
          <ShiftInfo
            key={shift.id}
            shift={shift}
            updateShift={updateShift}
          />
        ))
      ) : (
        <p>No shifts yet.</p>
      )}



    </div>
  )
}
