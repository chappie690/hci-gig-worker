"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatSubscriptionPrice } from "@/lib/subscriptions";

export type SubscriptionPaymentMethod = {
  methodType: "Credit / Debit Card" | "Online Banking" | "E-Wallet";
  label: string;
  processedAt: string;
};

const processingSteps = [
  "Verifying payment option...",
  "Processing subscription...",
  "Activating plan...",
  "Generating receipt..."
];

export function SubscriptionPaymentModal({
  open,
  planName,
  planPrice,
  actionLabel,
  onClose,
  onComplete
}: {
  open: boolean;
  planName: string;
  planPrice: number;
  actionLabel: string;
  onClose: () => void;
  onComplete: (payment: SubscriptionPaymentMethod) => void;
}) {
  const [methodType, setMethodType] = useState<SubscriptionPaymentMethod["methodType"]>("Credit / Debit Card");
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [bank, setBank] = useState("");
  const [wallet, setWallet] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [success, setSuccess] = useState(false);

  const paymentLabel = useMemo(() => {
    if (methodType === "Credit / Debit Card") {
      const digits = cardNumber.replace(/\D/g, "");
      return digits.length >= 4 ? `card ending ${digits.slice(-4)}` : "card payment";
    }

    if (methodType === "Online Banking") {
      return bank || "online banking";
    }

    return wallet || "e-wallet";
  }, [bank, cardNumber, methodType, wallet]);

  if (!open) {
    return null;
  }

  function closeModal() {
    setProcessing(false);
    setStepIndex(0);
    setSuccess(false);
    setError("");
    onClose();
  }

  function validate() {
    if (methodType === "Credit / Debit Card") {
      const digits = cardNumber.replace(/\D/g, "");
      if (!cardholder.trim()) return "Enter the mock cardholder name.";
      if (digits.length < 12) return "Enter a mock card number with at least 12 digits.";
      if (!/^\d{2}\/\d{2}$/.test(expiry.trim())) return "Use MM/YY for the mock expiry date.";
      if (!/^\d{3,4}$/.test(cvv.trim())) return "Enter a 3 or 4 digit mock CVV.";
    }

    if (methodType === "Online Banking" && !bank) {
      return "Choose a mock bank.";
    }

    if (methodType === "E-Wallet" && !wallet) {
      return "Choose a mock e-wallet.";
    }

    return "";
  }

  function startProcessing() {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setProcessing(true);
    setSuccess(false);
    setStepIndex(0);

    processingSteps.forEach((_, index) => {
      window.setTimeout(() => setStepIndex(index), index * 650);
    });

    window.setTimeout(() => {
      onComplete({
        methodType,
        label: paymentLabel,
        processedAt: new Date().toISOString()
      });
      setProcessing(false);
      setSuccess(true);
    }, processingSteps.length * 650 + 250);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4 py-6 backdrop-blur" role="dialog" aria-modal="true" aria-label="Mock subscription payment">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">Mock subscription payment</p>
            <h2 className="mt-2 text-2xl font-black">{actionLabel}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Selected plan: <strong>{planName}</strong> at <strong>{formatSubscriptionPrice(planPrice)}</strong>. This is a local demo payment; no real money is processed.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            disabled={processing}
            onClick={closeModal}
          >
            Close
          </button>
        </div>

        {!success ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {(["Credit / Debit Card", "Online Banking", "E-Wallet"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${
                    methodType === method
                      ? "border-blue-400 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-100"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                  onClick={() => setMethodType(method)}
                  disabled={processing}
                >
                  {method}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              {methodType === "Credit / Debit Card" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <PaymentInput label="Cardholder name" value={cardholder} onChange={setCardholder} disabled={processing} placeholder="Demo Learner" />
                  <PaymentInput label="Card number" value={cardNumber} onChange={setCardNumber} disabled={processing} placeholder="4242 4242 4242 4242" inputMode="numeric" />
                  <PaymentInput label="Expiry date" value={expiry} onChange={setExpiry} disabled={processing} placeholder="MM/YY" />
                  <PaymentInput label="CVV" value={cvv} onChange={setCvv} disabled={processing} placeholder="123" inputMode="numeric" />
                </div>
              ) : null}

              {methodType === "Online Banking" ? (
                <PaymentSelect label="Mock bank" value={bank} onChange={setBank} disabled={processing} options={["SkillBank Online", "Campus Bank", "Creator Finance", "Demo National Bank"]} />
              ) : null}

              {methodType === "E-Wallet" ? (
                <PaymentSelect label="Mock wallet" value={wallet} onChange={setWallet} disabled={processing} options={["SkillWallet", "DemoPay", "Creator Wallet", "Campus E-Wallet"]} />
              ) : null}
            </div>

            {processing ? (
              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800 dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-100" aria-live="polite">
                <span>{processingSteps[stepIndex]}</span>
                <span className="ml-2 inline-flex gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.24s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.12s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
                </span>
              </div>
            ) : null}

            {error ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={startProcessing} disabled={processing}>
                {processing ? "Processing..." : "Confirm mock payment"}
              </Button>
              <Button type="button" variant="secondary" onClick={closeModal} disabled={processing}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/35">
            <p className="text-lg font-black text-emerald-900 dark:text-emerald-100">Subscription activated successfully.</p>
            <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
              Payment option: {methodType} ({paymentLabel}). Your dashboard subscription card has been updated and a mock receipt was generated.
            </p>
            <Button type="button" className="mt-4" onClick={closeModal}>
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentInput({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  inputMode
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
      {label}
      <input
        className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-950"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={inputMode}
      />
    </label>
  );
}

function PaymentSelect({
  label,
  value,
  onChange,
  disabled,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  options: string[];
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
      {label}
      <select
        className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-950"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">Select option</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
