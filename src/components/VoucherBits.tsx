import { motion } from "motion/react";
import { Smartphone } from "lucide-react";
import { soles } from "@/lib/mock-data";
import { voucherClass, voucherLabel, type Voucher } from "@/lib/app-state";
import { cn } from "@/lib/utils";

export function VoucherBadge({ status, className }: { status: Voucher["status"]; className?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        voucherClass[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      Comprobante: {voucherLabel[status]}
    </motion.span>
  );
}

export function VoucherReceipt({ voucher }: { voucher: Voucher }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-border bg-muted/40"
    >
      {voucher.imageUrl ? (
        <img
          src={voucher.imageUrl}
          alt="Comprobante de pago adjunto"
          className="max-h-64 w-full object-contain"
        />
      ) : (
        <div className="p-5 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Smartphone className="size-5" />
          </span>
          <p className="mt-2 font-display text-lg font-semibold capitalize">{voucher.method}</p>
          <p className="text-xs text-muted-foreground">Captura adjunta por el paciente</p>
        </div>
      )}
      <dl className="grid gap-1.5 border-t border-border p-4 text-xs">
        <Line label="Operación" value={voucher.reference} />
        <Line label="Monto" value={soles(voucher.amount)} />
        <Line label="Enviado" value={voucher.uploadedAt} />
        <Line label="Intento" value={`${voucher.attempt}`} />
      </dl>
    </motion.div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
