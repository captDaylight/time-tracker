import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";

interface Props {
  days: string[];
  current: string;
  today: string;
  onSelect: (d: string) => void;
}

/** Day navigation: prev/next steppers + a Headless UI listbox of available dates. */
export function DayPicker({ days, current, today, onSelect }: Props) {
  const i = days.indexOf(current);
  const prev = () => i + 1 < days.length && onSelect(days[i + 1]);
  const next = () => i - 1 >= 0 && onSelect(days[i - 1]);
  const label = (d: string) => (d === today ? `${d} · Today` : d);

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={prev}
        disabled={i + 1 >= days.length}
        className="rounded-lg border border-ink-700 bg-ink-800 p-1.5 text-ink-300 transition hover:bg-ink-700 disabled:opacity-40"
        aria-label="Previous day"
      >
        <ChevronLeftIcon className="size-4" />
      </button>

      <Listbox value={current} onChange={onSelect}>
        <div className="relative">
          <ListboxButton className="flex w-52 items-center justify-between rounded-lg border border-ink-700 bg-ink-800 px-3 py-1.5 text-sm text-ink-100 transition hover:bg-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <span className="truncate">{label(current)}</span>
            <ChevronUpDownIcon className="size-4 shrink-0 text-ink-400" />
          </ListboxButton>
          <ListboxOptions
            anchor="bottom start"
            className="z-30 mt-1 max-h-72 w-52 overflow-auto rounded-xl border border-ink-700 bg-ink-850 p-1 shadow-2xl shadow-black/40 focus:outline-none [--anchor-gap:4px]"
          >
            {days.map((d) => (
              <ListboxOption
                key={d}
                value={d}
                className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-1.5 text-sm text-ink-300 data-[focus]:bg-ink-700 data-[focus]:text-ink-100"
              >
                <span>{label(d)}</span>
                <CheckIcon className="invisible size-4 text-brand-500 group-data-[selected]:visible data-[selected]:visible" />
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>

      <button
        onClick={next}
        disabled={i <= 0}
        className="rounded-lg border border-ink-700 bg-ink-800 p-1.5 text-ink-300 transition hover:bg-ink-700 disabled:opacity-40"
        aria-label="Next day"
      >
        <ChevronRightIcon className="size-4" />
      </button>

      {current !== today && (
        <button
          onClick={() => onSelect(today)}
          className="ml-1 rounded-lg border border-ink-700 bg-ink-800 px-3 py-1.5 text-sm text-ink-300 transition hover:bg-ink-700"
        >
          Today
        </button>
      )}
    </div>
  );
}
