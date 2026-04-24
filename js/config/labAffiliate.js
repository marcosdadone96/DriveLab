/**
 * Enlaces de compra orientativos (Amazon u otros).
 *
 * Amazon Associates (EU): necesita cuenta aprobada, etiqueta ?tag= y texto de
 * divulgacion visible cerca de los enlaces. Revise el acuerdo vigente en afiliados.amazon.es
 *
 * Si amazonAssociateTag esta vacio, los enlaces siguen siendo busquedas en Amazon
 * sin comision; igualmente conviene ser transparente con el usuario.
 */
export const LAB_AFFILIATE = Object.freeze({
  /** Mostrar bloque "Opciones de compra" y enlaces Amazon en Smart Dashboard. */
  enabled: true,

  /**
   * ID de seguimiento Amazon Associates (ej. misitio-21).
   * Vacio: sin parametro tag (sin comision de afiliado).
   */
  amazonAssociateTag: '',

  /** Dominio de la tienda (amazon.es, amazon.com, amazon.de, ...). */
  amazonDomain: 'amazon.es',
});
