import React, { useState, useEffect } from "react";
import { getStudyLines } from "../../firebase/api/authentication";
import { StudyLine } from "../../types/types-file";

interface StudyLinePickerProps {
  value?: StudyLine | null;
  onChange?: (studyLine: StudyLine | null) => void;
  fontSize?: number;
}

export default function StudyLinePicker({ value = null, onChange, fontSize = 16 }: StudyLinePickerProps) {
  const [studyLines, setStudyLines] = useState<StudyLine[]>([]);

  // Fetch study lines on component mount
  useEffect(() => {
    getStudyLines()
      .then((response) => {
        const studylines: StudyLine[] = response.map((doc: any) => doc as StudyLine);
        setStudyLines(studylines);
      })
      .catch((error) => {
        console.error("Failed to fetch study lines:", error);
      });
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      const selectedName = event.target.value;
      if (selectedName === "") {
        onChange(null);
      } else {
        const selectedStudyLine = studyLines.find(sl => sl.name === selectedName);
        onChange(selectedStudyLine || null);
      }
    }
  };

  const arrowSize = Math.max(fontSize * 0.8, 12); // Arrow size scales with font size, minimum 12px
  const paddingRight = arrowSize + 8; // Dynamic padding based on arrow size
  
  // Calculate width based on current selection
  const currentText = value?.name || "Select study line";
  const estimatedWidth = currentText.length * (fontSize * 0.6) + paddingRight; // Rough character width estimation

  return (
    <select 
      value={value?.name || ""} 
      onChange={handleChange}
      style={{
        border: "none",
        background: "transparent",
        fontSize: `${fontSize}px`,
        fontWeight: "bold",
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
      <option value="">Select study line</option>
      {studyLines.map((sl) => (
        <option 
          key={(sl as any).id ?? sl.name} 
          value={sl.name}
        >
          {sl.name}
        </option>
      ))}
    </select>
  );
}