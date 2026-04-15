import { useEffect, useState } from 'react';
import { autorun } from 'mobx';
import './App.css';
import { createRootStore } from './store';

type PageToken = number | 'ellipsis';

const typeView: Record<string, { label: string; tone: 'hot' | 'cold' | 'neutral' }> = {
  HotWaterAreaMeter: { label: 'ГВС', tone: 'hot' },
  ColdWaterAreaMeter: { label: 'ХВС', tone: 'cold' },
};

const formatDate = (value: string): string => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU').format(date);
};

const buildPageTokens = (current: number, total: number): PageToken[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 'ellipsis', total - 1, total];
  }

  if (current >= total - 3) {
    return [1, 2, 'ellipsis', total - 3, total - 2, total - 1, total];
  }

  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
};

function App() {
  const [store] = useState(() => createRootStore());
  const [, forceRender] = useState(0);

  useEffect(() => {
    const disposer = autorun(() => {
      store.meters.length;
      store.addresses.size;
      store.offset;
      store.total;
      store.isLoading;
      store.error;
      store.deletingIds.length;
      forceRender((value) => value + 1);
    });

    return () => {
      disposer();
    };
  }, [store]);

  useEffect(() => {
    void store.fetchPage(0);
  }, [store]);

  const currentPage = Math.floor(store.offset / store.limit) + 1;
  const totalPages = store.total
    ? Math.max(1, Math.ceil(store.total / store.limit))
    : currentPage;
  const pageTokens = buildPageTokens(currentPage, totalPages);

  const onOpenPage = (page: number) => {
    void store.fetchPage((page - 1) * store.limit);
  };

  return (
    <main className="page">
      <section className="panel">
        <h1>Список счётчиков</h1>

        {store.error ? <div className="error">Ошибка: {store.error}</div> : null}

        <div className="tableWrap" aria-busy={store.isLoading}>
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Тип</th>
                <th>Дата установки</th>
                <th>Автоматический</th>
                <th>Текущие показания</th>
                <th>Адрес</th>
                <th>Примечание</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {store.meters.map((meter, index) => {
                const area = meter.areaId ? store.addresses.get(meter.areaId) : null;
                const address = area
                  ? area.fullAddress || '—'
                  : meter.areaId
                    ? 'Загрузка...'
                    : '—';
                const meterType = typeView[meter.type] ?? {
                  label: meter.type || '—',
                  tone: 'neutral' as const,
                };

                return (
                  <tr key={`${meter.id}-${index}`}>
                    <td>{store.offset + index + 1}</td>
                    <td>
                      <span className={`typeCell type-${meterType.tone}`}>
                        <span className="typeIcon" aria-hidden="true"></span>
                        {meterType.label}
                      </span>
                    </td>
                    <td>{formatDate(meter.installationDate)}</td>
                    <td>{meter.isAutomatic === null ? '—' : meter.isAutomatic ? 'да' : 'нет'}</td>
                    <td>{meter.initialValues || '—'}</td>
                    <td>{address}</td>
                    <td>{meter.description || '—'}</td>
                    <td className="actionsCell">
                      <button
                        type="button"
                        className="dangerButton"
                        onClick={() => void store.deleteMeter(meter.id)}
                        disabled={store.isDeleting(meter.id)}
                        aria-label="Удалить счётчик"
                        title="Удалить"
                      >
                        {store.isDeleting(meter.id) ? '...' : '🗑'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!store.isLoading && store.meters.length === 0 ? (
            <div className="empty">Нет данных для отображения</div>
          ) : null}
        </div>

        <nav className="pagination" aria-label="Пагинация счётчиков">
          {pageTokens.map((token, index) =>
            token === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="pageDots" aria-hidden="true">
                ...
              </span>
            ) : (
              <button
                key={token}
                type="button"
                onClick={() => onOpenPage(token)}
                className={token === currentPage ? 'pageButton isActive' : 'pageButton'}
                disabled={store.isLoading || token === currentPage}
              >
                {token}
              </button>
            ),
          )}
        </nav>
      </section>
    </main>
  );
}

export default App;
