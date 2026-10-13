import { formatCurrency } from "@/lib/domain";
import { getServices } from "@/lib/data";
import { createService } from "./actions";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Servicios</h1>
          <p>Servicios configurables para armar cotizaciones. El alquiler del salón es obligatorio.</p>
        </div>
        <a className="button primary" href="#nuevo-servicio">
          Nuevo servicio
        </a>
      </header>

      <section className="panel" id="nuevo-servicio" style={{ marginBottom: 16 }}>
        <div className="panelHeader">
          <h2>Nuevo servicio</h2>
        </div>
        <form action={createService} className="panelBody formGrid">
          <div className="field">
            <label htmlFor="name">Nombre</label>
            <input id="name" name="name" placeholder="Ej: Seguridad" />
          </div>
          <div className="field">
            <label htmlFor="basePrice">Precio base</label>
            <input id="basePrice" min="0" name="basePrice" placeholder="Opcional" type="number" />
          </div>
          <div className="formActions">
            <button className="button primary" type="submit">
              Guardar servicio
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="tableWrap">
          <table className="responsiveTable">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Precio base</th>
                <th>Estado</th>
                <th>Uso</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td data-label="Servicio">{service.name}</td>
                  <td data-label="Precio base">{service.basePrice ? formatCurrency(service.basePrice) : "Sin precio base"}</td>
                  <td data-label="Estado">{service.active ? "Activo" : "Inactivo"}</td>
                  <td data-label="Uso">{service.required ? "Obligatorio en toda cotización" : "Opcional"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
