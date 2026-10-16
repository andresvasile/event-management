import Link from "next/link";

type PaginationProps = {
  page: number;
  pageParam: string;
  pageSize: number;
  pathname: string;
  searchParams?: Record<string, string | undefined>;
  totalItems: number;
};

export function Pagination({ page, pageParam, pageSize, pathname, searchParams = {}, totalItems }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= pageSize) return null;

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set(pageParam, String(targetPage));

    return `${pathname}?${params.toString()}`;
  }

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <nav aria-label="Paginación" className="pagination">
      <span>{firstItem}-{lastItem} de {totalItems}</span>
      <div className="buttonRow">
        {page > 1 ? <Link className="button" href={pageHref(page - 1)}>Anterior</Link> : <span className="button isDisabled">Anterior</span>}
        <strong>Página {page} de {totalPages}</strong>
        {page < totalPages ? <Link className="button" href={pageHref(page + 1)}>Siguiente</Link> : <span className="button isDisabled">Siguiente</span>}
      </div>
    </nav>
  );
}
