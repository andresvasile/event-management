"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EventType } from "@/lib/domain";
import { createEventType, deleteEventType, toggleEventType, updateEventType } from "./actions";

type EventTypesManagerProps = {
  initialEventTypes: EventType[];
};

export function EventTypesManager({ initialEventTypes }: EventTypesManagerProps) {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState(initialEventTypes);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEventTypes(initialEventTypes);
  }, [initialEventTypes]);

  async function addEventType() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    setIsSaving(true);
    await createEventType(trimmedName);
    setName("");
    router.refresh();
    setIsSaving(false);
  }

  function startEdit(eventType: EventType) {
    setEditingId(eventType.id);
    setEditingName(eventType.name);
  }

  async function saveEdit() {
    const trimmedName = editingName.trim();

    if (!editingId || !trimmedName) {
      return;
    }

    setIsSaving(true);
    await updateEventType(editingId, trimmedName);
    setEventTypes((current) => current.map((item) => (item.id === editingId ? { ...item, name: trimmedName } : item)));
    setEditingId(null);
    setEditingName("");
    router.refresh();
    setIsSaving(false);
  }

  async function toggleActive(eventTypeId: string) {
    setIsSaving(true);
    await toggleEventType(eventTypeId);
    setEventTypes((current) => current.map((item) => (item.id === eventTypeId ? { ...item, active: !item.active } : item)));
    router.refresh();
    setIsSaving(false);
  }

  async function removeEventType(eventTypeId: string) {
    setIsSaving(true);
    await deleteEventType(eventTypeId);
    setEventTypes((current) => current.filter((item) => item.id !== eventTypeId));
    router.refresh();
    setIsSaving(false);
  }

  return (
    <section className="grid columns2">
      <article className="panel">
        <div className="panelHeader">
          <h2>Tipos cargados</h2>
        </div>
        <div className="tableWrap">
          <table className="responsiveTable">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {eventTypes.map((eventType) => (
                <tr key={eventType.id}>
                  <td data-label="Nombre">
                    {editingId === eventType.id ? (
                      <input aria-label="Nombre del tipo" onChange={(event) => setEditingName(event.target.value)} value={editingName} />
                    ) : (
                      eventType.name
                    )}
                  </td>
                  <td data-label="Estado">{eventType.active ? "Activo" : "Inactivo"}</td>
                  <td className="buttonRow" data-label="Acciones">
                    {editingId === eventType.id ? (
                      <button className="button primary" disabled={isSaving} onClick={saveEdit} type="button">
                        Guardar
                      </button>
                    ) : (
                      <button className="button" disabled={isSaving} onClick={() => startEdit(eventType)} type="button">
                        Editar
                      </button>
                    )}
                    <button className="button" disabled={isSaving} onClick={() => toggleActive(eventType.id)} type="button">
                      {eventType.active ? "Desactivar" : "Activar"}
                    </button>
                    <button className="button" disabled={isSaving} onClick={() => removeEventType(eventType.id)} type="button">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <aside className="panel">
        <div className="panelHeader">
          <h2>Agregar tipo</h2>
        </div>
        <div className="panelBody grid">
          <div className="field">
            <label htmlFor="eventTypeName">Nombre</label>
            <input id="eventTypeName" onChange={(event) => setName(event.target.value)} placeholder="Ej: Bautismo" value={name} />
          </div>
          <button className="button primary" disabled={isSaving} onClick={addEventType} type="button">
            Agregar tipo
          </button>
          <p className="muted">Los cambios se guardan en la base de datos. Si un tipo ya fue usado por eventos, eliminarlo lo deja inactivo.</p>
        </div>
      </aside>
    </section>
  );
}
