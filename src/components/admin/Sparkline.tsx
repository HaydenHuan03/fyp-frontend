interface Props {
  values: number[];
  w?: number;
  h?: number;
  area?: boolean;
}

const Sparkline: React.FC<Props> = ({ values, w = 64, h = 22, area = false }) => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`);
  const line = 'M' + pts.join(' L');
  const areaPath = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg
      className={'spark' + (area ? ' area' : '')}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
    >
      {area && <path d={areaPath} />}
      <path d={line} />
    </svg>
  );
};

export default Sparkline;
