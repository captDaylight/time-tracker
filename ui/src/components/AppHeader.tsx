import { Clock, Download, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DayPicker } from "@/components/DayPicker";

interface Props {
  days: string[];
  current: string;
  today: string;
  onSelectDay: (d: string) => void;
  onExport: () => void;
  onOpenProjects: () => void;
}

/** Top bar for the day view: brand, CSV export, Projects link, and day navigation. */
export function AppHeader({ days, current, today, onSelectDay, onExport, onOpenProjects }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-xl bg-brand-600/15 text-brand-500 ring-1 ring-inset ring-brand-600/30">
          <Clock className="size-5" />
        </span>
        <h1 className="text-[17px] font-semibold tracking-tight">TimeTracker</h1>
      </div>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="icon" onClick={onExport} aria-label="Download CSV">
              <Download />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download CSV for this day</TooltipContent>
        </Tooltip>
        <Button variant="secondary" onClick={onOpenProjects}>
          <Folder /> Projects
        </Button>
        <DayPicker days={days} current={current} today={today} onSelect={onSelectDay} />
      </div>
    </div>
  );
}
