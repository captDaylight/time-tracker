import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  days: string[];
  current: string;
  today: string;
  onSelect: (d: string) => void;
}

/** Day navigation: prev/next steppers + a select of available dates. */
export function DayPicker({ days, current, today, onSelect }: Props) {
  const i = days.indexOf(current);
  const prev = () => i + 1 < days.length && onSelect(days[i + 1]);
  const next = () => i - 1 >= 0 && onSelect(days[i - 1]);
  const label = (d: string) => (d === today ? `${d} · Today` : d);

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="secondary"
        size="icon"
        onClick={prev}
        disabled={i + 1 >= days.length}
        aria-label="Previous day"
      >
        <ChevronLeft />
      </Button>

      <Select value={current} onValueChange={onSelect}>
        <SelectTrigger className="w-52" aria-label="Select day">
          <SelectValue>{label(current)}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {days.map((d) => (
            <SelectItem key={d} value={d}>
              {label(d)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="secondary"
        size="icon"
        onClick={next}
        disabled={i <= 0}
        aria-label="Next day"
      >
        <ChevronRight />
      </Button>

      {current !== today && (
        <Button variant="secondary" className="ml-1" onClick={() => onSelect(today)}>
          Today
        </Button>
      )}
    </div>
  );
}
