import { buildPageTokens } from '../app';

interface MetersPaginationProps {
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  onOpenPage: (page: number) => void;
}

export const MetersPagination = ({
  currentPage,
  totalPages,
  isLoading,
  onOpenPage,
}: MetersPaginationProps) => {
  const pageTokens = buildPageTokens(currentPage, totalPages);

  return (
    <nav className="pagination" aria-label="Пагинация счётчиков">
      {pageTokens.map((token, index) =>
        token === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="pageDots"
            aria-hidden="true"
          >
            ...
          </span>
        ) : (
          <button
            key={token}
            type="button"
            onClick={() => onOpenPage(token)}
            className={
              token === currentPage ? 'pageButton isActive' : 'pageButton'
            }
            disabled={isLoading || token === currentPage}
          >
            {token}
          </button>
        )
      )}
    </nav>
  );
};
