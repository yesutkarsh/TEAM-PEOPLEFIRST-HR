import { useEffect, useRef, useState } from "react";
import { Button } from "@/lib/components/ui";
import type { FieldComponentProps } from "./types";

export function SignatureField({ value, onChange, disabled }: FieldComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const hasValue = typeof value === "string" && value.length > 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasValue) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = value as string;
  }, [hasValue, value]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    setDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    const { x, y } = getPos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0A0A0A";
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const onPointerUp = () => {
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };
  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={480}
        height={160}
        className="w-full max-w-full touch-none rounded-md border border-[#E5E5E3] bg-white"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      {!disabled && (
        <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={clear}>
          Clear signature
        </Button>
      )}
    </div>
  );
}
