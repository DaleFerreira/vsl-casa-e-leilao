/* URL original do checkout: altere aqui para trocar o destino da compra. */
const CHECKOUT_URL = 'https://pay.hotmart.com/P96710671A?sck=bio-casa&bid=1794537915126';
/* Somente estas chaves da página podem ser repassadas ao checkout. */
const PARAMETROS_REPASSADOS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck', 'xcod'];

(function () {
  'use strict';
  const links = document.querySelectorAll('.js-checkout');
  function atualizarLink(link) {
    const destino = new URL(CHECKOUT_URL);
    const parametros = new URLSearchParams(window.location.search);
    PARAMETROS_REPASSADOS.forEach(chave => {
      const valor = parametros.get(chave);
      if (valor !== null && valor.trim() !== '') destino.searchParams.set(chave, valor);
    });
    link.href = destino.href;
  }
  links.forEach(link => {
    atualizarLink(link);
    link.addEventListener('click', () => atualizarLink(link));
  });
  window.checkoutDebug = { url: () => document.getElementById('cta-checkout').href };

  const restante = document.getElementById('restante');
  const oferta = document.getElementById('oferta');
  const barra = document.querySelector('.d4-mcta');
  if (!restante || !oferta || !barra) return;
  const botao = barra.querySelector('.js-checkout');
  const celular = window.matchMedia('(max-width: 767px)');
  let quadro = 0;

  /* Base do observador de gravyx/index.html, linhas 1164 a 1172.
     A barra só liga quando o cartão inteiro já passou acima da tela. */
  function sincronizar() {
    quadro = 0;
    const limite = oferta.getBoundingClientRect();
    const ligada = !restante.hidden && celular.matches && limite.height > 0 && limite.bottom <= 0;
    barra.classList.toggle('d4-on', ligada);
    barra.setAttribute('aria-hidden', ligada ? 'false' : 'true');
    barra.inert = !ligada;
    if (ligada) botao.removeAttribute('tabindex');
    else botao.setAttribute('tabindex', '-1');
    restante.style.setProperty('--d4-altura-barra', barra.getBoundingClientRect().height + 'px');
    restante.classList.toggle('d4-barra-visivel', ligada);
  }
  function agendar() {
    if (!quadro) quadro = requestAnimationFrame(sincronizar);
  }
  if ('IntersectionObserver' in window) {
    const observador = new IntersectionObserver(agendar, { threshold: 0 });
    observador.observe(oferta);
  }
  if ('ResizeObserver' in window) {
    const tamanho = new ResizeObserver(agendar);
    tamanho.observe(barra);
    tamanho.observe(oferta);
  }
  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar);
  window.addEventListener('pageshow', agendar);
  celular.addEventListener('change', agendar);
  document.addEventListener('vsl:liberado', agendar);
  sincronizar();
})();
