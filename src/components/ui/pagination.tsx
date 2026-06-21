import Link from "next/link";

export function Pagination({
  page,
  total,
  pageSize,
  path,
  query = {},
}: {
  page: number;
  total: number;
  pageSize: number;
  path: string;
  query?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (next: number) => {
    const params = new URLSearchParams(
      Object.entries({ ...query, page: String(next) }).filter(
        ([, value]) => value,
      ),
    );
    return `${path}?${params.toString()}`;
  };
  return (
    <nav className="pagination" aria-label="Пагінація">
      <span>
        Сторінка {page} з {pages}
      </span>
      {page > 1 && <Link href={href(page - 1)}>Назад</Link>}
      {page < pages && <Link href={href(page + 1)}>Далі</Link>}
    </nav>
  );
}
