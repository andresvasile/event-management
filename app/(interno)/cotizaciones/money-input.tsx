"use client";

import { useState } from "react";

type MoneyInputProps = {
  id?: string;
  name: string;
  placeholder?: string;
  defaultValue?: number;
};

function formatMoneyInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Number(digits));
}

export function MoneyInput({ id, name, placeholder, defaultValue }: MoneyInputProps) {
  const [value, setValue] = useState(defaultValue === undefined ? "" : formatMoneyInput(String(defaultValue)));

  return (
    <input
      id={id}
      inputMode="numeric"
      name={name}
      onChange={(event) => {
        const formattedValue = formatMoneyInput(event.target.value);

        setValue(formattedValue);
      }}
      placeholder={placeholder}
      value={value}
    />
  );
}
