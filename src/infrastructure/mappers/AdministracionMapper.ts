import type {
  CanalLayout,
  Layout,
  ModeloSemantico,
  PosturaSeguridad,
} from "@/domain/entities/Administracion";
import type {
  LayoutRaw,
  MODELO_SEMANTICO_RAW,
  POSTURA_SEGURIDAD_RAW,
} from "@/infrastructure/mock/data/administracion";

const CANALES: CanalLayout[] = ["POS", "ATM", "POS y ATM"];

export const AdministracionMapper = {
  layout(raw: LayoutRaw): Layout {
    return {
      id: raw.layout_id,
      nombre: raw.nombre,
      fuente: raw.fuente,
      canal: CANALES.find((c) => c === raw.canal) ?? "POS",
      version: raw.version,
      campos: raw.campos,
      fiids: raw.fiids.split(",").filter(Boolean),
      activo: raw.estatus === "A",
      ultimaModificacion: raw.modificado,
    };
  },
  modelo(raw: typeof MODELO_SEMANTICO_RAW): ModeloSemantico {
    return {
      conexion: {
        estado: raw.conexion.conectada ? "CONECTADA" : "DESCONECTADA",
        destino: raw.conexion.destino,
      },
      views: raw.views,
      explores: raw.explores,
      vistasMaterializadas: raw.materializadas,
      ultimaActualizacion: raw.actualizado,
      metricas: raw.metricas.map(([nombre, clave, definicion, tipo, view, uso]) => ({
        nombre,
        clave,
        definicion,
        tipo,
        view,
        seUsaEn: uso.split(", "),
      })),
    };
  },
  postura(raw: typeof POSTURA_SEGURIDAD_RAW): PosturaSeguridad {
    return {
      autenticacion: {
        proveedor: raw.autenticacion[0] ?? "",
        protocolo: raw.autenticacion[1] ?? "",
      },
      controles: raw.controles.map(([control, descripcion, capa]) => ({
        control,
        descripcion,
        capa,
        activo: true,
      })),
      ambientes: raw.ambientes.map(([ambiente, datos, acceso, proyecto]) => ({
        ambiente,
        datos,
        acceso,
        proyecto,
      })),
    };
  },
};
