import React from 'react'
import useTenders from '../../../hooks/useTenders'
import { useState } from 'react'
import { Button, Input } from 'antd'
import useEvents from '../../../hooks/useEvents'
import Title from 'antd/es/typography/Title'
import TextArea from 'antd/es/input/TextArea'
import type { RadioChangeEvent } from 'antd';
import { Radio, Tabs } from 'antd';
import EventInfo from './EventInfo'








export default function TestPage() {
    const { addInvite, removeInvite } = useTenders()
    const { addEvent, updateEvent, eventState } = useEvents();

    const [email, setEmail] = useState('')

    const findNextFridayAt15 = () => {
        const today = new Date();
        const nextFriday = new Date(today.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7)));
        nextFriday.setHours(15, 0, 0, 0); // Set to 3 PM

        return nextFriday;
    }

    const createEventFromToday = () => {
        const nextFriday = findNextFridayAt15();
        const event = {
            start: nextFriday,
            end: new Date(nextFriday.getTime() + 60 * 60 * 11000), // 1 hour later
            description: 'No description',
            displayName: 'New Event wup wup',
            where: 'ScrollBar',
            published: false,
            internal: false,
        }
        addEvent(event)
    }

    type TabPosition = 'left' | 'right' | 'top' | 'bottom';


    const [mode, setMode] = useState<TabPosition>('top');

    const handleModeChange = (e: RadioChangeEvent) => {
      setMode(e.target.value);
    };



    

    const { events } = eventState
    const {previousEvents} = eventState

    const event = events[0] // Assuming you want to update the first event
    console.log(events)

    events.sort((a, b) => a.start.getTime() - b.start.getTime());
    const [SelectedEventId, setSelectedEventId] = useState('');
        console.log(SelectedEventId);

  return (
    eventState.isLoaded && <div>

    
    <Input placeholder="Enter email" onChange={(e:React.ChangeEvent<HTMLInputElement >) => setEmail(e.target.value)} />
    <Button onClick={() => addInvite(email)}>Add Invite</Button>
    <Button onClick={() => createEventFromToday()}>Create new event</Button>
    <Title level={3} editable={{onChange: (value) => updateEvent(event.id,'title',value) }} >Title: {event.title}</Title>
    <Title level={4} editable={{onChange: (value) => updateEvent(event.id,'location',value) }}>Location: {event.location}</Title>
    <TextArea onChange={(value) => updateEvent(event.id,'description',value.target.value) } value={event.description}></TextArea>

    <Title>Create new shift</Title>
    

    <div>
      <Radio.Group onChange={handleModeChange} value={mode} style={{ marginBottom: 8 }}>
        <Radio.Button value="top">Current Events</Radio.Button>
        <Radio.Button value="left">Previous Events</Radio.Button>
      </Radio.Group>
      <Tabs
        onChange={(key) => setSelectedEventId(key)}
        defaultActiveKey="1"
        tabPosition={"left"}
        style={{ height: 600 }}
        items={Array.from(events, (e, i) => {
          const id = e.id;
          return {
            label: `${e.displayName} - ${e.start.toDateString() + ' ' + e.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${e.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            key: id,
            disabled: i === 28,
            children: <EventInfo event={e}></EventInfo>,
          };
        })}
      />
      <Button onClick={() => console.log(events)}>Create event for next Friday in line</Button>
      <Button onClick={() => console.log(previousEvents)}>Create new custom event</Button>
    </div>


    </div>
  )
}
