export type MeterType = 'ColdWaterAreaMeter' | 'HotWaterAreaMeter' | string;

export interface MeterItem {
  id: string;
  type: MeterType;
  areaId: string | null;
  installationDate: string;
  isAutomatic: boolean | null;
  initialValues: string;
  description: string;
}

export interface AreaItem {
  id: string;
  street: string;
  house: string;
  flat: string;
  fullAddress: string;
}

interface MeterResponse {
  count?: number;
  results?: unknown[];
  data?: unknown[];
  items?: unknown[];
  meters?: unknown[];
  objects?: unknown[];
  response?: {
    results?: unknown[];
    data?: unknown[];
    items?: unknown[];
    meters?: unknown[];
    objects?: unknown[];
    count?: number;
    total?: number;
    total_count?: number;
  };
  total?: number;
  total_count?: number;
}

interface AreaResponse {
  results?: unknown[];
  data?: unknown[];
  items?: unknown[];
  areas?: unknown[];
  objects?: unknown[];
  response?: {
    results?: unknown[];
    data?: unknown[];
    items?: unknown[];
    areas?: unknown[];
    objects?: unknown[];
  };
}

const API_BASE = '/backend/api/v4/test';

const normalizeString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
};

const getByPath = (source: unknown, path: string): unknown => {
  if (!source || typeof source !== 'object') {
    return undefined;
  }

  const parts = path.split('.');
  let current: unknown = source;

  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
};

const pickFirstString = (source: unknown, paths: string[]): string => {
  for (const path of paths) {
    const value = normalizeString(getByPath(source, path));
    if (value) {
      return value;
    }
  }

  return '';
};

const normalizeInitialValues = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'number' || typeof entry === 'string') {
          return String(entry);
        }

        if (entry && typeof entry === 'object' && 'value' in entry) {
          return normalizeString((entry as { value?: unknown }).value);
        }

        return '';
      })
      .filter(Boolean)
      .join(', ');
  }

  return normalizeString(value);
};

const normalizeMeterType = (value: unknown): string => {
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string');
    return normalizeString(first);
  }

  return normalizeString(value);
};

const normalizeMeter = (raw: unknown): MeterItem => {
  const item = raw as Record<string, unknown>;
  const area = item.area as Record<string, unknown> | undefined;
  const areaId =
    normalizeString(item.area_id) ||
    normalizeString(area?.id) ||
    (typeof item.area === 'string' ? normalizeString(item.area) : '') ||
    null;

  return {
    id: normalizeString(item.id),
    type: normalizeMeterType(item.type || item._type || item.meter_type),
    areaId,
    installationDate: normalizeString(
      item.installation_date || item.install_date || item.created_at,
    ),
    isAutomatic:
      typeof item.is_automatic === 'boolean' ? item.is_automatic : null,
    initialValues: normalizeInitialValues(item.initial_values),
    description: normalizeString(item.description || item.note),
  };
};

const normalizeArea = (raw: unknown): AreaItem | null => {
  const item = raw as Record<string, unknown>;
  const id = normalizeString(item.id);

  if (!id) {
    return null;
  }

  const street = pickFirstString(item, [
    'street',
    'street_name',
    'street_title',
    'street.full_name',
    'street.title',
    'street.name',
    'address.street',
    'address.street_name',
    'city_with_type',
  ]);

  const house = pickFirstString(item, [
    'house',
    'house_number',
    'house_num',
    'building',
    'building_number',
    'home',
    'dom',
    'address.house',
    'address.house_number',
    'address.building',
    'house_data.number',
    'house_data.house_number',
  ]);

  const flat = pickFirstString(item, [
    'str_number_full',
    'str_number',
    'number',
    'flat',
    'flat_number',
    'apartment',
    'apartment_number',
    'room',
    'premise_number',
    'address.flat',
    'address.flat_number',
  ]);

  const fullAddress = pickFirstString(item, [
    'house.address',
    'full_address',
    'address',
    'short_address',
    'formatted_address',
    'address_text',
    'address.full',
    'fias.full_address',
  ]);

  const composedAddress = [fullAddress, flat]
    .filter((part, index) => {
      if (!part) {
        return false;
      }

      // avoid duplicate flat part when full address already contains it
      if (index === 1 && fullAddress.includes(part)) {
        return false;
      }

      return true;
    })
    .join(', ');

  return {
    id,
    street,
    house,
    flat,
    fullAddress: composedAddress || fullAddress,
  };
};

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as T;
};

const pickArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const preferredKeys = [
    'results',
    'data',
    'items',
    'meters',
    'areas',
    'objects',
  ];

  for (const key of preferredKeys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  if (record.response && typeof record.response === 'object') {
    const nested = pickArray(record.response);
    if (nested.length > 0) {
      return nested;
    }
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
};

const pickTotal = (payload: unknown): number | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const candidates = [record.count, record.total, record.total_count];

  for (const candidate of candidates) {
    if (typeof candidate === 'number') {
      return candidate;
    }
  }

  if (record.response && typeof record.response === 'object') {
    return pickTotal(record.response);
  }

  return null;
};

export const fetchMeters = async (
  limit: number,
  offset: number,
): Promise<{ items: MeterItem[]; total: number | null }> => {
  const url = `${API_BASE}/meters/?limit=${limit}&offset=${offset}`;
  const payload = await requestJson<MeterResponse | unknown[]>(url);
  const itemsRaw = pickArray(payload);

  const items = itemsRaw.map(normalizeMeter).filter((item) => item.id.length > 0);
  const total = pickTotal(payload);

  return { items, total: total ?? null };
};

export const fetchAreasByIds = async (ids: string[]): Promise<AreaItem[]> => {
  if (ids.length === 0) {
    return [];
  }

  const uniqueIds = [...new Set(ids)];

  const responses = await Promise.all(
    uniqueIds.map((id) =>
      requestJson<AreaResponse | unknown[]>(
        `${API_BASE}/areas/?id__in=${encodeURIComponent(id)}`,
      ),
    ),
  );

  const areaMap = new Map<string, AreaItem>();

  responses.forEach((payload) => {
    pickArray(payload)
      .map(normalizeArea)
      .filter((item): item is AreaItem => item !== null)
      .forEach((area) => {
        areaMap.set(area.id, area);
      });
  });

  return [...areaMap.values()];
};

export const deleteMeterRequest = async (meterId: string): Promise<void> => {
  const url = `${API_BASE}/meters/${meterId}/`;

  const response = await fetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
};
