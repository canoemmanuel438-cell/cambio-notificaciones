/**
 * Result pattern: domain y application nunca lanzan errores genéricos.
 */
export type Ok<T> = { success: true; data: T };
export type Fail<E extends Error> = { success: false; error: E };

export type Result<T, E extends Error = Error> = Ok<T> | Fail<E>;

export const ok = <T>(data: T): Ok<T> => ({ success: true, data });

export const fail = <E extends Error>(error: E): Fail<E> => ({ success: false, error });

export const isOk = <T, E extends Error>(result: Result<T, E>): result is Ok<T> => result.success;

export const isFail = <T, E extends Error>(result: Result<T, E>): result is Fail<E> =>
  !result.success;
