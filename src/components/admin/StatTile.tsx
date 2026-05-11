import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import Sparkline from './Sparkline';

interface Props {
  label: string;
  value: number | string;
  unit?: string;
  delta?: string;
  dir?: 'up' | 'down' | 'flat';
  period?: string;
  spark?: number[];
  danger?: boolean;
}

const StatTile: React.FC<Props> = ({
  label, value, unit, delta, dir = 'flat', period, spark, danger,
}) => {
  const DirIcon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus;
  const dirClass = dir === 'up' ? 'stat__delta--up' : dir === 'down' ? 'stat__delta--down' : '';
  const effectiveClass = danger && dir === 'up' ? 'stat__delta--down' : dirClass;

  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">
        {value}{unit && <span className="unit">{unit}</span>}
      </span>
      {delta !== undefined && (
        <span className={`stat__delta ${effectiveClass}`}>
          <DirIcon size={12} strokeWidth={2} />
          <span>{delta}</span>
          {period && <span style={{ color: 'var(--ink-3)' }}>· {period}</span>}
        </span>
      )}
      {spark && <div className="stat__spark"><Sparkline values={spark} area /></div>}
    </div>
  );
};

export default StatTile;
