import React, { useState, useEffect } from "react";
import { StudyLine } from "../../types/types-file";
import { getStudyLines } from "../../firebase/api/authentication";

interface StudyLinePickerProps {
  value?: string;
  onChange?: (studyLine: string) => void;
  fontSize?: number;
  bold?: boolean;
}

export default function StudyLinePicker({ value, onChange, fontSize = 16, bold = false }: StudyLinePickerProps) {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(value);
  const [studyLines, setStudyLines] = useState<StudyLine[]>([]);

  useEffect(() => {
      getStudyLines().then((response) => {
        const studylines: StudyLine[] = response.map((doc: any) => doc as StudyLine);
        setStudyLines(studylines);
      });
    }, []);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      const selectedStudyLine = event.target.value;
      setSelectedValue(selectedStudyLine);
      if (selectedStudyLine) {
        onChange(selectedStudyLine);
      }
    }
  };

  const arrowSize = Math.max(fontSize * 0.8, 12); // Arrow size scales with font size, minimum 12px
  const paddingRight = arrowSize + 8; // Dynamic padding based on arrow size
  
  // Calculate width based on current selection
  const estimatedWidth = 17 * (fontSize * 0.6) + paddingRight; // Rough character width estimation

  return (
    <select 
      value={selectedValue} 
      onChange={handleChange}
      defaultValue={"Select study line"}
      style={{
        border: "none",
        background: "transparent",
        fontSize: `${fontSize}px`,
        fontWeight: bold ? "bold" : "normal",
        color: "inherit",
        cursor: "pointer",
        padding: "0",
        margin: "0",
        outline: "none",
        appearance: "none",
        WebkitAppearance: "none",
        MozAppearance: "none",
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 4px center",
        backgroundSize: `${arrowSize}px`,
        paddingRight: `${paddingRight}px`,
        width: `${estimatedWidth}px`,
        minWidth: `${estimatedWidth}px`
      }}
    >
      {studyLines.map((sl) => (
        <option
          key={(sl as any).id ?? sl.name} 
          value={sl.id}
          label={sl.name}
        >
          {sl.name}
        </option>
      ))}
    </select>
  );
}