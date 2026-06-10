import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api, type Shot } from "@/api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Props {
  shots: Shot[];
  index: number;
  onClose: () => void;
  onStep: (delta: number) => void;
}

/** Full-screen screenshot viewer with keyboard navigation, built on the Dialog primitive. */
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
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="flex max-h-[92vh] max-w-[94vw] flex-col items-center border-none bg-transparent p-0 shadow-none"
        showCloseButton
      >
        <DialogTitle className="sr-only">Screenshot viewer</DialogTitle>
        <img
          src={api.shotUrl(shot.file)}
          alt={`Screenshot at ${shot.label}`}
          className="max-h-[84vh] max-w-[92vw] rounded-xl border border-ink-700 shadow-2xl"
        />
        <div className="mt-3 text-sm text-ink-300">
          {shot.label}
          {shot.display ? ` · monitor ${shot.display + 1}` : ""} · {index + 1}/{shots.length}
        </div>

        {shots.length > 1 && (
          <>
            <button
              onClick={() => onStep(-1)}
              className="fixed top-1/2 left-4 -translate-y-1/2 rounded-full bg-ink-800/80 p-2 text-ink-100 transition hover:bg-ink-700"
              aria-label="Previous screenshot"
            >
              <ChevronLeft className="size-7" />
            </button>
            <button
              onClick={() => onStep(1)}
              className="fixed top-1/2 right-4 -translate-y-1/2 rounded-full bg-ink-800/80 p-2 text-ink-100 transition hover:bg-ink-700"
              aria-label="Next screenshot"
            >
              <ChevronRight className="size-7" />
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
