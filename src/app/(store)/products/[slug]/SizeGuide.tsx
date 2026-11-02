"use client";

import { useRef } from "react";

const rows = [
  ["XS", "84-88", "66-70", "88-92"],
  ["S", "88-94", "70-76", "92-98"],
  ["M", "94-100", "76-82", "98-104"],
  ["L", "100-106", "82-88", "104-110"],
  ["XL", "106-112", "88-94", "110-116"],
];

export function SizeGuide() {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="text-sm underline underline-offset-4"
      >
        Size guide
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="size-guide-title"
        // Clicking the backdrop closes it
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        className="bg-paper text-ink backdrop:bg-ink/40 m-auto w-[calc(100%-2rem)] max-w-md"
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 id="size-guide-title" className="text-lg font-semibold">
              Size guide
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="font-mono text-xs tracking-wide"
            >
              CLOSE
            </button>
          </div>
          <p className="text-muted mt-1 text-sm">Body measurements in cm.</p>
          <table className="mt-5 w-full text-left text-sm">
            <thead>
              <tr className="border-ink border-b font-mono text-xs">
                <th className="py-2 font-normal">Size</th>
                <th className="py-2 font-normal">Chest</th>
                <th className="py-2 font-normal">Waist</th>
                <th className="py-2 font-normal">Hips</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([size, ...cells]) => (
                <tr key={size} className="border-line border-b">
                  <th scope="row" className="py-2.5 font-mono font-normal">
                    {size}
                  </th>
                  {cells.map((cell, i) => (
                    <td key={i} className="py-2.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </dialog>
    </>
  );
}
