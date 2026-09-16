# Cyberpunk

Watchface cyberpunk para o **Amazfit Active 2 Square**, com molduras HUD, detalhes laranja/ciano e quatro dígitos centrais no estilo sete segmentos.

## Dados dinâmicos

- hora e minuto, atualizados pelo sensor de tempo;
- data e dia da semana;
- bateria, passos, distância, calorias e duração do sono;
- temperatura máxima prevista para hoje, quando o Zepp OS disponibilizar a previsão sincronizada;
- os cinco medidores (4 barras de progresso e o ícone de bateria);
- o ícone de condição do tempo.

## Medidores e ícone de clima

Na arte original todos os medidores eram decorativos: o ícone de bateria vinha com 3 das 4 barrinhas acesas e cada barra de progresso com 1 a 4 tracinhos laranja fixos, independentemente dos dados. A lua também era parte do PNG e nunca mudava.

Hoje a arte de fundo chega com **todos os tracinhos apagados** e sem a lua. Por cima entram seis widgets de imagem:

- cinco tiras `gauge-*.png`, cada uma com a fileira inteira acesa, recortadas pela largura do widget. Como `IMG` delimita a exibição ao tamanho do widget em vez de redimensionar o recurso, ajustar `w` acende exatamente os N primeiros tracinhos, com apenas um widget por medidor em vez de um por segmento;
- um `weather-*.png` trocado conforme a condição sincronizada.

As metas de passos e calorias vêm do próprio relógio (`Step.getTarget()` e `Calorie.getTarget()`). A API não expõe meta de distância nem de sono, então esses dois usam alvos fixos declarados no topo de `src/index.js`: 5 km e 8 h. A conta trunca em vez de arredondar: um tracinho só acende depois de conquistado, então o medidor só aparece cheio ao bater a meta. Arredondando, o ícone de bateria — que tem apenas 4 slots — já ficava cheio com 88%. Qualquer progresso acima de zero ainda acende ao menos um tracinho, para o medidor não ficar vazio com um valor já diferente de zero no campo ao lado.

O clima usa o índice de condição do Zepp OS (0 a 28) agrupado em nove ícones — sol, lua, nublado, nublado à noite, chuva, chuva forte, tempestade, neve e névoa/poeira. O índice `25` é `Unknown` e fica de fora de propósito: sem condição conhecida nenhum ícone aparece, em vez de afirmar um tempo que não foi informado. O ícone noturno é recortado da lua desenhada na arte original, então mantém o traço exato do desenho; os demais são gerados no mesmo tamanho (37×39 px) e na mesma cor.

A imagem `background-functional-soft.png` contém o painel e seus elementos gráficos, com os segmentos inativos da hora quase pretos e sem os contornos laranja ao redor dos quatro dígitos. A hora usa a fonte DS-Digital Bold em quatro células de largura fixa sobre a imagem, com espaçamento reduzido e equilibrado em torno dos dois-pontos; o dígito `1` é alinhado à direita dentro da célula e os demais ficam centralizados, mantendo a coluna visual consistente sem sobreposição. A fonte DS-Digital é usada apenas na hora, onde o Zepp OS a renderiza corretamente; os valores menores usam a fonte nativa, que permanece legível e íntegra no relógio. O dia da semana usa Audiowide. Passos e calorias são alinhados à esquerda em `x = 176`, reproduzindo o mockup: as duas linhas compartilham a mesma borda esquerda, e o campo cresce para a direita conforme ganha dígitos. Distância e sono continuam ancorados à direita, porque esbarram em elementos fixos da arte — o `KM` estático começa em `x = 335` e a borda do painel de sono logo depois de `x = 362`. A fonte shareware e seu aviso original de licença estão incluídos em `assets/fonts/DS-DIGIB.TTF` e `assets/fonts/DIGITAL.TXT`; confira as condições do autor antes de redistribuir comercialmente. Os corpos de fonte foram fixados a partir da largura real da fonte nativa, medida no próprio aparelho com `getTextLayout`, sempre no pior valor de cada campo: `100%` = 68 px, `-10°C` = 70 px, `31/12` = 75 px, `99999` = 65 px, `9999` = 52 px, `12,34` = 62 px e `12h59min` = 80 px. Passos e sono são os campos que limitam o conjunto — acima de 23 e 18 respectivamente eles não cabem no painel — e por isso não acompanham o corpo 29 dos demais. O mockup parece maior porque foi desenhado com uma fonte bem mais condensada que a do relógio; igualar o tamanho dele cortaria valores reais.

Os campos de texto não rolam quando um valor ultrapassa sua largura.

`Sleep` só é recalculado pelo sistema a cada 30 minutos, então `refreshSleep` chama `updateInfo()` antes de `getInfo()` para forçar a leitura. Quando não há sono registrado no período, o sensor responde com um objeto de `totalTime` e `score` zerados — confirmado no relógio real; nesse caso `0h00min` é o valor correto, e não um sintoma de falha.

Sem leitura disponível, os contadores mostram zero — `0%`, `0`, `0,00`, `0h00min` — porque zero é o estado vazio real deles: no começo do dia os passos são mesmo zero. A temperatura é a exceção e mostra `--°`: `0°` é uma temperatura plausível, e exibi-la sem previsão sincronizada faria alguém ler "está congelando" onde na verdade não há dado.

Formatos dos valores, seguindo o mockup `design/background-pixel-perfect.png`: distância em quilômetros com duas casas e vírgula (`3,66`), a partir do valor em metros do sensor; sono como `7h30min`; bateria como `90%`; temperatura como `24°C`, ou `°F` quando o relógio estiver configurado em Fahrenheit.

## Estrutura

`assets/` contém apenas o que é empacotado para o relógio; as artes de origem ficam em `design/` para não subirem no pacote.

- `src/index.js`: widgets, sensores e atualização dos dados;
- `assets/active-2-square/background-functional-soft.png`: arte de uso, com os segmentos apagados escurecidos, os contornos laranja removidos, os medidores zerados e a lua apagada;
- `assets/active-2-square/gauge-*.png`: as cinco tiras de medidor com a fileira inteira acesa;
- `assets/active-2-square/weather-*.png`: os nove ícones de condição do tempo;
- `assets/active-2-square/icon.png`: ícone do pacote;
- `assets/fonts/DS-DIGIB.TTF`: variante Bold da DS-Digital usada nos quatro dígitos do relógio; aviso original em `assets/fonts/DIGITAL.TXT`;
- `assets/fonts/Audiowide-Regular.ttf`: fonte das abreviações de texto dinâmicas; licença OFL em `assets/fonts/OFL.txt`;
- `assets/preview_en.png`: imagem de preview em 266×307 px, com o horário `10:09` exigido pela diretriz de design;
- `design/background-pixel-perfect.png`: mockup com todos os valores cravados; é a referência de layout a ser reproduzida em runtime;
- `design/background-functional.png`: arte-base original em 390×450 px, entrada do script de recoloração;
- `design/digits/`: sprites de dígitos da arte original; a hora em runtime é renderizada pela fonte DS-Digital, não por sprites;
- `design/background.png`, `design/background.svg`, `design/reference-*.png`, `design/preview*.svg`: artes anteriores e masters em alta resolução, mantidos apenas como histórico;
- `tools/build-assets.js`: gera toda a arte empacotada a partir da arte original.

Um comando regenera o fundo, as cinco tiras de medidor e os nove ícones de clima:

```sh
node tools/build-assets.js design/background-functional.png assets/active-2-square
```

O script escurece os segmentos inativos da hora, recorta a lua para o ícone noturno, apaga os tracinhos que vinham acesos, exporta as tiras `gauge-*.png`, remove a lua do fundo e desenha os demais ícones.

Ele é um arquivo único, com o codec PNG embutido e sem dependências, de propósito: o `zeus` trata **qualquer** `.js` do projeto como entrada de build e falha ao resolver `require` relativo entre scripts, mesmo fora de `src/`. Dividir este script em módulos quebra `zeus build`.

## Build e validação

Na pasta desta watchface, execute `zeus build -t active-2-square` seguido de `zeus prune --ip`, que remove os produtos intermediários e reduz o `.zab` gerado em `dist/`. Teste no simulador do Zeus e depois no Active 2 Square real. O clima depende da sincronização do app Zepp; os demais dados usam os sensores locais do relógio.

Tudo que não tem `onChange` é relido no tique de minuto. `Weather` e `Sleep` porque a API não oferece evento — sem isso a temperatura ficaria travada em `--°` quando a sincronização do app Zepp termina depois que o mostrador já carregou. A data entra junto porque `onPerDay` dispara apenas no instante da virada: se o relógio perder esse instante, com a tela apagada ou o mostrador recarregado, a data fica parada o dia inteiro. Reler por minuto custa três `setProperty` e conserta sozinho no minuto seguinte.

Ainda é necessário verificar o preview final no Watchface Maker (266×306 ou 266×307 px) e preparar uma variante AOD separada conforme os limites de consumo do dispositivo.
