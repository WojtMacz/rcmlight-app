import type { BarSlice } from './summaryUtils';

interface Props {
  data: BarSlice[];
  height?: number;
  barWidth?: number;
}

export function BarChart({ data, height = 100, barWidth = 48 }: Props) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const gap = 12;
  const paddingTop = 16;
  const labelHeight = 30;
  const svgWidth = data.length * (barWidth + gap) - gap;
  const svgHeight = height + paddingTop + labelHeight;

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="overflow-visible"
    >
      {data.map((d, i) => {
        const barH = (d.value / max) * height;
        const x = i * (barWidth + gap);
        const y = paddingTop + height - barH;
        // Label might have newline
        const lines = d.label.split('\n');
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barH} fill={d.color} rx="3" />
            {/* Value above bar */}
            <text
              x={x + barWidth / 2}
              y={y - 4}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="currentColor"
              className="fill-foreground"
            >
              {d.value}
            </text>
            {/* Label below */}
            {lines.map((line, li) => (
              <text
                key={li}
                x={x + barWidth / 2}
                y={paddingTop + height + 14 + li * 13}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
                className="fill-muted-foreground"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
