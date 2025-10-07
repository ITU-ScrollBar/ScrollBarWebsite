import React from 'react'
import { Card, InputNumber, Input, DatePicker } from 'antd'
import dayjs from 'dayjs'
import { Shift } from '../../../types/types-file'

export default function ShiftInfo(props: {
  shift: Shift
  updateShift: (id: string, field: string, value: any) => void
}) {
  const { shift, updateShift } = props



  console.log(shift)

  return (
    <Card title={shift.title} className="mb-4 shadow-sm rounded-lg">
      <div className="space-y-3">
        {/* Title */}
        <Input
          value={shift.title}
          placeholder="Shift title"
          onChange={(e) => updateShift(shift.id, 'title', e.target.value)}
        />

        {/* Location */}
        <Input
          value={shift.location}
          placeholder="Location"
          onChange={(e) => updateShift(shift.id, 'location', e.target.value)}
        />

        {/* Dates */}
        <div className="flex flex-wrap items-center gap-4">
          <span>From</span>
          <DatePicker
            format="DD-MM-YYYY HH:mm"
            showTime
            value={dayjs(shift.start)}
            onChange={(value) => updateShift(shift.id, 'start', value.toDate())}
          />

          <span>To</span>
          <DatePicker
            format="DD-MM-YYYY HH:mm"
            showTime
            value={dayjs(shift.end)}
            onChange={(value) => updateShift(shift.id, 'end', value.toDate())}
          />
        </div>

        {/* Numbers */}
        <div className="flex gap-4">
            anchors
          <InputNumber
            min={0}
            value={shift.anchors}
            onChange={(value) => updateShift(shift.id, 'anchors', value)}
            placeholder="Anchors"
          />
          tenders
          <InputNumber
            min={0}
            value={shift.tenders}
            onChange={(value) => updateShift(shift.id, 'tenders', value)}
            placeholder="Tenders"
          />
        </div>
      </div>
    </Card>
  )
}
