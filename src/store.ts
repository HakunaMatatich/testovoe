import { applySnapshot, flow, types } from 'mobx-state-tree';
import type { Instance, SnapshotIn } from 'mobx-state-tree';
import { deleteMeterRequest, fetchAreasByIds, fetchMeters } from './api';
import type { AreaItem, MeterItem } from './api';

const MeterModel = types.model('MeterModel', {
  id: types.string,
  type: types.string,
  areaId: types.maybeNull(types.string),
  installationDate: types.string,
  isAutomatic: types.maybeNull(types.boolean),
  initialValues: types.string,
  description: types.string,
});

const AreaModel = types
  .model('AreaModel', {
    id: types.string,
    street: types.string,
    house: types.string,
    flat: types.string,
    rawFullAddress: types.string,
  })
  .views((self) => ({
    get fullAddress(): string {
      if (self.street && !self.house && !self.flat) {
        return self.street;
      }

      if (!self.street && !self.house && !self.flat && self.rawFullAddress) {
        return self.rawFullAddress;
      }

      return [self.street, self.house, self.flat ? `кв. ${self.flat}` : '']
        .filter(Boolean)
        .join(', ');
    },
  }));

const normalizeMeterSnapshot = (
  item: MeterItem
): SnapshotIn<typeof MeterModel> => ({
  id: item.id,
  type: item.type,
  areaId: item.areaId ?? null,
  installationDate: item.installationDate,
  isAutomatic: item.isAutomatic ?? null,
  initialValues: item.initialValues,
  description: item.description,
});

const normalizeAreaSnapshot = (
  item: AreaItem
): SnapshotIn<typeof AreaModel> => ({
  id: item.id,
  street: item.street,
  house: item.house,
  flat: item.flat,
  rawFullAddress: item.fullAddress,
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
    let fetchVersion = 0;
    let currentFetchController: AbortController | null = null;

    const setError = (value: string) => {
      self.error = value;
    };

    const isAbortError = (error: unknown): boolean =>
      error instanceof DOMException && error.name === 'AbortError';

    const loadAddresses = flow(function* loadAddresses(
      version: number,
      signal?: AbortSignal
    ) {
      const unknownAreaIds = self.meters
        .map((meter) => meter.areaId)
        .filter((areaId): areaId is string => areaId !== null)
        .filter((areaId, index, source) => source.indexOf(areaId) === index)
        .filter((areaId) => !self.addresses.has(areaId));

      if (unknownAreaIds.length === 0) {
        return;
      }

      const areas: AreaItem[] = yield fetchAreasByIds(unknownAreaIds, signal);

      if (version !== fetchVersion) {
        return;
      }

      areas.forEach((area) => {
        self.addresses.set(area.id, normalizeAreaSnapshot(area));
      });
    });

    const fetchPage = flow(function* fetchPage(offset = self.offset) {
      const version = ++fetchVersion;
      currentFetchController?.abort();
      currentFetchController = new AbortController();
      const { signal } = currentFetchController;

      self.isLoading = true;
      setError('');

      try {
        const response: { items: MeterItem[]; total: number | null } =
          yield fetchMeters(self.limit, offset, signal);

        if (version !== fetchVersion) {
          return;
        }

        self.offset = offset;
        self.total = response.total;

        applySnapshot(
          self.meters,
          response.items.map((item) => normalizeMeterSnapshot(item))
        );

        yield loadAddresses(version, signal);
      } catch (error) {
        if (version !== fetchVersion) {
          return;
        }

        if (isAbortError(error)) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'Не удалось получить данные счётчиков';

        setError(message);
      } finally {
        if (version === fetchVersion) {
          currentFetchController = null;
          self.isLoading = false;
        }
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

        // Keep page filled with 20 rows when there are enough records.
        // If we are on the tail page after delete and it has < limit rows,
        // move to the nearest previous full page.
        if (
          typeof self.total === 'number' &&
          self.total >= self.limit &&
          self.meters.length < self.limit
        ) {
          const previousFullOffset =
            Math.floor((self.total - self.limit) / self.limit) * self.limit;

          if (self.offset !== previousFullOffset) {
            yield fetchPage(previousFullOffset);
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Не удалось удалить счётчик';

        setError(message);
      } finally {
        self.deletingIds.replace(
          self.deletingIds.filter((id) => id !== meterId)
        );
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
