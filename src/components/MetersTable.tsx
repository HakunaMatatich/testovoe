import { formatDate, typeView } from '../app';
import type { RootStoreInstance } from '../store';

interface MetersTableProps {
  store: RootStoreInstance;
}

export const MetersTable = ({ store }: MetersTableProps) => {
  return (
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
            const area = meter.areaId
              ? store.addresses.get(meter.areaId)
              : null;
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
              <tr key={meter.id}>
                <td>{store.offset + index + 1}</td>
                <td>
                  <span className={`typeCell type-${meterType.tone}`}>
                    <span className="typeIcon" aria-hidden="true"></span>
                    {meterType.label}
                  </span>
                </td>
                <td>{formatDate(meter.installationDate)}</td>
                <td>
                  {meter.isAutomatic === null
                    ? '—'
                    : meter.isAutomatic
                      ? 'да'
                      : 'нет'}
                </td>
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
  );
};
