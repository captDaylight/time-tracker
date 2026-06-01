import { Dialog, DialogPanel } from "@headlessui/react";
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";
import { api, type Shot } from "../api";

interface Props {
  shots: Shot[];
  index: number;
  onClose: () => void;
  onStep: (delta: number) => void;
}

/** Full-screen screenshot viewer with keyboard navigation, built on Headless UI Dialog. */
export function Lightbox({ shots, index, onClose, onStep }: Props) {
  const shot = shots[index];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onStep(-1);
      if (e.key === "ArrowRight") onStep(1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onStep]);

  if (!shot) return null;

  return (
    <Dialog open onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="relative flex max-h-full max-w-full flex-col items-center">
          <img
            src={api.shotUrl(shot.file)}
            alt={`Screenshot at ${shot.label}`}
            className="max-h-[84vh] max-w-[92vw] rounded-xl border border-ink-700 shadow-2xl"
          />
          <div className="mt-3 text-sm text-ink-300">
            {shot.label}
            {shot.display ? ` · monitor ${shot.display + 1}` : ""} · {index + 1}/{shots.length}
          </div>
        </DialogPanel>
      </div>

      <button
        onClick={onClose}
        className="fixed right-5 top-5 rounded-full bg-ink-800/80 p-2 text-ink-100 transition hover:bg-ink-700"
        aria-label="Close"
      >
        <XMarkIcon className="size-6" />
      </button>
      {shots.length > 1 && (
        <>
          <button
            onClick={() => onStep(-1)}
            className="fixed left-4 top-1/2 -translate-y-1/2 rounded-full bg-ink-800/80 p-2 text-ink-100 transition hover:bg-ink-700"
            aria-label="Previous screenshot"
          >
            <ChevronLeftIcon className="size-7" />
          </button>
          <button
            onClick={() => onStep(1)}
            className="fixed right-4 top-1/2 -translate-y-1/2 rounded-full bg-ink-800/80 p-2 text-ink-100 transition hover:bg-ink-700"
            aria-label="Next screenshot"
          >
            <ChevronRightIcon className="size-7" />
          </button>
        </>
      )}
    </Dialog>
  );
}
