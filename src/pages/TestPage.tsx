import React from 'react'
import useTenders from '../hooks/useTenders'
import { useState } from 'react'
import { Button, DatePicker, Input } from 'antd'
import useEvents from '../hooks/useEvents'
import Title from 'antd/es/typography/Title'
import TextArea from 'antd/es/input/TextArea'







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
            title: 'New Event wup wup',
            location: 'ScrollBar',
            published: false,
            internal: false,
        }
        addEvent(event)
    }

    const { events } = eventState
    const event = events[0] // Assuming you want to update the first event

  return (
    eventState.isLoaded && <div>

    
    <Input placeholder="Enter email" onChange={(e:React.ChangeEvent<HTMLInputElement >) => setEmail(e.target.value)} />
    <Button onClick={() => addInvite(email)}>Add Invite</Button>
    <Button onClick={() => createEventFromToday()}>Create new event</Button>
    <Title level={3} editable={{onChange: (value) => updateEvent(event.id,'title',value) }} >Title: {event.title}</Title>
    <Title level={4} editable={{onChange: (value) => updateEvent(event.id,'location',value) }}>Location: {event.location}</Title>
    <TextArea onChange={(value) => updateEvent(event.id,'description',value.target.value) } value={event.description}></TextArea>



    </div>
  )
}
