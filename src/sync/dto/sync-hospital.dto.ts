export class SyncHospitalDto {
  id: number;
  nombre: string;
  nit: string | null;
  departamento: string;
  ciudad: string;
  direccion: string;
  telefono: string | null;
  activo: boolean;
}