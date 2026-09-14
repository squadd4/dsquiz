# Auditoria dos assets

Todos os slides (`png/`, `jpeg/`, `preview/` e `novas imagens/`) têm 3840×2160 e proporção 16:9. A pasta `preview/` é a referência visual; nenhum ficheiro original foi alterado. Os novos JPG dos Slides 3, 4 e 10 são as bases limpas usadas pela aplicação, enquanto os controlos e as legendas ficam em PNGs independentes.

## Associação aos ecrãs

| Asset | Função na experiência |
| --- | --- |
| `Slide 4k - 1` | Abertura “Entre em Modo Silêncio”. |
| `Slide 4k - 2` | Introdução com quatro fontes de ruído. |
| `novas imagens/Slide 4k - 3.jpg` | Fundo/poster limpo do primeiro vídeo, sem botões incorporados. |
| `novas imagens/Slide 4k - 4.jpg` | Fundo/poster limpo do segundo vídeo, sem botões incorporados. |
| `Slide 4k - 5` | Mensagem “Há sons que não podemos mudar”. Base do microfone temporizado solicitado. |
| `Slide 4k - 6` | Interior DS; fundo/poster do vídeo integrado. |
| `Slide 4k - 7` | Mensagem institucional; conduz diretamente ao formulário sem questionário adicional. |
| `Slide 4k - 8` | Agradecimento e regresso ao início. |
| `Slide 4k - 9` | Referência do estado “Ativar modo silêncio”; usada para posicionar o microfone temporizado, mas não é um passo separado no fluxo prescrito. |
| `novas imagens/Slide 4k - 10.jpg` | Headphones e contornos limpos do formulário final. |

## Controlos separados

| Ficheiro PNG | Dimensões | Utilização |
| --- | ---: | --- |
| `Button.png` | 853×205 | Iniciar. |
| `Button-1.png` | 853×205 | Escutar. |
| `Button-2.png` | 517×124 | Seguinte. |
| `Button-3.png` | 853×205 | Voltar ao início. |
| `novas imagens/Button.png` | 507×108 | Marcar Test-Drive. |
| `novas imagens/Button-1.png` | 446×108 | Submeter. |
| `novas imagens/button on.png` | 388×388 | Microfone branco “Mudar o som”. |
| `novas imagens/button on-1.png` | 657×657 | Microfone verde com brilho integrado. |
| `button off-1.png` | 388×388 | Microfone “Ativar modo silêncio”. |
| `novas imagens/Nome & Apelido.png` | 333×46 | Legenda gráfica do campo de nome. |
| `novas imagens/Email.png` | 115×36 | Legenda gráfica do campo de email. |
| `novas imagens/Telefone.png` | 185×36 | Legenda gráfica do campo de telefone. |
| `novas imagens/Código Postal.png` | 292×48 | Legenda gráfica do código postal. |

Os JPEGs com estes mesmos nomes são equivalentes sem transparência e não são usados como controlos, porque produziriam fundos retangulares visíveis.

## Assets derivados

`icons/icon-192.png` e `icons/icon-512.png` são redimensionamentos determinísticos de `png/button off-1.png` para cumprir os tamanhos de ícone PWA. O original permanece intacto.
