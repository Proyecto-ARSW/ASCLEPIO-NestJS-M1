import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TriageAudioInput,
  TriageComment,
  TriageProcedure,
  TriagePreliminaryHistory,
  TriageVitalSigns,
  TriageVitalSignsInput,
} from './triage.types';

interface IsisTriageIntakeResponse {
  procedure_id: string;
  patient_id: string;
  transcript: string;
  input_type: string;
  preliminary_history: TriagePreliminaryHistory;
  confidence_score: number;
  status: string;
}

interface IsisProcedureResponse {
  procedure_id: string;
  patient_cedula: string;
  transcript: string;
  input_type: string;
  triage_data: TriagePreliminaryHistory;
  confidence_score: number;
  status: string;
  vital_signs?: Record<string, number>;
  comments?: Array<{
    id: string;
    author: string;
    comment: string;
    created_at: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

type IsisProcedureListResponse = IsisProcedureResponse[];

type IsisErrorPayload = {
  detail?: unknown;
  message?: unknown;
};

@Injectable()
export class TriageService {
  constructor(private readonly config: ConfigService) {}

  private asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private formatArrayErrorDetail(detail: unknown[]): string | null {
    const flattened = detail
      .map((item) => this.formatErrorDetail(item))
      .filter((item): item is string => Boolean(item));
    return flattened.length > 0 ? flattened.join('; ') : null;
  }

  private formatObjectErrorDetail(
    detail: Record<string, unknown>,
  ): string | null {
    const msg = this.asNonEmptyString(detail.msg);
    if (msg) return msg;

    const message = this.asNonEmptyString(detail.message);
    if (message) return message;

    if (Array.isArray(detail.loc) && detail.loc.length > 0) {
      const where = detail.loc.map(String).join('.');
      return `${where}: ${msg ?? 'Error de validacion'}`;
    }

    try {
      return JSON.stringify(detail);
    } catch {
      return null;
    }
  }

  private formatErrorDetail(detail: unknown): string | null {
    const text = this.asNonEmptyString(detail);
    if (text) return text;

    if (Array.isArray(detail)) {
      return this.formatArrayErrorDetail(detail);
    }

    if (detail && typeof detail === 'object') {
      return this.formatObjectErrorDetail(detail as Record<string, unknown>);
    }

    return null;
  }

  private get isisVoiceBaseUrl(): string {
    return (
      this.config.get<string>('ISISVOICE_BASE_URL') ?? 'http://localhost:8000'
    ).replace(/\/$/, '');
  }

  private getBearerToken(authorizationHeader?: string): string {
    if (!authorizationHeader) {
      throw new BadGatewayException(
        'Falta encabezado Authorization para consumir ISISvoice',
      );
    }
    return authorizationHeader;
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    authorizationHeader?: string,
  ): Promise<T> {
    const token = this.getBearerToken(authorizationHeader);
    const outgoingHeaders = {
      ...(init.headers as Record<string, string> | undefined),
      Authorization: token,
    };

    const response = await fetch(`${this.isisVoiceBaseUrl}${path}`, {
      ...init,
      headers: outgoingHeaders,
    });

    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try {
        const payload = (await response.json()) as IsisErrorPayload;
        const parsedDetail = this.formatErrorDetail(
          payload.detail ?? payload.message,
        );
        if (parsedDetail) {
          detail = parsedDetail;
        }
      } catch {
        // Response body is not JSON — use the raw status text as detail
      }
      throw new BadGatewayException(`ISISvoice error: ${detail}`);
    }

    return (await response.json()) as T;
  }

  private mapVitalSigns(
    raw?: Record<string, number>,
  ): TriageVitalSigns | undefined {
    if (!raw) return undefined;
    return {
      temperatureC: raw.temperature_c,
      heartRateBpm: raw.heart_rate_bpm,
      respiratoryRateBpm: raw.respiratory_rate_bpm,
      systolicBpMmhg: raw.systolic_bp_mmhg,
      diastolicBpMmhg: raw.diastolic_bp_mmhg,
      oxygenSaturationPct: raw.oxygen_saturation_pct,
      weightKg: raw.weight_kg,
      heightCm: raw.height_cm,
    };
  }

  private mapProcedure(payload: IsisProcedureResponse): TriageProcedure {
    return {
      procedureId: payload.procedure_id,
      patientId: payload.patient_cedula,
      transcript: payload.transcript,
      inputType: payload.input_type,
      preliminaryHistory: payload.triage_data,
      confidenceScore: payload.confidence_score,
      status: payload.status,
      vitalSigns: this.mapVitalSigns(payload.vital_signs),
      comments: (payload.comments ?? []).map(
        (item): TriageComment => ({
          id: item.id,
          author: item.author,
          comment: item.comment,
          createdAt: item.created_at,
        }),
      ),
      createdAt: payload.created_at,
      updatedAt: payload.updated_at,
    };
  }

  async createFromText(
    textInput: string,
    authorizationHeader?: string,
  ): Promise<TriageProcedure> {
    const payload = await this.request<IsisTriageIntakeResponse>(
      '/api/v1/triage/symptoms/text',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_input: textInput,
          textInput,
          text: textInput,
          transcript: textInput,
        }),
      },
      authorizationHeader,
    );

    return {
      procedureId: payload.procedure_id,
      patientId: payload.patient_id,
      transcript: payload.transcript,
      inputType: payload.input_type,
      preliminaryHistory: payload.preliminary_history,
      confidenceScore: payload.confidence_score,
      status: payload.status,
    };
  }

  async createFromAudio(
    input: TriageAudioInput,
    authorizationHeader?: string,
  ): Promise<TriageProcedure> {
    let payload: IsisTriageIntakeResponse;

    try {
      payload = await this.request<IsisTriageIntakeResponse>(
        '/api/v1/triage/symptoms/audio/base64',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_base64: input.audioBase64,
            audioBase64: input.audioBase64,
            file_name: input.fileName,
            fileName: input.fileName,
            mime_type: input.mimeType,
            mimeType: input.mimeType,
          }),
        },
        authorizationHeader,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : '';
      const shouldFallback =
        detail.includes('Field required') || detail.includes('422');
      if (!shouldFallback) {
        throw error;
      }

      const audioBytes = Buffer.from(input.audioBase64, 'base64');
      const formData = new FormData();
      const audioBlob = new Blob([audioBytes], {
        type: input.mimeType ?? 'audio/webm',
      });
      formData.append('audio_file', audioBlob, input.fileName);

      payload = await this.request<IsisTriageIntakeResponse>(
        '/api/v1/triage/symptoms/audio',
        {
          method: 'POST',
          body: formData,
        },
        authorizationHeader,
      );
    }

    return {
      procedureId: payload.procedure_id,
      patientId: payload.patient_id,
      transcript: payload.transcript,
      inputType: payload.input_type,
      preliminaryHistory: payload.preliminary_history,
      confidenceScore: payload.confidence_score,
      status: payload.status,
    };
  }

  async getMyProcedures(
    limit: number,
    authorizationHeader?: string,
  ): Promise<TriageProcedure[]> {
    const payload = await this.request<IsisProcedureListResponse>(
      `/api/v1/triage/procedures/me?limit=${encodeURIComponent(limit)}`,
      { method: 'GET' },
      authorizationHeader,
    );

    return payload.map((item) => this.mapProcedure(item));
  }

  async getPreliminaryHistory(
    procedureId: string,
    authorizationHeader?: string,
  ): Promise<TriagePreliminaryHistory> {
    return this.request<TriagePreliminaryHistory>(
      `/api/v1/triage/record/${procedureId}/preliminary-history`,
      { method: 'GET' },
      authorizationHeader,
    );
  }

  async getProcedure(
    procedureId: string,
    authorizationHeader?: string,
  ): Promise<TriageProcedure> {
    const payload = await this.request<IsisProcedureResponse>(
      `/api/v1/triage/procedure/${procedureId}`,
      { method: 'GET' },
      authorizationHeader,
    );
    return this.mapProcedure(payload);
  }

  async updateVitalSigns(
    procedureId: string,
    input: TriageVitalSignsInput,
    authorizationHeader?: string,
  ): Promise<TriageProcedure> {
    const payload = await this.request<IsisProcedureResponse>(
      `/api/v1/triage/record/${procedureId}/vital-signs`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature_c: input.temperatureC,
          heart_rate_bpm: input.heartRateBpm,
          respiratory_rate_bpm: input.respiratoryRateBpm,
          systolic_bp_mmhg: input.systolicBpMmhg,
          diastolic_bp_mmhg: input.diastolicBpMmhg,
          oxygen_saturation_pct: input.oxygenSaturationPct,
          weight_kg: input.weightKg,
          height_cm: input.heightCm,
        }),
      },
      authorizationHeader,
    );
    return this.mapProcedure(payload);
  }

  async addComment(
    procedureId: string,
    comment: string,
    authorizationHeader?: string,
  ): Promise<TriageProcedure> {
    const payload = await this.request<IsisProcedureResponse>(
      `/api/v1/triage/record/${procedureId}/comment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      },
      authorizationHeader,
    );
    return this.mapProcedure(payload);
  }
}
