# Manutenção do perfil

O README é uma composição de peças locais. O texto fica em `content.json`, a identidade em `profile.css` e as fontes em `fonts/`, com suas licenças SIL OFL. O Broto canônico veio do Portfólio, em `public/broto/projetos.webp`.

## Atualizar

1. Instalar as dependências de desenvolvimento: `npm ci`.
2. Preparar o Chromium: `npx playwright install chromium`. Para usar um navegador existente, definir `PROFILE_BROWSER_PATH` com o caminho do executável.
3. Editar `design/content.json` e, quando necessário, `design/profile.css`.
4. Executar `npm run assets` para gerar as peças, o README e o catálogo de dimensões.
5. Executar `npm run preview` para conferir a composição em desktop, tablet e celular.
6. Conferir o diff e a página pública depois da publicação.

O gerador usa Plus Jakarta Sans nos títulos e Inter no corpo. As fontes são incorporadas à aparência das imagens, sem depender de fontes instaladas no computador do visitante. Há versões de 900 e 360 px, renderizadas em densidade 2×; o elemento `picture` seleciona a versão móvel até 1011 px de viewport. O limite acompanha a coluna estreita do perfil real do GitHub em tablet. Para alterar somente os links ou o limite de seleção usando as peças existentes, executar `npm run assets -- --readme-only`.

Cada card abre sua aplicação. O botão de código é um link independente. Os contatos também são links independentes, e uma seção expansível preserva o conteúdo selecionável, traduzível e pesquisável. Textos alternativos descrevem cada peça visual.

A pasta `work/` contém apenas prévias locais ignoradas pelo Git. Os assets anteriores continuam preservados no repositório e no histórico. Esta escolha tipográfica pertence ao README; não define um novo padrão global no Obsidian.
