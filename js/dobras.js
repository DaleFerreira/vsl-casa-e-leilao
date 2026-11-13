/* Contagem adaptada de problema-custo-de-esperar.html, linhas 186 a 214.
   Mantém lerp, frame, glide, easeInOut e a ativação por IntersectionObserver. */
(function () {
  'use strict';
  const restante = document.getElementById('restante');
  if (!restante) return;
  const movimento = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nf = new Intl.NumberFormat('pt-BR');
  const contadores = Array.from(restante.querySelectorAll('[data-d2-contar]'));
  const animacoes = new Set();
  let iniciado = false;
  let observer;

  function finalizarNumeros() {
    animacoes.forEach(cancelAnimationFrame);
    animacoes.clear();
    contadores.forEach(el => { el.textContent = nf.format(Number(el.dataset.d2Contar)); });
  }
  function lerp(a, b, e) {
    return a.map((v, i) => v + (b[i] - v) * e);
  }
  function glide(elementos) {
    const from = elementos.map(() => 0);
    const to = elementos.map(el => Number(el.dataset.d2Contar));
    const t0 = performance.now();
    let raf = 0;
    function frame(t) {
      animacoes.delete(raf);
      const p = movimento.matches ? 1 : Math.min(1, (t - t0) / 1100);
      const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const shown = lerp(from, to, e);
      elementos.forEach((el, i) => { el.textContent = nf.format(Math.round(shown[i])); });
      if (p < 1) { raf = requestAnimationFrame(frame); animacoes.add(raf); }
    }
    raf = requestAnimationFrame(frame);
    animacoes.add(raf);
  }
  function iniciar() {
    if (iniciado || restante.hidden) return;
    iniciado = true;
    const itens = restante.querySelectorAll('.d2-revelar');
    if (movimento.matches || !('IntersectionObserver' in window)) {
      itens.forEach(el => el.classList.add('d2-revelado'));
      finalizarNumeros();
      return;
    }
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('d2-revelado');
        const numeros = Array.from(el.querySelectorAll('[data-d2-contar]'));
        if (numeros.length) glide(numeros);
        observer.unobserve(el);
      });
    }, { threshold: .12 });
    itens.forEach(el => observer.observe(el));
    document.documentElement.classList.add('d2-js');
  }
  movimento.addEventListener('change', () => {
    if (!movimento.matches) return;
    if (observer) observer.disconnect();
    restante.querySelectorAll('.d2-revelar').forEach(el => el.classList.add('d2-revelado'));
    finalizarNumeros();
  });
  document.addEventListener('vsl:liberado', iniciar);
  iniciar();
})();
