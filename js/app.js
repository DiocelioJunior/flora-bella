(() => {
  'use strict';

  const config = window.FLORA_CONFIG || {};
  const flores = Array.isArray(window.FLORA_PRODUTOS) ? window.FLORA_PRODUTOS : [];
  const porId = new Map(flores.map(f => [Number(f.id), f]));
  const $ = (seletor) => document.querySelector(seletor);
  const escapar = (valor) => String(valor ?? '').replace(/[&<>"']/g, letra => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[letra]));
  const iconesGoogle = {"bag": "shopping_bag", "search": "search", "menu": "menu", "close": "close", "arrow": "arrow_forward", "heart": "favorite", "whatsapp": "chat", "gift": "redeem", "flower": "local_florist", "sparkles": "auto_awesome", "truck": "local_shipping", "message": "chat", "plus": "add", "minus": "remove", "trash": "delete", "check": "check", "instagram": "photo_camera"};
  const icone = (nome) => `<span class="material-symbols-outlined" aria-hidden="true">${iconesGoogle[nome] || "local_florist"}</span>`;
  const telefone = String(config.whatsapp || '').replace(/\D/g, '');
  const telefoneValido = /^\d{10,15}$/.test(telefone);
  const nomeMarca = String(config.marca || 'Flora Bella');
  const estado = {aba:'destaques', categoria:'Todas', anterior:null, avisoTimer:null};

  function foto(f, largura=700) {
    const ref = String(f.foto || '');
    if (/^photo-[0-9]+-[a-zA-Z0-9]+$/.test(ref))
      return `https://images.unsplash.com/${ref}?auto=format&fit=crop&w=${largura}&q=82`;
    if (/^(assets\/|\.\/)/.test(ref)) return ref;
    return 'assets/imagens/rosa.jpg';
  }
  function imagem(f, largura=700, classe='') {
    return `<img src="${escapar(foto(f,largura))}" alt="${escapar(f.nome)}" loading="lazy" ${classe ? `class="${classe}"` : ''} onerror="this.onerror=null;this.src='assets/imagens/rosa.jpg'">`;
  }
  function normalizar(valor) {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  }
  function mensagem(f) {
    if (f) return `Olá! Conheci a ${nomeMarca} pelo site e gostei da inspiração “${f.nome}”. Gostaria de saber sobre as opções disponíveis e como funciona o atendimento.`;
    return `Olá! Encontrei a ${nomeMarca} pelo site e gostaria de conhecer os buquês, arranjos e opções de atendimento.`;
  }

  // Canais e identidade visual configuráveis em js/configuracao.js.
  $('#avisoTop').textContent = config.aviso || 'DEMONSTRAÇÃO · SITE DE APRESENTAÇÃO';
  $('#ano').textContent = new Date().getFullYear();
  $('#horarioLoja').textContent = config.horario || 'Atendimento mediante consulta';
  const instagram = $('#linkInstagram');
  if (/^https:\/\/(www\.)?instagram\.com\//i.test(config.instagram || '')) {
    instagram.href = config.instagram;
    instagram.hidden = false;
  }
  for (const [chave, variavel] of [['rosa','--rosa'],['verde','--verde']]) {
    const valor = config.cores?.[chave];
    if (typeof valor === 'string' && /^#[0-9a-f]{6}$/i.test(valor))
      document.documentElement.style.setProperty(variavel, valor);
  }

  function card(f) {
    return `<article class="product-card">
      <div class="product-image">
        ${imagem(f)}
        <button class="image-cover-button" data-produto="${f.id}" aria-label="Conhecer ${escapar(f.nome)}"></button>
        ${f.selo ? `<span class="product-badge">${escapar(f.selo)}</span>` : ''}
        <div class="product-hover"><button data-produto="${f.id}">${icone('search')} Conhecer detalhes</button></div>
      </div>
      <div class="product-info">
        <span class="product-type">${escapar(f.categoria)}</span>
        <button class="product-title" data-produto="${f.id}">${escapar(f.nome)}</button>
        <p class="botanical-name"><i>${escapar(f.cientifico)}</i></p>
        <p class="product-desc">${escapar(f.descricao)}</p>
        <button class="consultar-item" data-consultar="${f.id}">Consultar opções ${icone('arrow')}</button>
      </div>
    </article>`;
  }
  function renderCatalogo() {
    const filtrados = flores.filter(f =>
      (estado.aba === 'todos' || (f.grupos || []).includes(estado.aba)) &&
      (estado.categoria === 'Todas' || f.categoria === estado.categoria)
    );
    $('#gradeProdutos').innerHTML = filtrados.length
      ? filtrados.map(card).join('')
      : `<div class="empty-state">${icone('flower')}<h3>Não encontramos flores nessa seleção.</h3><p>Experimente outra categoria.</p><button class="btn btn-outline" id="limparFiltros">Ver coleção completa ${icone('arrow')}</button></div>`;
    $('#verColecao').innerHTML = (estado.aba === 'todos' ? 'Voltar aos destaques' : 'Conhecer toda a coleção') + ' ' + icone('arrow');
    document.querySelectorAll('.tab').forEach(botao => {
      const ativo = botao.dataset.aba === estado.aba;
      botao.classList.toggle('ativo', ativo);
      botao.setAttribute('aria-pressed', String(ativo));
    });
    $('#filtroCategoria').value = estado.categoria;
  }
  $('#gradeFavoritos').innerHTML = [3,1,5,4].map(id=>porId.get(id)).filter(Boolean).map(card).join('');
  $('#filtroCategoria').addEventListener('change', e => {estado.categoria=e.target.value;renderCatalogo();});
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {estado.aba=b.dataset.aba;renderCatalogo();}));
  $('#verColecao').addEventListener('click', () => {estado.aba=estado.aba==='todos'?'destaques':'todos';renderCatalogo();});
  $('#gradeProdutos').addEventListener('click', e => {
    if (!e.target.closest('#limparFiltros')) return;
    estado.aba='todos';estado.categoria='Todas';renderCatalogo();
  });
  renderCatalogo();

  // Foto e descrição ampliadas, sem preço, carrinho ou checkout.
  const detalhes = $('#modalProduto');
  let focoAnterior = null;
  function abrirDetalhes(id) {
    const f=porId.get(Number(id)); if(!f) return;
    focoAnterior=document.activeElement;
    $('#conteudoDetalhe').innerHTML = `<div class="detail-grid">
      ${imagem(f,1100,'detail-photo')}
      <div class="detail-copy">
        <span class="eyebrow">${escapar(f.categoria.toUpperCase())} · FLORA BELLA</span>
        <h2 id="detalheTitulo">${escapar(f.nome)}</h2>
        <p><i>${escapar(f.cientifico)}</i> · Família ${escapar(f.familia)}</p>
        <p>${escapar(f.detalhes || f.descricao)}</p>
        <p class="photo-credit">Fotografia: ${escapar(f.credito)} · <a href="${escapar(f.licencaUrl)}" target="_blank" rel="noopener noreferrer">${escapar(f.licenca)}</a><br>Identificação na fonte: ${escapar(f.identificacaoFoto)}<br><a href="${escapar(f.fonte)}" target="_blank" rel="noopener noreferrer">Fonte botânica e fotografia: NC State Extension</a></p>
        <p class="detail-warning">${icone('flower')} Imagem ilustrativa. ${escapar(config.entrega || 'Consulte as opções disponíveis.')}</p>
        <div class="detail-cta">
          <button class="btn btn-primary" data-consultar="${f.id}">${icone('whatsapp')} Consultar pelo WhatsApp</button>
        </div>
      </div>
    </div>`;
    detalhes.showModal();
  }
  $('#fecharProduto').addEventListener('click',()=>detalhes.close());
  detalhes.addEventListener('click',e=>{if(e.target===detalhes)detalhes.close();});
  detalhes.addEventListener('close',()=>{focoAnterior?.focus?.();});

  // Busca por nomes, tipos e descrições.
  function fecharBusca(){$('#buscaGlobal').hidden=true;$('#abrirBusca').setAttribute('aria-expanded','false');}
  function fecharMenu(){$('#navegacao').classList.remove('aberto');$('#abrirMenu').setAttribute('aria-expanded','false');}
  function renderBusca() {
    const q=normalizar($('#buscaTopo').value.trim());
    const resultados = flores.filter(f => normalizar(f.nome+' '+f.cientifico+' '+f.familia+' '+f.descricao+' '+f.categoria).includes(q)).slice(0,8);
    $('#resultadosBusca').innerHTML = resultados.length
      ? resultados.map(f => `<button class="search-entry" data-produto="${f.id}">${imagem(f,90)}<span><b>${escapar(f.nome)}</b><small>${escapar(f.categoria)} · ver detalhes</small></span></button>`).join('')
      : '<p>Nenhum resultado. Tente outro termo ou explore o catálogo.</p>';
  }
  $('#abrirBusca').addEventListener('click',()=>{
    const abrir=$('#buscaGlobal').hidden;
    fecharMenu();
    $('#buscaGlobal').hidden=!abrir;
    $('#abrirBusca').setAttribute('aria-expanded',String(abrir));
    if(abrir){renderBusca();$('#buscaTopo').focus();}
  });
  $('#fecharBusca').addEventListener('click',fecharBusca);
  $('#buscaTopo').addEventListener('input',renderBusca);
  $('#abrirMenu').addEventListener('click',()=>{
    const abriu=$('#navegacao').classList.toggle('aberto');
    $('#abrirMenu').setAttribute('aria-expanded',String(abriu));
    if(abriu)fecharBusca();
  });
  $('#navegacao').addEventListener('click',e=>{if(e.target.closest('a'))fecharMenu();});
  document.querySelectorAll('a[data-categoria]').forEach(a=>a.addEventListener('click',()=>{
    estado.categoria=a.dataset.categoria;estado.aba='todos';renderCatalogo();
  }));

  // No modo demonstração, exibe uma mensagem para copiar em vez de contatar número inventado.
  const modalMensagem = $('#modalMensagem');
  let focoMensagem=null;
  function contato(texto) {
    if (!telefoneValido) {
      focoMensagem=document.activeElement;
      $('#textoMensagem').value=texto;
      if(!modalMensagem.open)modalMensagem.showModal();
      return;
    }
    const url=`https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`;
    const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';
    document.body.appendChild(link);link.click();link.remove();
  }
  function consultar(id) {
    const f=porId.get(Number(id));if(!f)return;
    if(detalhes.open)detalhes.close();
    contato(mensagem(f));
  }
  document.addEventListener('click',e=>{
    const bConsult=e.target.closest('[data-consultar]');
    if(bConsult){consultar(bConsult.dataset.consultar);return;}
    const bDetalhe=e.target.closest('[data-produto]');
    if(bDetalhe){fecharBusca();abrirDetalhes(bDetalhe.dataset.produto);return;}
    const bContato=e.target.closest('[data-falar]');
    if(bContato)contato(mensagem());
  });
  $('#fecharMensagem').addEventListener('click',()=>modalMensagem.close());
  $('#fecharPrevia').addEventListener('click',()=>modalMensagem.close());
  modalMensagem.addEventListener('click',e=>{if(e.target===modalMensagem)modalMensagem.close();});
  modalMensagem.addEventListener('close',()=>focoMensagem?.focus?.());
  $('#copiarMensagem').addEventListener('click',async()=>{
    const texto=$('#textoMensagem').value;
    try {
      if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(texto);
      else {$('#textoMensagem').focus();$('#textoMensagem').select();if(!document.execCommand('copy'))throw Error('Cópia indisponível');}
      mostrarAviso('Mensagem copiada!');
    } catch {
      $('#textoMensagem').focus();$('#textoMensagem').select();mostrarAviso('Use Ctrl+C para copiar o texto.');
    }
  });
  function mostrarAviso(msg) {
    const el=$('#toast');el.textContent=msg;el.classList.add('visivel');
    clearTimeout(estado.avisoTimer);
    estado.avisoTimer=setTimeout(()=>el.classList.remove('visivel'),2900);
  }
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){fecharBusca();fecharMenu();}
  });
  console.info('Flora Bella institucional: galeria, busca, detalhes e consulta disponíveis. Configure WhatsApp em js/configuracao.js.');
})();
