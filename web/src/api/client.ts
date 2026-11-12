import type { BootstrapPayload, CalibrationSuiteDTO, CardioActivityDTO, TrendPayload, WorkoutDTO } from './types';

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers || {}),
    },
  });
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try {
      const errData = await resp.json();
      if (errData?.error) msg = errData.error;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return resp.json() as Promise<T>;
}

export const api = {
  getBootstrap(date?: string): Promise<BootstrapPayload> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return jsonFetch<BootstrapPayload>(`/api/v1/bootstrap${qs}`);
  },

  getTrend(metric: string, horizon: string): Promise<TrendPayload> {
    const qs = `?metric=${encodeURIComponent(metric)}&horizon=${encodeURIComponent(horizon)}`;
    return jsonFetch<TrendPayload>(`/api/v1/trends${qs}`);
  },

  logWorkout(payload: Omit<WorkoutDTO, 'source'>): Promise<{ workout: WorkoutDTO }> {
    return jsonFetch<{ workout: WorkoutDTO }>('/api/v1/workouts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  syncWorkoutsBatch(workouts: Array<Omit<WorkoutDTO, 'source'>>): Promise<{ synced: number; workout_ids: string[] }> {
    return jsonFetch<{ synced: number; workout_ids: string[] }>('/api/v1/workouts/sync', {
      method: 'POST',
      body: JSON.stringify({ workouts }),
    });
  },

  logBody(weightLb: number, bodyFatPct?: number, localDate?: string): Promise<unknown> {
    return jsonFetch('/api/v1/body', {
      method: 'POST',
      body: JSON.stringify({
        weight_lb: weightLb,
        body_fat_pct: bodyFatPct || 0,
        local_date: localDate || '',
      }),
    });
  },

  saveCalibration(ghReadiness: number, ghSleep: number, ghCardio: number, localDate?: string): Promise<{ calibration: CalibrationSuiteDTO }> {
    return jsonFetch<{ calibration: CalibrationSuiteDTO }>('/api/v1/calibrations', {
      method: 'POST',
      body: JSON.stringify({
        local_date: localDate || '',
        gh_readiness: ghReadiness,
        gh_sleep_score: ghSleep,
        gh_cardio_load: ghCardio,
      }),
    });
  },

  importXLSXFile(file: File): Promise<{ summary: Record<string, unknown> }> {
    const fd = new FormData();
    fd.append('file', file);
    return jsonFetch('/api/v1/import/xlsx', { method: 'POST', body: fd });
  },

  importXLSXUrl(sheetUrl: string): Promise<{ summary: Record<string, unknown> }> {
    return jsonFetch('/api/v1/import/xlsx', {
      method: 'POST',
      body: JSON.stringify({ sheet_url: sheetUrl }),
    });
  },

  importFITFile(file: File, title?: string): Promise<{ activity: CardioActivityDTO }> {
    const fd = new FormData();
    fd.append('file', file);
    if (title) fd.append('title', title);
    return jsonFetch('/api/v1/import/fit', { method: 'POST', body: fd });
  },

  generateSampleFIT(): Promise<{ activity: CardioActivityDTO }> {
    return jsonFetch('/api/v1/import/fit', {
      method: 'POST',
      body: JSON.stringify({ generate_sample: true, title: 'Garmin Threshold Progression (.FIT)' }),
    });
  },

  getSampleSHLink(): Promise<{ shlink: string }> {
    return jsonFetch('/api/v1/import/medical/sample-shlink');
  },

  importMedical(body: {
    shlink?: string;
    fhir_json?: unknown;
    biomarker?: string;
    value?: number;
    unit?: string;
    local_date?: string;
  }): Promise<{ panels_imported: number; observations_imported: number }> {
    return jsonFetch('/api/v1/import/medical', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  seedDemo(): Promise<unknown> {
    return jsonFetch('/api/v1/demo/seed', { method: 'POST', body: '{}' });
  },

  triggerSync(): Promise<unknown> {
    return jsonFetch('/api/v1/integrations/sync', { method: 'POST', body: '{}' });
  },
};
