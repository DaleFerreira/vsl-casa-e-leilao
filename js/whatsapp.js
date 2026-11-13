/* Margem para pequenos saltos durante a reprodução realmente assistida. */
const PORCENTAGEM_WHATSAPP = 0.9;

(function () {
  'use strict';
  const botao = document.querySelector('.d5-whats');
  const video = document.getElementById('video');
  if (!botao || !video) return;
  const barra = document.querySelector('.d4-mcta');
  let quadro = 0;
  let entrada = 0;

  function posicionar() {
    quadro = 0;
    const fechamento = document.documentElement.classList.contains('d5-fechamento-na-tela');
    const altura = barra && barra.classList.contains('d4-on') && !fechamento ? barra.getBoundingClientRect().height : 0;
    const base = parseFloat(getComputedStyle(botao).bottom) || 16;
    /* Mantém o fundo a altura da barra + 12px usando apenas transform na transição. */
    const deslocamento = altura > 0 ? Math.min(0, base - altura - 12) : 0;
    botao.style.setProperty('--d5-deslocamento', deslocamento + 'px');
  }
  function agendar() {
    if (!quadro) quadro = requestAnimationFrame(posicionar);
  }
  function mostrar() {
    if (!botao.hidden) return;
    botao.hidden = false;
    posicionar();
    /* Dois quadros garantem o estado inicial após remover hidden. */
    entrada = requestAnimationFrame(() => {
      entrada = requestAnimationFrame(() => {
        entrada = 0;
        botao.classList.add('d5-visivel');
      });
    });
    try { localStorage.setItem('cl_whatsapp_liberado', '1'); }
    catch (e) { /* A liberação continua nesta visita sem armazenamento. */ }
    document.dispatchEvent(new CustomEvent('vsl:whatsapp'));
  }
  function resetar() {
    cancelAnimationFrame(entrada);
    entrada = 0;
    botao.hidden = true;
    botao.classList.remove('d5-visivel');
    try { localStorage.removeItem('cl_whatsapp_liberado'); }
    catch (e) { /* Mantém o botão oculto nesta visita. */ }
  }
  window.whatsappDebug = { mostrar, resetar, visivel: () => !botao.hidden };

  video.addEventListener('ended', () => {
    const duracao = video.duration;
    const assistido = window.vslDebug && typeof window.vslDebug.assistido === 'function'
      ? window.vslDebug.assistido() : 0;
    if (Number.isFinite(duracao) && duracao > 0 &&
        Number.isFinite(assistido) && assistido >= duracao * PORCENTAGEM_WHATSAPP) mostrar();
  });
  /* Ajuste do lead (13/11/2026): com o botão de compra do fechamento ou o rodapé na tela, a barra fixa da
     dobra 4 sai de cena para não mostrar dois botões de compra ao mesmo tempo nem cobrir o rodapé. */
  const fechamento = document.querySelector('.d5-acao');
  const rodape = document.querySelector('.d5-rodape');
  if ('IntersectionObserver' in window && (fechamento || rodape)) {
    const naTela = new Set();
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => { if (e.isIntersecting) naTela.add(e.target); else naTela.delete(e.target); });
      document.documentElement.classList.toggle('d5-fechamento-na-tela', naTela.size > 0);
      agendar();
    });
    [fechamento, rodape].forEach((el) => { if (el) observador.observe(el); });
  }
  if (barra) {
    new MutationObserver(agendar).observe(barra, { attributes: true, attributeFilter: ['class'] });
    if ('ResizeObserver' in window) new ResizeObserver(agendar).observe(barra);
  }
  window.addEventListener('resize', agendar);
  window.addEventListener('pageshow', agendar);
  document.addEventListener('vsl:liberado', agendar);

  const parametros = new URLSearchParams(location.search);
  if (parametros.get('resetar') === '1') resetar();
  else {
    let salvo = false;
    try { salvo = localStorage.getItem('cl_whatsapp_liberado') === '1'; }
    catch (e) { /* Usa apenas a liberação desta visita. */ }
    if (salvo || parametros.get('whatsapp') === '1') mostrar();
  }
})();
