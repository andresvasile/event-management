"use client";

import { useState } from "react";
import type { Service } from "@/lib/domain";
import { formatCurrency } from "@/lib/domain";

type QuoteItemsEditorProps = {
  optionalServices: Service[];
  requiredService?: Service;
};

type OptionalItemState = {
  selected: boolean;
  quantity: string;
  unitPrice: string;
};

function formatMoneyInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Number(digits));
}

function parseMoney(value: string) {
  return Number(value.replace(/\./g, "")) || 0;
}

function initialMoney(value?: number) {
  return formatMoneyInput(String(value ?? 0));
}

export function QuoteItemsEditor({ optionalServices, requiredService }: QuoteItemsEditorProps) {
  const [requiredUnitPrice, setRequiredUnitPrice] = useState(initialMoney(requiredService?.basePrice));
  const [optionalItems, setOptionalItems] = useState<Record<string, OptionalItemState>>(() =>
    Object.fromEntries(
      optionalServices.map((service) => [
        service.id,
        {
          selected: false,
          quantity: "1",
          unitPrice: initialMoney(service.basePrice),
        },
      ]),
    ),
  );

  const total =
    parseMoney(requiredUnitPrice) +
    optionalServices.reduce((sum, service) => {
      const item = optionalItems[service.id];

      if (!item?.selected) {
        return sum;
      }

      return sum + (Number(item.quantity) || 0) * parseMoney(item.unitPrice);
    }, 0);

  function updateOptionalItem(serviceId: string, value: Partial<OptionalItemState>) {
    setOptionalItems((current) => ({
      ...current,
      [serviceId]: {
        ...current[serviceId],
        ...value,
      },
    }));
  }

  return (
    <div className="quoteServicesList">
      <div className="quoteServiceHeader" aria-hidden="true">
        <span>Servicio</span>
        <span>Uso</span>
        <span>Cantidad</span>
        <span>Precio</span>
        <span>Base</span>
      </div>
      {requiredService ? (
        <div className="quoteServiceRow">
          <strong>{requiredService.name}</strong>
          <span className="checkCell">
            <input checked readOnly aria-label="Incluido" type="checkbox" />
          </span>
          <label>
            <span className="mobileOnly">Cantidad</span>
            <input disabled type="number" value={1} />
          </label>
          <label>
            <span className="mobileOnly">Precio</span>
            <input
              inputMode="numeric"
              name="requiredUnitPrice"
              onChange={(event) => setRequiredUnitPrice(formatMoneyInput(event.target.value))}
              value={requiredUnitPrice}
            />
          </label>
          <span className="muted basePriceCell">{requiredService.basePrice ? formatCurrency(requiredService.basePrice) : "sin precio"}</span>
        </div>
      ) : (
        <div className="warningBox">Configurá un servicio obligatorio antes de crear cotizaciones.</div>
      )}
      {optionalServices.length > 0 ? (
        optionalServices.map((service) => {
          const item = optionalItems[service.id];

          return (
            <div className="quoteServiceRow" key={service.id}>
              <strong>{service.name}</strong>
              <label className="checkCell">
                <input
                  checked={item?.selected ?? false}
                  name="serviceIds"
                  onChange={(event) => updateOptionalItem(service.id, { selected: event.target.checked })}
                  type="checkbox"
                  value={service.id}
                />
              </label>
              <label>
                <span className="mobileOnly">Cantidad</span>
                <input
                  min="1"
                  name={`quantity:${service.id}`}
                  onChange={(event) => updateOptionalItem(service.id, { quantity: event.target.value })}
                  type="number"
                  value={item?.quantity ?? "1"}
                />
              </label>
              <label>
                <span className="mobileOnly">Precio</span>
                <input
                  inputMode="numeric"
                  name={`unitPrice:${service.id}`}
                  onChange={(event) => updateOptionalItem(service.id, { unitPrice: formatMoneyInput(event.target.value) })}
                  value={item?.unitPrice ?? "0"}
                />
              </label>
              <span className="muted basePriceCell">{service.basePrice ? formatCurrency(service.basePrice) : "sin precio"}</span>
            </div>
          );
        })
      ) : (
        <p className="muted serviceEmptyState">No hay servicios adicionales activos.</p>
      )}
      <div className="quoteTotalizer">
        <span>Total cotizado</span>
        <strong>{formatCurrency(total)}</strong>
      </div>
    </div>
  );
}
