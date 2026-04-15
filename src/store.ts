import { flow, types } from 'mobx-state-tree';
import type { Instance, SnapshotIn } from 'mobx-state-tree';
import {
  deleteMeterRequest,
  fetchAreasByIds,
  fetchMeters,
} from './api';
import type { AreaItem, MeterItem } from './api';

const MeterModel = types.model('MeterModel', {
  id: types.identifier,
  type: types.string,
  areaId: types.maybeNull(types.string),
  installationDate: types.string,
  isAutomatic: types.maybeNull(types.boolean),
  initialValues: types.string,
  description: types.string,
});

const AreaModel = types
  .model('AreaModel', {
    id: types.identifier,
    street: types.string,
    house: types.string,
    flat: types.string,
  })
  .views((self) => ({
    get fullAddress(): string {
      return [self.street, self.house, self.flat ? `кв. ${self.flat}` : '']
        .filter(Boolean)
        .join(', ');
    },
  }));

const normalizeMeterSnapshot = (item: MeterItem): SnapshotIn<typeof MeterModel> => ({
  id: item.id,
  type: item.type,
  areaId: item.areaId ?? null,
  installationDate: item.installationDate,
  isAutomatic: item.isAutomatic ?? null,
  initialValues: item.initialValues,
  description: item.description,
});

const normalizeAreaSnapshot = (item: AreaItem): SnapshotIn<typeof AreaModel> => ({
  id: item.id,
  street: item.street,
  house: item.house,
  flat: item.flat,
});

export const RootStore = types
  .model('RootStore', {
    meters: types.array(MeterModel),
    addresses: types.map(AreaModel),
    deletingIds: types.array(types.string),
    offset: types.optional(types.number, 0),
    limit: types.optional(types.number, 20),
    total: types.maybeNull(types.number),
    isLoading: types.optional(types.boolean, false),
    error: types.optional(types.string, ''),
  })
  .views((self) => ({
    get hasMore(): boolean {
      if (typeof self.total === 'number') {
        return self.offset + self.limit < self.total;
      }

      return self.meters.length === self.limit;
    },
    isDeleting(meterId: string): boolean {
      return self.deletingIds.includes(meterId);
    },
  }))
  .actions((self) => {
    const setError = (value: string) => {
      self.error = value;
    };

    const loadAddresses = flow(function* loadAddresses() {
      const unknownAreaIds = self.meters
        .map((meter) => meter.areaId)
        .filter((areaId): areaId is string => areaId !== null)
        .filter((areaId, index, source) => source.indexOf(areaId) === index)
        .filter((areaId) => !self.addresses.has(areaId));

      if (unknownAreaIds.length === 0) {
        return;
      }

      const areas: AreaItem[] = yield fetchAreasByIds(unknownAreaIds);

      areas.forEach((area) => {
        self.addresses.set(area.id, normalizeAreaSnapshot(area));
      });
    });

    const fetchPage = flow(function* fetchPage(offset = self.offset) {
      self.isLoading = true;
      setError('');

      try {
        const response: { items: MeterItem[]; total: number | null } =
          yield fetchMeters(self.limit, offset);

        self.offset = offset;
        self.total = response.total;
        self.meters.replace(response.items.map((item) => MeterModel.create(normalizeMeterSnapshot(item))));
        yield loadAddresses();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Не удалось получить данные счётчиков';

        setError(message);
      } finally {
        self.isLoading = false;
      }
    });

    const deleteMeter = flow(function* deleteMeter(meterId: string) {
      if (self.deletingIds.includes(meterId)) {
        return;
      }

      self.deletingIds.push(meterId);
      setError('');

      try {
        yield deleteMeterRequest(meterId);
        yield fetchPage(self.offset);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Не удалось удалить счётчик';

        setError(message);
      } finally {
        self.deletingIds.replace(self.deletingIds.filter((id) => id !== meterId));
      }
    });

    return {
      fetchPage,
      deleteMeter,
    };
  });

export type RootStoreInstance = Instance<typeof RootStore>;

export const createRootStore = (): RootStoreInstance =>
  RootStore.create({
    meters: [],
    addresses: {},
    deletingIds: [],
    total: null,
  });
