# Tarefas futuras

## feature/active-navigation

- [ ] Indicar no menu a seção atualmente visível na página.

**Status:** planejada para implementação futura. Não implementar agora.

**Objetivo:** destacar o link correspondente à seção atual durante a rolagem. Por exemplo, ao visualizar Experiência, destacar “Experiência” no menu com um sublinhado.

**Prática de JavaScript:**

- Eventos de `scroll` e posição dos elementos.
- Manipulação de classes e do DOM.
- Controle do estado da navegação.
- Avaliar `IntersectionObserver` como alternativa para detectar a seção visível.

**Critérios de conclusão:**

- O destaque acompanha a seção visível ao rolar a página ou clicar nos links do menu.
- Apenas um link fica ativo por vez.
- O link ativo usa `aria-current="location"`; os demais não possuem esse atributo.
- O comportamento funciona no desktop e no menu móvel, preservando a navegação por âncoras.

**Branch sugerida:** `feature/active-navigation`.
