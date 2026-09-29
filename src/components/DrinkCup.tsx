import { useState } from "react";
import { DRINK_CUP_CL, DRINK_FILL_LINE_CL, DrinkPour } from "../types/drinkRecipe";
import "./DrinkCup.css";

// Drawing coordinates of the plastic cup, shared by the SVG outline and the liquid layers.
const viewWidth = 240;
const viewHeight = 270;
const rimY = 20;
const baseY = 260;
const rimLeft = 20;
const rimRight = 180;
const baseLeft = 45;
const baseRight = 155;
const innerHeight = baseY - rimY;
const rimWidth = rimRight - rimLeft;

const percent = (value: number, total: number) => `${(value / total) * 100}%`;

// The liquid is clipped to the cup's tapered inside. Heights stay linear in cl, which reads
// better than true volume for a cup this shape.
const liquidClip = `polygon(0 0, 100% 0, ${percent(baseRight - rimLeft, rimWidth)} 100%, ${percent(
  baseLeft - rimLeft,
  rimWidth
)} 100%)`;

const yForCl = (cl: number) => baseY - (innerHeight * cl) / DRINK_CUP_CL;
const edgeInsetAt = (y: number) => ((y - rimY) / innerHeight) * (baseLeft - rimLeft);

type DrinkCupProps = {
  pours: DrinkPour[];
  /** Plays the pour animation when a layer is added. Off for static previews. */
  animate?: boolean;
  width?: number | string;
  showFillLine?: boolean;
};

export default function DrinkCup({
  pours,
  animate = true,
  width = "100%",
  showFillLine = true,
}: DrinkCupProps) {
  const levelCl = pours.reduce((sum, pour) => sum + pour.cl, 0);

  // A pour (or Forward putting one back) shows the stream; Back just removes the top layer.
  const [seenPours, setSeenPours] = useState(pours.length);
  const [streamKey, setStreamKey] = useState<number | null>(null);
  if (pours.length !== seenPours) {
    setSeenPours(pours.length);
    setStreamKey(animate && pours.length > seenPours ? pours.length : null);
  }

  const lastPour = pours[pours.length - 1];
  const fillLineY = yForCl(DRINK_FILL_LINE_CL);
  const fillLineInset = edgeInsetAt(fillLineY);
  const layerStarts = pours.map((_pour, index) =>
    pours.slice(0, index).reduce((sum, pour) => sum + pour.cl, 0)
  );

  return (
    <div
      role="img"
      aria-label={`Cup with ${Math.round(levelCl * 10) / 10} of ${DRINK_CUP_CL} cl poured`}
      style={{
        position: "relative",
        width,
        maxWidth: "100%",
        aspectRatio: `${viewWidth} / ${viewHeight}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: percent(rimLeft, viewWidth),
          top: percent(rimY, viewHeight),
          width: percent(rimWidth, viewWidth),
          height: percent(innerHeight, viewHeight),
          clipPath: liquidClip,
          background: "rgba(0, 0, 0, 0.03)",
        }}
      >
        {pours.map((pour, index) => (
          <div
            key={`${index}-${pour.ingredient.id}-${pour.amount}`}
            className={`drink-cup-layer${animate ? " drink-cup-layer--pour" : ""}`}
            style={{
              bottom: percent(layerStarts[index], DRINK_CUP_CL),
              height: percent(pour.cl, DRINK_CUP_CL),
              background: pour.ingredient.color,
            }}
          />
        ))}
      </div>

      {streamKey !== null && lastPour ? (
        <div
          key={streamKey}
          className="drink-cup-stream"
          style={{
            left: percent((rimLeft + rimRight) / 2, viewWidth),
            height: percent(yForCl(levelCl), viewHeight),
            background: lastPour.ingredient.color,
          }}
        />
      ) : null}

      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
        aria-hidden="true"
      >
        {showFillLine ? (
          <g>
            <line
              x1={rimLeft + fillLineInset}
              x2={rimRight - fillLineInset}
              y1={fillLineY}
              y2={fillLineY}
              stroke="#8c8c8c"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text x={rimRight + 6} y={fillLineY + 4} fontSize={12} fill="#8c8c8c">
              {DRINK_FILL_LINE_CL} cl
            </text>
            <text x={rimRight + 8} y={rimY + 4} fontSize={12} fill="#8c8c8c">
              {DRINK_CUP_CL} cl
            </text>
          </g>
        ) : null}
        <path
          d={`M${rimLeft} ${rimY} L${baseLeft} ${baseY} L${baseRight} ${baseY} L${rimRight} ${rimY}`}
          fill="none"
          stroke="#202020"
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <rect
          x={rimLeft - 5}
          y={rimY - 6}
          width={rimWidth + 10}
          height={8}
          rx={4}
          fill="#202020"
        />
        <path
          d={`M${rimLeft + 14} ${rimY + 14} L${baseLeft + 8} ${baseY - 12}`}
          stroke="rgba(255, 255, 255, 0.55)"
          strokeWidth={5}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
