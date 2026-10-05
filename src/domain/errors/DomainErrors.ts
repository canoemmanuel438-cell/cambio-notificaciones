export class DomainError extends Error {
  constructor(message: string, name: string) {
    super(message);
    this.name = name;
  }
}

export class RangoFechasInvalidoError extends DomainError {
  constructor() {
    super(
      "El rango de fechas no es válido: la fecha inicial debe ser anterior a la final.",
      "RangoFechasInvalidoError",
    );
  }
}

export class CriteriosBusquedaVaciosError extends DomainError {
  constructor() {
    super("Captura al menos un filtro para buscar.", "CriteriosBusquedaVaciosError");
  }
}

export class TransaccionNoEncontradaError extends DomainError {
  constructor(public readonly id: string) {
    super(`No se encontró la transacción ${id}.`, "TransaccionNoEncontradaError");
  }
}

export class IndicadorNoEncontradoError extends DomainError {
  constructor(public readonly clave: string) {
    super(`No se reconoce el indicador "${clave}".`, "IndicadorNoEncontradoError");
  }
}

export class AlertaNoEncontradaError extends DomainError {
  constructor(public readonly id: string) {
    super(`No se encontró la alerta ${id}.`, "AlertaNoEncontradaError");
  }
}

export class TransicionAlertaInvalidaError extends DomainError {
  constructor(
    public readonly desde: string,
    public readonly hacia: string,
  ) {
    super(
      `No es posible cambiar la alerta de ${desde} a ${hacia}.`,
      "TransicionAlertaInvalidaError",
    );
  }
}

export class PermisoDenegadoError extends DomainError {
  constructor(public readonly accion: string) {
    super(`Tu rol no tiene permiso para ${accion}.`, "PermisoDenegadoError");
  }
}

export class RolInvalidoError extends DomainError {
  constructor(public readonly rol: string) {
    super(`El rol ${rol} no existe.`, "RolInvalidoError");
  }
}

export class SinDatosParaExportarError extends DomainError {
  constructor() {
    super("No hay registros para exportar.", "SinDatosParaExportarError");
  }
}

export class OrigenDatosNoDisponibleError extends DomainError {
  constructor() {
    super("El origen de datos no está disponible en este momento.", "OrigenDatosNoDisponibleError");
  }
}

export class ParametroNoEncontradoError extends DomainError {
  constructor(public readonly clave: string) {
    super(`No se encontró el parámetro ${clave}.`, "ParametroNoEncontradoError");
  }
}

export class ValorParametroInvalidoError extends DomainError {
  constructor(minimo: number, maximo: number) {
    super(`El valor debe estar entre ${minimo} y ${maximo}.`, "ValorParametroInvalidoError");
  }
}
