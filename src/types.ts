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

export interface MeterResponse {
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

export interface AreaResponse {
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