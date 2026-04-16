export type PageToken = number | 'ellipsis';

export interface MeterTypeView {
  label: string;
  tone: 'hot' | 'cold' | 'neutral';
}

export const typeView: Record<string, MeterTypeView> = {
  HotWaterAreaMeter: { label: 'ГВС', tone: 'hot' },
  ColdWaterAreaMeter: { label: 'ХВС', tone: 'cold' },
};

export const formatDate = (value: string): string => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU').format(date);
};

export const buildPageTokens = (
  current: number,
  total: number
): PageToken[] => {
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
